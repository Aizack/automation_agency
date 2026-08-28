import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { routeIncomingMessage } from '../core/router';
import { saveLocalFile } from './localKnowledge';
import { getClientById, updateClient } from '../database/clientsCrud';
import { fetchDocumentsFromDrive, uploadFileToFolder } from './drive';
import { pool } from '../database/postgres';
import { logger } from './logger';
import { uploadTenantFile } from './storageService';

// Estructura de estado de WhatsApp por Tienda / Tenant
export interface TenantWhatsAppState {
    status: 'DISCONNECTED' | 'INITIALIZING' | 'QR' | 'CONNECTED';
    qr: string;
    phone: string;
    clientId: string;
}

// Mapas en memoria Multi-Tenant (Aislamiento Total por tienda/clientId)
export const whatsappClientsMap = new Map<string, Client>();
export const whatsappStatesMap = new Map<string, TenantWhatsAppState>();

// Estructura de sesión de carga de archivos temporal
interface WhatsAppSession {
    clientId: string;
    expiresAt: number; // timestamp en ms
}

export const activeWaSessions = new Map<string, WhatsAppSession>();
const startupTime = Math.floor(Date.now() / 1000);

// Obtener o crear estado de WhatsApp de una tienda específica
export const getWhatsAppState = (tenantId: string = 'admin'): TenantWhatsAppState => {
    const key = tenantId || 'admin';
    if (!whatsappStatesMap.has(key)) {
        whatsappStatesMap.set(key, {
            status: 'DISCONNECTED',
            qr: '',
            phone: '',
            clientId: key
        });
    }
    return whatsappStatesMap.get(key)!;
};

// Export para compatibilidad hacia atrás
export const whatsappState = new Proxy({} as TenantWhatsAppState, {
    get: (_, prop: keyof TenantWhatsAppState) => {
        const state = getWhatsAppState('admin');
        return state[prop];
    }
});

// Proxy para obtener el cliente por defecto (admin) si es necesario
export let client: Client | null = null;

