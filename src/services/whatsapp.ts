import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { routeIncomingMessage } from '../core/router';
import { saveLocalFile } from './localKnowledge';
import { getClientById } from '../database/clientsCrud';
import { fetchDocumentsFromDrive, uploadFileToFolder } from './drive';

// Estado global de WhatsApp expuesto para el Dashboard
export const whatsappState = {
    status: 'DISCONNECTED', // 'DISCONNECTED', 'QR', 'CONNECTED', 'INITIALIZING'
    qr: '',
    phone: '',
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
const startupTime = Math.floor(Date.now() / 1000);

export const initializeWhatsAppClient = () => {
    // Si el cliente ya está instanciado, no creamos duplicados
    if (client) return;

    console.log("[WhatsApp] Instanciando un nuevo cliente de WhatsApp Web...");
    
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'], // Útil para entornos Docker/Windows
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
    client.on('ready', () => {
        if (!client) return;
        console.log('[WhatsApp] Cliente está listo y conectado correctamente.');
        
        // Actualizar estado global
        whatsappState.status = 'CONNECTED';
        whatsappState.qr = '';
        whatsappState.phone = client.info.wid.user;
    });

    // Evento: Recepción de mensajes
    client.on('message', async (msg) => {
        if (!client) return;
        if (msg.from === 'status@broadcast') return;
        if (msg.from.endsWith('@g.us')) return;

        if (msg.timestamp < startupTime) {
            console.log(`[WhatsApp] Ignorando mensaje antiguo de ${msg.from}`);
            return;
        }

        console.log(`[WhatsApp] Mensaje recibido de ${msg.from}: ${msg.body}`);

        const senderPhone = msg.from.split('@')[0];
        const msgText = msg.body.toLowerCase().trim();

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
                    const clientMediaDir = path.join(process.cwd(), 'media', 'clients', session.clientId);
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

        // --- INTERCEPTAR ARCHIVOS (PDF, TXT, DOCX, etc.) ---
        if (msg.hasMedia) {
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
                const chat = await msg.getChat();
                await chat.sendStateTyping();

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
        console.log('[WhatsApp] Cliente desconectado:', reason);
        whatsappState.status = 'DISCONNECTED';
        whatsappState.qr = '';
        whatsappState.phone = '';
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

    // Auto-inicializar el cliente al iniciar el servidor (reconecta sesión guardada localmente)
    console.log("[WhatsApp] Iniciando auto-conexión del cliente...");
    client.initialize().catch(err => {
        console.error("[WhatsApp] Error en auto-inicialización de WhatsApp:", err);
    });
};

// Conectar WhatsApp bajo demanda
export const connectWhatsApp = async () => {
    if (whatsappState.status === 'CONNECTED' || whatsappState.status === 'QR' || whatsappState.status === 'INITIALIZING') {
        return;
    }
    whatsappState.status = 'INITIALIZING';
    whatsappState.qr = '';
    whatsappState.phone = '';
    console.log("[WhatsApp] Inicializando conexión a petición del usuario...");
    
    // Nos aseguramos de instanciar un cliente limpio y registrar sus escuchadores
    initializeWhatsAppClient();

    try {
        if (client) {
            await client.initialize();
        }
    } catch (err) {
        console.error("[WhatsApp] Error al inicializar cliente:", err);
        whatsappState.status = 'DISCONNECTED';
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