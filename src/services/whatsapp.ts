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

// Estado global de WhatsApp expuesto para el Dashboard
export const whatsappState = {
    status: 'DISCONNECTED', // 'DISCONNECTED', 'QR', 'CONNECTED', 'INITIALIZING'
    qr: '',
    phone: '',
    clientId: 'admin',
};

// Estructura de sesión de carga de archivos temporal
interface WhatsAppSession {
    clientId: string;
    expiresAt: number; // timestamp en ms
}

// Mapa en memoria para almacenar las sesiones activas de WhatsApp (Clave: número de teléfono del remitente)
export const activeWaSessions = new Map<string, WhatsAppSession>();

// Instancia dinámica del cliente de WhatsApp Web
export let client: Client | null = null;
let pendingConnectionClientId: string | null = null;
let isReadyHandled = false;
const startupTime = Math.floor(Date.now() / 1000);

export const initializeWhatsAppClient = (): Client => {
    // Si el cliente ya está instanciado, no creamos duplicados
    if (client) return client;

    console.log("[WhatsApp] Instanciando un nuevo cliente de WhatsApp Web...");
    
    client = new Client({
        authStrategy: new LocalAuth(),
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1043584437-alpha.html'
        },
        puppeteer: {
            headless: true,
            handleSIGINT: false,   // Evita que Puppeteer mate el proceso de Node de golpe en señales de apagado
            handleSIGTERM: false,  // Deja que nuestro Shutdown Manager maneje la destrucción limpia
            handleSIGHUP: false,
            protocolTimeout: 300000, // 5 minutos de espera para evitar caídas en VPS lento
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Evita crashes por falta de memoria compartida /dev/shm en Linux
                '--disable-gpu',           // Evita consumo de CPU en entornos VPS sin GPU
                '--no-first-run',
                '--no-zygote',
                '--disable-extensions'
            ]
        }
    });

    // Evento: Generación del código QR
    client.on('qr', (qr) => {
        console.log('\n==================================================');
        console.log('📱 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP 📱');
        console.log('==================================================\n');
        qrcode.generate(qr, { small: true });
        
        // Actualizar estado global
        whatsappState.status = 'QR';
        whatsappState.qr = qr;
        whatsappState.phone = '';
    });

    // Evento: Autenticación exitosa (Listo)
    client.on('ready', async () => {
        if (!client) return;
        console.log('[WhatsApp] Cliente está listo y conectado correctamente.');
        
        const connectedPhone = client.info.wid.user;
        const targetClientId = pendingConnectionClientId || 'admin';

        // Actualizar estado global
        whatsappState.status = 'CONNECTED';
        whatsappState.qr = '';
        whatsappState.phone = connectedPhone;
        whatsappState.clientId = targetClientId;

        // Evitar reconexiones duplicadas si la sesión ya fue gestionada
        if (isReadyHandled) {
            console.log('[WhatsApp] Ready re-disparado (recarga interna), omitiendo vinculación repetida.');
            return;
        }
        isReadyHandled = true;

        // Resolver la alerta de desconexión si existía
        logger.resolveAlert('whatsapp_disconnected', `El bot de WhatsApp se vinculó correctamente al número +${connectedPhone} y se encuentra en línea.`, targetClientId);

        // Vinculamos la línea conectada en la DB (por defecto al cliente 'admin' si inició por auto-boot)
        try {
            console.log(`[WhatsApp] Vinculando línea conectada (+${connectedPhone}) al cliente ID: ${targetClientId}`);
            
            // 1. Obtener la info del cliente primero
            const clientData = await getClientById(targetClientId);
            if (clientData) {
                // 2. Actualizar el campo phone_number a la línea recién conectada
                await updateClient(targetClientId, {
                    phone_number: connectedPhone
                });
                console.log(`[WhatsApp] ✅ Base de datos actualizada: phone_number = ${connectedPhone} para cliente ${targetClientId}`);

                // 3. Mandar mensaje de confirmación al dueño a su teléfono personal (owner_phone)
                const ownerPhone = clientData.ownerPhone || clientData.phoneNumber; // Fallback
                if (ownerPhone) {
                    const target = ownerPhone.includes('@c.us') ? ownerPhone : `${ownerPhone}@c.us`;
                    await client.sendMessage(target, `🎉 ¡Excelente, tu bot de WhatsApp ya está vinculado y listo para trabajar!\n\nEscribe al número del bot (+${connectedPhone}) para vivir la experiencia y probar su comportamiento.`);
                    console.log(`[WhatsApp] Mensaje de bienvenida enviado al dueño: ${ownerPhone}`);
                }
            }
        } catch (err: any) {
            console.error("[WhatsApp] Error al vincular número de WhatsApp en ready:", err);
        } finally {
            pendingConnectionClientId = null;
        }
    });

    // Evento: Recepción de mensajes
    client.on('message', async (msg) => {
        if (!client) return;
        if (msg.from === 'status@broadcast') return;
        if (msg.from.endsWith('@g.us')) return;

        // Ignorar mensajes con cuerpo vacío o metadatos de sincronización de WhatsApp (Bug de LID)
        if (!msg.body || !msg.body.trim()) {
            console.log(`[WhatsApp] Ignorando mensaje vacío o metadato de ${msg.from}`);
            return;
        }

        if (msg.timestamp < startupTime) {
            console.log(`[WhatsApp] Ignorando mensaje antiguo de ${msg.from}`);
            return;
        }

        console.log(`[WhatsApp] Mensaje recibido de ${msg.from}: ${msg.body}`);

        const senderPhone = msg.from.split('@')[0];
        const msgText = msg.body.toLowerCase().trim();

        // --- INTERCEPTOR DE OPT-OUT DE MARKETING ---
        if (msgText === 'salir' || msgText === 'parar' || msgText === 'cancelar suscripcion' || msgText === 'cancelar suscripción') {
            const unsubRes = await pool.query(
                `UPDATE crm_customers 
                 SET marketing_unsubscribed = TRUE 
                 WHERE phone = $1 OR phone = $2
                 RETURNING name`,
                [senderPhone, senderPhone.replace(/^57/, '')] // Soporta prefijo de país Colombia
            );
            if (unsubRes.rows.length > 0) {
                console.log(`[Marketing Opt-Out] 🔕 Cliente +${senderPhone} (${unsubRes.rows[0].name}) se ha dado de baja de la publicidad.`);
                await msg.reply("🔕 Te hemos dado de baja de nuestra lista de difusión. No recibirás más mensajes promocionales de nuestra parte.");
                return;
            }
        }

        // --- COMANDO DE CHAT: Cerrar Sesión ---
        if (msgText === 'cerrar sesion' || msgText === 'cerrar sesión') {
            if (activeWaSessions.has(senderPhone)) {
                activeWaSessions.delete(senderPhone);
                await msg.reply("🔒 Sesión de administración cerrada correctamente. Ya no se aceptarán archivos por este chat.");
            } else {
                await msg.reply("No tienes ninguna sesión de administración activa abierta.");
            }
            return;
        }

        // --- COMANDO DE CHAT: Extender Sesión ---
        if (msgText === 'extender sesion' || msgText === 'extender sesión') {
            const session = activeWaSessions.get(senderPhone);
            if (session && session.expiresAt > Date.now()) {
                session.expiresAt += 5 * 60 * 1000; // Agregar 5 minutos
                const remaining = Math.round((session.expiresAt - Date.now()) / 1000 / 60);
                await msg.reply(`⏳ Sesión extendida 5 minutos más. Tiempo restante de carga: ${remaining} minutos.`);
            } else {
                await msg.reply("No tienes ninguna sesión activa para extender.");
            }
            return;
        }
        // --- COMANDO DE CHAT: Guardar Audio Pregrabado por Respuesta (Quoted Reply) ---
        if (msgText.startsWith('#audio ') || msgText.startsWith('/audio ')) {
            const session = activeWaSessions.get(senderPhone);
            if (!session || session.expiresAt <= Date.now()) {
                const authLink = `https://frant-test.diazlab.online/wa-auth?phone=${senderPhone}`;
                await msg.reply(`⚠️ No tienes una sesión activa de administración.\n\nPor seguridad, inicia sesión primero en este enlace (válido por 10 minutos) antes de administrar audios:\n🔗 ${authLink}`);
                return;
            }

            const commandParts = msgText.split(' ');
            const tag = commandParts[1]?.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

            if (!tag) {
                await msg.reply("❌ Error: Debes especificar una etiqueta válida. Ejemplo: `#audio bienvenida` o `/audio bienvenida`.");
                return;
            }

            if (!msg.hasQuotedMsg) {
                await msg.reply("❌ Error: Debes responder (hacer reply/citar) al mensaje de voz o archivo de audio que deseas guardar con este comando.");
                return;
            }

            try {
                const quotedMsg = await msg.getQuotedMessage();
                if (!quotedMsg.hasMedia || (quotedMsg.type !== 'audio' && quotedMsg.type !== 'ptt')) {
                    await msg.reply("❌ Error: El mensaje al que respondiste no es un archivo de audio ni una nota de voz.");
                    return;
                }

                await msg.reply(`📥 Descargando nota de voz de WhatsApp para guardarla con la etiqueta "${tag}"...`);
                const media = await quotedMsg.downloadMedia();

                if (media) {
                    const clientMediaDir = path.join(process.cwd(), 'media', 'clients', session.clientId, 'audios');
                    if (!fs.existsSync(clientMediaDir)) {
                        fs.mkdirSync(clientMediaDir, { recursive: true });
                    }

                    // Determinar extensión adecuada
                    let ext = '.ogg';
                    if (media.mimetype.includes('mp3')) ext = '.mp3';
                    else if (media.mimetype.includes('wav')) ext = '.wav';
                    else if (media.mimetype.includes('m4a')) ext = '.m4a';

                    const fileName = `${tag}${ext}`;
                    const filePath = path.join(clientMediaDir, fileName);

                    // Eliminar duplicados con la misma etiqueta
                    const existingFiles = fs.readdirSync(clientMediaDir);
                    for (const f of existingFiles) {
                        if (f.startsWith(`${tag}.`)) {
                            fs.unlinkSync(path.join(clientMediaDir, f));
                        }
                    }

                    const buffer = Buffer.from(media.data, 'base64');
                    fs.writeFileSync(filePath, buffer);

                    console.log(`[WhatsApp Media Audio] 🎙️ Audio guardado por comando de WhatsApp para cliente ${session.clientId}: ${fileName}`);
                    await msg.reply(`✅ ¡Nota de voz guardada exitosamente!\n\n🏷️ **Etiqueta**: "${tag}"\n📄 **Archivo**: ${fileName}\n\nTu bot de IA ahora podrá reproducir este audio automáticamente cuando el cliente lo requiera.`);
                } else {
                    await msg.reply("❌ Error: No se pudo descargar el archivo de audio de WhatsApp.");
                }
            } catch (err: any) {
                console.error("[WhatsApp Media Audio] Error al procesar audio por comando:", err);
                await msg.reply(`❌ Ocurrió un error al guardar el audio: ${err.message}`);
            }
            return;
        }

        // --- INTERCEPTAR ARCHIVOS (PDF, TXT, DOCX, COMPROBANTES DE PAGO) ---
        if (msg.hasMedia) {
            // 1. RECEPTOR AUTOMÁTICO DE COMPROBANTES DE PAGO (FOTOS DE TRANSFERENCIA)
            if (msg.type === 'image') {
                try {
                    const cleanSender = senderPhone.replace(/[^0-9]/g, '');
                    const cleanNoCountry = cleanSender.replace(/^57/, '');

                    // Buscar si el cliente remitente tiene alguna factura en estado pendiente
                    const pendingInvoiceRes = await pool.query(
                        `SELECT id, invoice_number, customer_name, total_amount, client_id, payment_method, transfer_bank
                         FROM invoices 
                         WHERE (customer_phone = $1 OR customer_phone = $2 OR customer_phone = $3)
                           AND status = 'pending'
                         ORDER BY created_at DESC 
                         LIMIT 1`,
                        [cleanSender, cleanNoCountry, `+${cleanSender}`]
                    );

                    if (pendingInvoiceRes.rows.length > 0) {
                        const invoice = pendingInvoiceRes.rows[0];
                        console.log(`[WhatsApp Receipt] 📸 Foto de comprobante recibida de +${senderPhone} para Factura #${invoice.invoice_number}`);
                        
                        const media = await msg.downloadMedia();

                        if (media) {
                            let ext = '.jpg';
                            if (media.mimetype?.includes('png')) ext = '.png';
                            else if (media.mimetype?.includes('webp')) ext = '.webp';

                            const fileName = `receipt_${invoice.id}_${Date.now()}${ext}`;
                            const buffer = Buffer.from(media.data, 'base64');

                            // Guardar mediante el servicio híbrido (Cloudflare R2 o Fallback Local VPS)
                            const publicReceiptUrl = await uploadTenantFile(
                                invoice.client_id,
                                'receipts',
                                fileName,
                                buffer,
                                media.mimetype || 'image/jpeg'
                            );

                            // Opcional: Subir también a Google Drive si el cliente lo tiene configurado
                            try {
                                const clientData = await getClientById(invoice.client_id);
                                if (clientData && clientData.driveFolderId) {
                                    const { Readable } = require('stream');
                                    const stream = new Readable();
                                    stream.push(buffer);
                                    stream.push(null);
                                    await uploadFileToFolder(clientData.driveFolderId, `Factura_${invoice.invoice_number}_${fileName}`, media.mimetype || 'image/jpeg', stream);
                                    console.log(`[WhatsApp Receipt] ☁️ Comprobante subido a Google Drive de tienda ${invoice.client_id}`);
                                }
                            } catch (driveErr) {
                                console.warn(`[WhatsApp Receipt] No se pudo subir a Drive (usando servicio de almacenamiento principal):`, driveErr);
                            }

                            // Actualizar la factura en la base de datos
                            await pool.query(
                                `UPDATE invoices 
                                 SET payment_receipt_url = $1, updated_at = NOW() 
                                 WHERE id = $2`,
                                [publicReceiptUrl, invoice.id]
                            );

                            console.log(`[WhatsApp Receipt] ✅ Comprobante guardado en BD para tienda ${invoice.client_id}: ${publicReceiptUrl}`);

                            await msg.reply(
                                `📸 **¡Comprobante de Pago Recibido!**\n\n` +
                                `Hemos asociado tu soporte de transferencia a la **Factura #${invoice.invoice_number}** por valor de **$${parseFloat(invoice.total_amount).toLocaleString('es-CO')}**.\n\n` +
                                `Nuestro equipo de caja lo verificará en breve. ¡Gracias por tu compra!`
                            );
                            return; // Terminamos el flujo sin procesar como RAG ni mensaje administrativo
                        }
                    }
                } catch (receiptErr) {
                    console.error("[WhatsApp Receipt] ❌ Error procesando comprobante de transferencia:", receiptErr);
                }
            }

            const session = activeWaSessions.get(senderPhone);
            if (session && session.expiresAt > Date.now()) {
                // Si el archivo enviado es un audio o nota de voz
                if (msg.type === 'audio' || msg.type === 'ptt') {
                    await msg.reply(`🎙️ ¡Nota de voz/audio detectado!\n\nSi deseas guardarla en tu bot de IA para reproducirla automáticamente a tus clientes, responde (haz reply) a este mismo mensaje escribiendo:\n👉 \`#audio etiqueta\` (ej. \`#audio bienvenida\`)`);
                    return;
                }

                try {
                    await msg.reply("📥 Recibiendo tu archivo, lo estoy subiendo a Google Drive e indexando en tu bot...");
                    const media = await msg.downloadMedia();
                    
                    if (media) {
                        const fileName = media.filename || `upload_${Date.now()}.txt`;
                        const buffer = Buffer.from(media.data, 'base64');
                        
                        // 1. Guardar en almacenamiento local
                        await saveLocalFile(session.clientId, fileName, buffer);

                        // 2. Si el cliente tiene Drive, subir usando la cuota del administrador (5TB)
                        const clientData = await getClientById(session.clientId);
                        if (clientData && clientData.driveFolderId) {
                            const { Readable } = require('stream');
                            const stream = new Readable();
                            stream.push(buffer);
                            stream.push(null);
                            await uploadFileToFolder(clientData.driveFolderId, fileName, media.mimetype, stream);
                            console.log(`[WhatsApp Upload] ✅ Archivo subido a Google Drive: ${fileName}`);
                        }

                        // 3. Sincronizar RAG híbrido
                        const chunks = await fetchDocumentsFromDrive(session.clientId, clientData?.driveFolderId || null);
                        await msg.reply(`✅ ¡Archivo "${fileName}" cargado e indexado con éxito! Tu bot ha aprendido esta información (${chunks.length} fragmentos creados).`);
                    } else {
                        await msg.reply("❌ Error: No se pudo procesar el archivo enviado.");
                    }
                } catch (uploadErr: any) {
                    console.error("[WhatsApp Upload] Error en carga:", uploadErr);
                    await msg.reply(`❌ Ocurrió un error al procesar el archivo: ${uploadErr.message}`);
                }
            } else {
                const authLink = `https://frant-test.diazlab.online/wa-auth?phone=${senderPhone}`;
                await msg.reply(`⚠️ No tienes una sesión activa de administración para enviarme archivos.\n\nPor seguridad, inicia sesión primero en este enlace (válido por 10 minutos):\n🔗 ${authLink}`);
            }
            return; // Evitamos pasar el archivo a la IA como pregunta de chat
        }

        // --- FLUJO CONVERSACIONAL COMÚN (GEMINI RAG) ---
        try {
            // Resolvemos dinámicamente el número de teléfono del bot logueado
            const botPhone = client.info?.wid?.user || "1234567890"; 

            // Enrutamos usando el número del bot conectado para cargar su respectivo prompt y config
            const responseText = await routeIncomingMessage(
                botPhone, 
                senderPhone, 
                msg.body,
                async (to, text) => {
                    if (client) {
                        const target = to.includes('@c.us') ? to : `${to}@c.us`;
                        await client.sendMessage(target, text);
                    }
                },
                async (to, filePath) => {
                    if (client) {
                        const target = to.includes('@c.us') ? to : `${to}@c.us`;
                        const media = MessageMedia.fromFilePath(filePath);
                        await client.sendMessage(target, media, { sendAudioAsVoice: true });
                    }
                }
            );

            if (responseText) {
                // Mostrar "escribiendo..." de forma segura para evitar caídas en IDs especiales (ej. @lid)
                try {
                    const chat = await msg.getChat();
                    await chat.sendStateTyping();
                } catch (typingErr) {
                    console.warn("[WhatsApp] No se pudo mostrar el estado 'escribiendo...', continuando con el envío:", typingErr);
                }

                // Retardo aleatorio de 2 a 4 segundos (antiban)
                const delayMs = Math.floor(Math.random() * 2000) + 2000;
                await new Promise(resolve => setTimeout(resolve, delayMs));

                await msg.reply(responseText);
                console.log(`[WhatsApp] Respuesta enviada a ${msg.from}`);
            }

        } catch (error) {
            console.error('[WhatsApp] Error procesando el mensaje:', error);
            await msg.reply('Lo siento, estoy experimentando dificultades técnicas. Intenta de nuevo más tarde.');
        }
    });

    // Evento: Desconexión
    client.on('disconnected', async (reason) => {
        console.log('[WhatsApp] Cliente desconectado. Razón:', reason);
        whatsappState.status = 'DISCONNECTED';
        whatsappState.qr = '';
        whatsappState.phone = '';
        isReadyHandled = false;

        // Registrar la desconexión del bot
        logger.raiseAlert('whatsapp_disconnected', 'red', 'El bot de WhatsApp se ha desconectado del dispositivo móvil.', `Razón dada: ${reason}`, whatsappState.clientId);

        // Limpiar archivos locales si ocurrió desvinculación explícita (LOGOUT)
        if (reason === 'LOGOUT') {
            console.log("[WhatsApp] Limpiando archivos de sesión local por LOGOUT...");
            const sessionPath = path.join(process.cwd(), '.wwebjs_auth');
            if (fs.existsSync(sessionPath)) {
                try {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                    console.log("[WhatsApp] ✅ Carpeta de sesión eliminada.");
                } catch (rmErr) {
                    console.error("[WhatsApp] Error al eliminar carpeta de sesión:", rmErr);
                }
            }
        }

        try {
            if (client) {
                await client.destroy();
            }
        } catch (err) {
            console.error("[WhatsApp] Error destruyendo cliente en desconexión:", err);
        } finally {
            client = null; // Liberar referencia para permitir reconstrucción
        }
    });

    return client;
};