// Inicializa una instancia limpia e aislada de Puppeteer/WhatsApp para una tienda específica
export const initializeWhatsAppClient = (tenantId: string = 'admin'): Client => {
    const key = tenantId || 'admin';
    
    // Si ya existe una instancia para esta tienda, la devolvemos
    let existingClient = whatsappClientsMap.get(key);
    if (existingClient) {
        client = existingClient;
        return existingClient;
    }

    console.log(`[WhatsApp Multi-Tenant] 🚀 Instanciando cliente Puppeteer independiente para tienda: ${key}`);
    const state = getWhatsAppState(key);

    const newClient = new Client({
        authStrategy: new LocalAuth({
            clientId: key,
            dataPath: path.join(process.cwd(), '.wwebjs_auth')
        }),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1043584437-alpha.html'
        },
        puppeteer: {
            headless: true,
            handleSIGINT: false,
            handleSIGTERM: false,
            handleSIGHUP: false,
            protocolTimeout: 300000,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--disable-extensions'
            ]
        }
    });

    // Guardar en el pool de clientes
    whatsappClientsMap.set(key, newClient);
    if (key === 'admin') client = newClient;

    // Evento: Generación del código QR único para esta tienda
    newClient.on('qr', (qr) => {
        console.log(`\n[WhatsApp Multi-Tenant] 📱 CÓDIGO QR GENERADO PARA TIENDA: ${key}`);
        qrcode.generate(qr, { small: true });
        
        state.status = 'QR';
        state.qr = qr;
        state.phone = '';
    });

    // Evento: Autenticación exitosa
    newClient.on('ready', async () => {
        console.log(`[WhatsApp Multi-Tenant] ✅ Cliente ${key} conectado y listo.`);
        
        const connectedPhone = newClient.info?.wid?.user || '';
        state.status = 'CONNECTED';
        state.qr = '';
        state.phone = connectedPhone;
        state.clientId = key;

        logger.resolveAlert('whatsapp_disconnected', `El bot de WhatsApp (${key}) se vinculó correctamente al +${connectedPhone}.`, key);

        try {
            const clientData = await getClientById(key);
            if (clientData) {
                await updateClient(key, { phone_number: connectedPhone });
                console.log(`[WhatsApp Multi-Tenant] ✅ BD actualizada: phone_number = ${connectedPhone} para cliente ${key}`);

                const ownerPhone = clientData.ownerPhone || clientData.phoneNumber;
                if (ownerPhone) {
                    const target = ownerPhone.includes('@c.us') ? ownerPhone : `${ownerPhone}@c.us`;
                    await newClient.sendMessage(target, `🎉 ¡Tu bot de WhatsApp ya está vinculado y activo para tu tienda (+${connectedPhone})!`);
                }
            }
        } catch (err: any) {
            console.error(`[WhatsApp Multi-Tenant] Error vinculando línea en BD para ${key}:`, err);
        }
    });

    // Evento: Recepción de mensajes para esta tienda
    newClient.on('message', async (msg) => {
        if (msg.from === 'status@broadcast') return;
        if (msg.from.endsWith('@g.us')) return;

        if (!msg.body || !msg.body.trim()) return;
        // Permitir un margen de 5 minutos (300s) para desfasaje de reloj entre servidor y WhatsApp Web
        if (msg.timestamp && msg.timestamp < (startupTime - 300)) return;

        console.log(`[WhatsApp - ${key}] Mensaje recibido de ${msg.from}: ${msg.body}`);
        let senderPhone = msg.from.split('@')[0];
        try {
            const contact = await msg.getContact();
            if (contact && contact.number) {
                senderPhone = contact.number;
            }
        } catch (cErr) {}

        const msgText = msg.body.toLowerCase().trim();

        // --- INTERCEPTOR DE OPT-OUT DE MARKETING ---
        if (msgText === 'salir' || msgText === 'parar' || msgText === 'cancelar suscripcion' || msgText === 'cancelar suscripción') {
            const unsubRes = await pool.query(
                `UPDATE crm_customers 
                 SET marketing_unsubscribed = TRUE 
                 WHERE phone = $1 OR phone = $2
                 RETURNING name`,
                [senderPhone, senderPhone.replace(/^57/, '')]
            );
            if (unsubRes.rows.length > 0) {
                await msg.reply("🔕 Te hemos dado de baja de nuestra lista de difusión.");
                return;
            }
        }

        // --- COMANDO DE CHAT: Cerrar / Extender Sesión ---
        if (msgText === 'cerrar sesion' || msgText === 'cerrar sesión') {
            if (activeWaSessions.has(senderPhone)) {
                activeWaSessions.delete(senderPhone);
                await msg.reply("🔒 Sesión de administración cerrada correctamente.");
            } else {
                await msg.reply("No tienes ninguna sesión de administración activa abierta.");
            }
            return;
        }

        // --- INTERCEPTAR ARCHIVOS & COMPROBANTES DE PAGO ---
        if (msg.hasMedia && msg.type === 'image') {
            try {
                const cleanSender = senderPhone.replace(/[^0-9]/g, '');
                const cleanNoCountry = cleanSender.replace(/^57/, '');

                const pendingInvoiceRes = await pool.query(
                    `SELECT id, invoice_number, customer_name, total_amount, client_id 
                     FROM invoices 
                     WHERE (customer_phone = $1 OR customer_phone = $2 OR customer_phone = $3)
                       AND status = 'pending' AND client_id = $4
                     ORDER BY created_at DESC LIMIT 1`,
                    [cleanSender, cleanNoCountry, `+${cleanSender}`, key]
                );

                if (pendingInvoiceRes.rows.length > 0) {
                    const invoice = pendingInvoiceRes.rows[0];
                    const media = await msg.downloadMedia();
                    if (media) {
                        let ext = '.jpg';
                        if (media.mimetype?.includes('png')) ext = '.png';

                        const fileName = `receipt_${invoice.id}_${Date.now()}${ext}`;
                        const buffer = Buffer.from(media.data, 'base64');

                        const publicReceiptUrl = await uploadTenantFile(
                            key,
                            'receipts',
                            fileName,
                            buffer,
                            media.mimetype || 'image/jpeg'
                        );

                        await pool.query(
                            `UPDATE invoices SET payment_receipt_url = $1, updated_at = NOW() WHERE id = $2`,
                            [publicReceiptUrl, invoice.id]
                        );

                        await msg.reply(
                            `📸 **¡Comprobante de Pago Recibido!**\n\n` +
                            `Hemos asociado tu soporte a la **Factura #${invoice.invoice_number}** por valor de **$${parseFloat(invoice.total_amount).toLocaleString('es-CO')}**.\n\n` +
                            `Nuestro equipo verificará tu pago en breve.`
                        );
                        return;
                    }
                }
            } catch (receiptErr) {
                console.error(`[WhatsApp - ${key}] Error procesando comprobante:`, receiptErr);
            }
        }

        // --- FLUJO CONVERSACIONAL COMÚN (GEMINI RAG) ---
        try {
            const botPhone = newClient.info?.wid?.user || "1234567890";

            const responseText = await routeIncomingMessage(
                botPhone, 
                senderPhone, 
                msg.body,
                async (to, text) => {
                    const target = to.includes('@c.us') ? to : `${to}@c.us`;
                    await newClient.sendMessage(target, text);
                },
                async (to, filePath) => {
                    const target = to.includes('@c.us') ? to : `${to}@c.us`;
                    const media = MessageMedia.fromFilePath(filePath);
                    await newClient.sendMessage(target, media, { sendAudioAsVoice: true });
                },
                key // fallbackTenantId
            );

            if (responseText) {
                try {
                    const chat = await msg.getChat();
                    await chat.sendStateTyping();
                } catch {}

                const delayMs = Math.floor(Math.random() * 2000) + 2000;
                await new Promise(resolve => setTimeout(resolve, delayMs));

                await msg.reply(responseText);
            }
        } catch (error) {
            console.error(`[WhatsApp - ${key}] Error procesando mensaje:`, error);
        }
    });

    // Evento: Desconexión
    newClient.on('disconnected', async (reason) => {
        console.log(`[WhatsApp Multi-Tenant] Cliente ${key} desconectado. Razón:`, reason);
        state.status = 'DISCONNECTED';
        state.qr = '';
        state.phone = '';

        logger.raiseAlert('whatsapp_disconnected', 'red', `El bot de WhatsApp de ${key} se ha desconectado.`, `Razón: ${reason}`, key);

        if (reason === 'LOGOUT') {
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth', `session-${key}`);
            if (fs.existsSync(sessionPath)) {
                try {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                } catch (rmErr) {
                    console.error(`[WhatsApp Multi-Tenant] Error al eliminar sesión local de ${key}:`, rmErr);
                }
            }
        }

        try {
            await newClient.destroy();
        } catch (err) {
            console.error(`[WhatsApp Multi-Tenant] Error destruyendo cliente ${key}:`, err);
        } finally {
            whatsappClientsMap.delete(key);
            if (key === 'admin' || client === newClient) client = null;
        }
    });

    return newClient;
};

