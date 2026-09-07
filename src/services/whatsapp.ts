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
import { broadcastSseEvent } from './sse';

// Helper para emitir cambios de estado por SSE en tiempo real
export const notifyStatusChange = (key: string) => {
    const state = getWhatsAppState(key);
    try {
        broadcastSseEvent(key, 'whatsapp_status', {
            status: state.status,
            qr: state.qr,
            phone: state.phone
        });
    } catch {}
};

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
export const qrTimeoutsMap = new Map<string, NodeJS.Timeout>();

export const clearQRTimeout = (key: string) => {
    if (qrTimeoutsMap.has(key)) {
        clearTimeout(qrTimeoutsMap.get(key)!);
        qrTimeoutsMap.delete(key);
    }
};

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
export const initializeWhatsAppClient = (tenantId: string = 'admin', options: { isAutoRestore?: boolean } = {}): Client => {
    const key = tenantId || 'admin';
    const isAutoRestore = options.isAutoRestore ?? false;
    
    // Si ya existe una instancia para esta tienda, la devolvemos
    let existingClient = whatsappClientsMap.get(key);
    if (existingClient) {
        client = existingClient;
        return existingClient;
    }

    console.log(`[WhatsApp Multi-Tenant] 🚀 Instanciando cliente Puppeteer independiente para tienda: ${key} (Auto-Restore: ${isAutoRestore})`);
    const state = getWhatsAppState(key);

    const newClient = new Client({
        authStrategy: new LocalAuth({
            clientId: key,
            dataPath: path.join(process.cwd(), '.wwebjs_auth')
        }),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        webVersionCache: {
            type: 'local'
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
    newClient.on('qr', async (qr) => {
        // Si estamos en proceso de auto-restauración al arrancar el servidor y solicita QR, 
        // significa que la sesión guardada caducó o requiere re-escaneo.
        // ABORTAMOS la auto-restauración inmediatamente para no dejar un bucle de QR sin usuario.
        if (isAutoRestore) {
            (newClient as any)._isAutoRestoreAborted = true;
            console.warn(`[WhatsApp Multi-Tenant] ⚠️ La sesión restaurada para tienda '${key}' requiere un nuevo código QR. Abortando auto-restauración en segundo plano.`);
            state.status = 'DISCONNECTED';
            state.qr = '';
            state.phone = '';
            notifyStatusChange(key);

            logger.raiseAlert(
                'whatsapp_session_expired',
                'red',
                `La sesión de WhatsApp para ${key} ha expirado o se ha desconectado.`,
                'Es necesario escanear un nuevo código QR desde la plataforma para restablecer el canal.',
                key
            );

            clearQRTimeout(key);
            setTimeout(async () => {
                try {
                    await newClient.destroy();
                } catch (dErr) {
                    // Ignorar errores de destruccion de cliente abortado
                } finally {
                    whatsappClientsMap.delete(key);
                    if (key === 'admin' || client === newClient) client = null;
                }
            }, 200);
            return;
        }

        const isFirstQR = state.status !== 'QR';
        state.status = 'QR';
        state.qr = qr;
        state.phone = '';
        notifyStatusChange(key);

        if (isFirstQR) {
            console.log(`\n[WhatsApp Multi-Tenant] 📱 CÓDIGO QR GENERADO PARA TIENDA: ${key} (Escaneable en Dashboard o consola)`);
            qrcode.generate(qr, { small: true });

            // Iniciar temporizador de 1 minuto (60.000 ms) para destruir Puppeteer si no es escaneado
            clearQRTimeout(key);
            const timer = setTimeout(async () => {
                console.log(`\n[WhatsApp Multi-Tenant] ⏱️ Tiempo de espera del Código QR (1 minuto) agotado para tienda: ${key}. Destruyendo sesión Puppeteer...`);
                state.status = 'DISCONNECTED';
                state.qr = '';
                state.phone = '';
                notifyStatusChange(key);

                logger.raiseAlert(
                    'whatsapp_session_expired',
                    'red',
                    `El código QR de WhatsApp para ${key} expiró sin ser escaneado (1 min agotado).`,
                    'Presiona "Generar QR" nuevamente para intentar otra vinculación.',
                    key
                );

                const currentClient = whatsappClientsMap.get(key);
                if (currentClient) {
                    try {
                        await currentClient.destroy();
                    } catch (err) {
                        console.warn(`[WhatsApp - ${key}] Warning destruyendo cliente por tiempo agotado de QR:`, err);
                    } finally {
                        whatsappClientsMap.delete(key);
                        if (key === 'admin' || client === currentClient) client = null;
                    }
                }
                clearQRTimeout(key);
            }, 60000);
            qrTimeoutsMap.set(key, timer);
        } else {
            console.log(`[WhatsApp Multi-Tenant] 🔄 Código QR actualizado para tienda: ${key} (esperando escaneo...)`);
        }
    });

    // Evento: Fallo de autenticación
    newClient.on('auth_failure', async (msg) => {
        console.error(`[WhatsApp Multi-Tenant] ❌ Fallo de autenticación en sesión de ${key}:`, msg);
        state.status = 'DISCONNECTED';
        state.qr = '';
        state.phone = '';
        notifyStatusChange(key);
        clearQRTimeout(key);
        logger.raiseAlert('whatsapp_session_expired', 'red', `Fallo de autenticación en WhatsApp para ${key}.`, msg, key);
        try {
            await newClient.destroy();
        } catch {}
        whatsappClientsMap.delete(key);
        if (key === 'admin' || client === newClient) client = null;
    });

    // Evento: Autenticación exitosa
    newClient.on('ready', async () => {
        console.log(`[WhatsApp Multi-Tenant] ✅ Cliente ${key} conectado y listo.`);
        clearQRTimeout(key);
        
        const connectedPhone = newClient.info?.wid?.user || '';
        state.status = 'CONNECTED';
        state.qr = '';
        state.phone = connectedPhone;
        state.clientId = key;
        notifyStatusChange(key);

        logger.resolveAlert('whatsapp_disconnected', `El bot de WhatsApp (${key}) se vinculó correctamente al +${connectedPhone}.`, key);
        logger.resolveAlert('whatsapp_session_expired', `El bot de WhatsApp (${key}) se vinculó correctamente al +${connectedPhone}.`, key);

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

                const delayMs = Math.floor(Math.random() * 1500) + 1000;
                await new Promise(resolve => setTimeout(resolve, delayMs));

                try {
                    // 1. Intentar enviar directamente a la JID de origen (sea @c.us o @lid)
                    await newClient.sendMessage(msg.from, responseText);
                    console.log(`[WhatsApp - ${key}] ✅ Respuesta enviada exitosamente a ${msg.from}`);
                } catch (replyErr: any) {
                    console.warn(`[WhatsApp - ${key}] Warning enviando a ${msg.from}, reintentando por senderPhone:`, replyErr?.message);
                    try {
                        const target = senderPhone.includes('@c.us') ? senderPhone : `${senderPhone}@c.us`;
                        await newClient.sendMessage(target, responseText);
                        console.log(`[WhatsApp - ${key}] ✅ Respuesta enviada exitosamente a ${target}`);
                    } catch (fallbackErr: any) {
                        console.error(`[WhatsApp - ${key}] ❌ Error enviando respuesta a ${senderPhone}:`, fallbackErr?.message);
                    }
                }
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
        notifyStatusChange(key);
        clearQRTimeout(key);

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

// Conectar WhatsApp (Bajo demanda o auto-restauración)
export const connectWhatsApp = async (clientId?: string, options: { isAutoRestore?: boolean } = {}) => {
    const key = clientId || 'admin';
    const state = getWhatsAppState(key);

    if (state.status === 'CONNECTED' || state.status === 'QR' || state.status === 'INITIALIZING') {
        console.log(`[WhatsApp Multi-Tenant] Cliente ${key} ya se encuentra en estado ${state.status}. Ignorando solicitud duplicada.`);
        return;
    }

    state.status = 'INITIALIZING';
    state.qr = '';
    state.phone = '';
    notifyStatusChange(key);
    clearQRTimeout(key);
    if (options.isAutoRestore) {
        console.log(`[WhatsApp Multi-Tenant] 🔄 Intentando restauración en segundo plano de sesión guardada para tienda: ${key}...`);
    } else {
        console.log(`[WhatsApp Multi-Tenant] 🚀 Inicializando conexión A PETICIÓN EXPLÍCITA del usuario para tienda: ${key}...`);
    }

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

    const activeClient = initializeWhatsAppClient(key, { isAutoRestore: options.isAutoRestore });

    try {
        await activeClient.initialize();
    } catch (err: any) {
        if ((activeClient as any)._isAutoRestoreAborted) {
            console.log(`[WhatsApp Multi-Tenant] Auto-restauración finalizada limpiamente para ${key} (sesión expirada).`);
            return;
        }

        console.error(`[WhatsApp Multi-Tenant] ❌ Error al inicializar Puppeteer para ${key}:`, err?.message || err);
        state.status = 'DISCONNECTED';
        notifyStatusChange(key);
        clearQRTimeout(key);
        whatsappClientsMap.delete(key);
        logger.raiseAlert('whatsapp_initialization_error', 'red', `Fallo al arrancar cliente Puppeteer para ${key}.`, err?.message || String(err), key);
    }
};

// Cerrar sesión de una tienda específica
export const logoutWhatsApp = async (clientId?: string) => {
    const key = clientId || 'admin';
    console.log(`[WhatsApp Multi-Tenant] Cerrando sesión a petición para tienda: ${key}...`);
    clearQRTimeout(key);
    
    const state = getWhatsAppState(key);
    state.status = 'DISCONNECTED';
    state.qr = '';
    state.phone = '';
    notifyStatusChange(key);

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

let autoRestoreExecuted = false;

// Autorestaurar sesiones de WhatsApp previamente vinculadas y guardadas en disco (Sin pedir QR nuevo)
export const autoRestoreSavedWhatsAppSessions = async () => {
    if (autoRestoreExecuted) return;
    autoRestoreExecuted = true;

    const authDir = path.join(process.cwd(), '.wwebjs_auth');
    console.log(`[WhatsApp Multi-Tenant] 🔍 Verificando sesiones guardadas en disco en: ${authDir}`);
    if (!fs.existsSync(authDir)) return;

    try {
        const entries = fs.readdirSync(authDir);
        const restoredTenants = new Set<string>();

        // 1. Restaurar primero las sesiones nombradas por tenant (session-<tenantId>)
        for (const entry of entries) {
            if (entry.startsWith('session-')) {
                const tenantId = entry.replace('session-', '');
                if (tenantId && !restoredTenants.has(tenantId)) {
                    restoredTenants.add(tenantId);
                    console.log(`[WhatsApp Multi-Tenant] 🔄 Restaurando sesión guardada para tienda: ${tenantId}...`);
                    await connectWhatsApp(tenantId, { isAutoRestore: true }).catch(err => {
                        console.warn(`[WhatsApp Multi-Tenant] Error al restaurar sesión de ${tenantId}:`, err.message);
                    });
                }
            }
        }

        // 2. Si existe carpeta legacy 'session' y 'admin' no ha sido procesado aún
        if (entries.includes('session') && !restoredTenants.has('admin')) {
            restoredTenants.add('admin');
            console.log(`[WhatsApp Multi-Tenant] 🔄 Restaurando sesión guardada legacy para tienda: admin...`);
            await connectWhatsApp('admin', { isAutoRestore: true }).catch(err => {
                console.warn(`[WhatsApp Multi-Tenant] Error al restaurar sesión legacy admin:`, err.message);
            });
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