// Conectar WhatsApp bajo demanda
export const connectWhatsApp = async (clientId?: string) => {
    if (whatsappState.status === 'CONNECTED' || whatsappState.status === 'QR' || whatsappState.status === 'INITIALIZING') {
        return;
    }
    pendingConnectionClientId = clientId || null;
    whatsappState.status = 'INITIALIZING';
    whatsappState.qr = '';
    whatsappState.phone = '';
    console.log(`[WhatsApp] Inicializando conexión a petición del usuario para clientId: ${clientId || 'Ninguno'}...`);
    
    // Destruir cliente anterior si existe para evitar conflictos de múltiples llamadas a initialize()
    if (client) {
        try {
            console.log("[WhatsApp] Destruyendo cliente de WhatsApp previo antes de reconectar...");
            await client.destroy();
        } catch (err) {
            console.error("[WhatsApp] Error destruyendo cliente previo:", err);
        }
        client = null;
    }

    // Nos aseguramos de instanciar un cliente limpio y registrar sus escuchadores
    const activeClient = initializeWhatsAppClient();

    try {
        await activeClient.initialize();
    } catch (err: any) {
        console.error("[WhatsApp] Error al inicializar cliente:", err);
        whatsappState.status = 'DISCONNECTED';
        client = null;
        // Registrar error de inicialización
        logger.raiseAlert('whatsapp_initialization_error', 'red', 'Fallo al arrancar el cliente Puppeteer de WhatsApp.', err?.stack || String(err), pendingConnectionClientId || 'admin');
    }
};