// Conectar WhatsApp BAJO DEMANDA para una tienda específica (Sin auto-boot al iniciar servidor)
export const connectWhatsApp = async (clientId?: string) => {
    const key = clientId || 'admin';
    const state = getWhatsAppState(key);

    if (state.status === 'CONNECTED' || state.status === 'QR' || state.status === 'INITIALIZING') {
        console.log(`[WhatsApp Multi-Tenant] Cliente ${key} ya se encuentra en estado ${state.status}. Ignorando solicitud duplicada.`);
        return;
    }

    state.status = 'INITIALIZING';
    state.qr = '';
    state.phone = '';
    console.log(`[WhatsApp Multi-Tenant] Inicializando conexión A PETICIÓN EXPLÍCITA del usuario para tienda: ${key}...`);

    let existingClient = whatsappClientsMap.get(key);
    if (existingClient) {
        try {
            console.log(`[WhatsApp Multi-Tenant] Limpiando cliente previo de ${key}...`);
            await existingClient.destroy();
        } catch (err) {
            console.error(`[WhatsApp Multi-Tenant] Error limpiando cliente de ${key}:`, err);
        }
        whatsappClientsMap.delete(key);
    }

    const activeClient = initializeWhatsAppClient(key);

    try {
        await activeClient.initialize();
    } catch (err: any) {
        console.error(`[WhatsApp Multi-Tenant] ❌ Error al inicializar Puppeteer para ${key}:`, err);
        state.status = 'DISCONNECTED';
        whatsappClientsMap.delete(key);
        logger.raiseAlert('whatsapp_initialization_error', 'red', `Fallo al arrancar cliente Puppeteer para ${key}.`, err?.stack || String(err), key);
    }
};

