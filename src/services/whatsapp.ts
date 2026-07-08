import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
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

        // --- INTERCEPTAR ARCHIVOS (PDF, TXT, DOCX, etc.) ---
        if (msg.hasMedia) {
            const session = activeWaSessions.get(senderPhone);
            if (session && session.expiresAt > Date.now()) {
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