// Cerrar sesión y limpiar credenciales locales de WhatsApp
export const logoutWhatsApp = async () => {
    console.log("[WhatsApp] Cerrando sesión a petición del usuario...");
    whatsappState.status = 'DISCONNECTED';
    whatsappState.qr = '';
    whatsappState.phone = '';
    try {
        if (client) {
            await client.logout();
            await client.destroy();
        }
    } catch (err) {
        console.error("[WhatsApp] Error en logout de WhatsApp:", err);
    } finally {
        client = null;
    }
};

// Función auxiliar para enviar un mensaje de texto por WhatsApp de forma segura
export const sendWhatsAppTextMessage = async (phone: string, text: string): Promise<boolean> => {
    try {
        if (!client || whatsappState.status !== 'CONNECTED') {
            console.log(`[WhatsApp Sender] No se envió mensaje a +${phone} porque WhatsApp no está conectado.`);
            return false;
        }
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        if (!cleanPhone) return false;

        const target = cleanPhone.endsWith('@c.us') ? cleanPhone : `${cleanPhone}@c.us`;
        await client.sendMessage(target, text);
        console.log(`[WhatsApp Sender] ✅ Mensaje proactivo enviado exitosamente a +${cleanPhone}`);
        return true;
    } catch (err: any) {
        console.error(`[WhatsApp Sender] ❌ Error enviando mensaje a +${phone}:`, err?.message || err);
        return false;
    }
};