// Cerrar sesión de una tienda específica
export const logoutWhatsApp = async (clientId?: string) => {
    const key = clientId || 'admin';
    console.log(`[WhatsApp Multi-Tenant] Cerrando sesión a petición para tienda: ${key}...`);
    
    const state = getWhatsAppState(key);
    state.status = 'DISCONNECTED';
    state.qr = '';
    state.phone = '';

    const targetClient = whatsappClientsMap.get(key);
    if (targetClient) {
        whatsappClientsMap.delete(key);
        if (key === 'admin' || client === targetClient) client = null;

        try {
            await targetClient.logout().catch(err => console.warn(`[WhatsApp - ${key}] Warning en logout:`, err?.message));
        } catch {}

        try {
            await targetClient.destroy().catch(err => console.warn(`[WhatsApp - ${key}] Warning en destroy:`, err?.message));
        } catch {}
    }
};

// Autorestaurar sesiones de WhatsApp previamente vinculadas y guardadas en disco (Sin pedir QR nuevo)
export const autoRestoreSavedWhatsAppSessions = async () => {
    const authDir = path.join(process.cwd(), '.wwebjs_auth');
    console.log(`[WhatsApp Multi-Tenant] 🔍 Verificando sesiones guardadas en disco en: ${authDir}`);
    if (!fs.existsSync(authDir)) return;

    try {
        const entries = fs.readdirSync(authDir);
        for (const entry of entries) {
            if (entry.startsWith('session-')) {
                const tenantId = entry.replace('session-', '');
                if (tenantId) {
                    console.log(`[WhatsApp Multi-Tenant] 🔄 Restaurando sesión guardada para tienda: ${tenantId}...`);
                    await connectWhatsApp(tenantId).catch(err => {
                        console.warn(`[WhatsApp Multi-Tenant] Error al restaurar sesión de ${tenantId}:`, err.message);
                    });
                }
            } else if (entry === 'session') {
                console.log(`[WhatsApp Multi-Tenant] 🔄 Restaurando sesión guardada legacy para tienda: admin...`);
                await connectWhatsApp('admin').catch(err => {
                    console.warn(`[WhatsApp Multi-Tenant] Error al restaurar sesión legacy admin:`, err.message);
                });
            }
        }
    } catch (err) {
        console.error("[WhatsApp Multi-Tenant] Error escaneando sesiones guardadas:", err);
    }
};

// Enviar un mensaje proactivo desde el cliente de una tienda específica
export const sendWhatsAppTextMessage = async (phone: string, text: string, clientId: string = 'admin'): Promise<boolean> => {
    try {
        const targetClient = whatsappClientsMap.get(clientId) || client;
        const state = getWhatsAppState(clientId);

        if (!targetClient || state.status !== 'CONNECTED') {
            console.log(`[WhatsApp Sender] No se envió mensaje a +${phone} porque WhatsApp no está conectado para la tienda ${clientId}.`);
            return false;
        }

        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone) return false;

        const target = cleanPhone.endsWith('@c.us') ? cleanPhone : `${cleanPhone}@c.us`;
        await targetClient.sendMessage(target, text);
        console.log(`[WhatsApp Sender - ${clientId}] ✅ Mensaje enviado exitosamente a +${cleanPhone}`);
        return true;
    } catch (err: any) {
        console.error(`[WhatsApp Sender - ${clientId}] ❌ Error enviando mensaje a +${phone}:`, err?.message || err);
        return false;
    }
};