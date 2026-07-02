import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { routeIncomingMessage } from '../core/router';

// Estado global de WhatsApp expuesto para el Dashboard
export const whatsappState = {
    status: 'DISCONNECTED', // 'DISCONNECTED', 'QR', 'CONNECTED', 'INITIALIZING'
    qr: '',
    phone: '',
};

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

        try {
            const senderPhone = msg.from.split('@')[0];

            // Resolvemos dinámicamente el número de teléfono del bot logueado
            const botPhone = client.info?.wid?.user || "1234567890"; 

            // Enrutamos usando el número del bot conectado para cargar su respectivo prompt y config
            const responseText = await routeIncomingMessage(botPhone, senderPhone, msg.body);

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
        client = null;
    }
};

// Cerrar sesión y desvincular dispositivo de WhatsApp (Logout)
export const logoutWhatsApp = async () => {
    console.log("[WhatsApp] Solicitud de cierre de sesión y desvinculación recibida...");
    if (whatsappState.status === 'CONNECTED' && client) {
        try {
            await client.logout(); // Esto desvincula y borra sesión local, disparando 'disconnected'
            console.log("[WhatsApp] Sesión de WhatsApp cerrada exitosamente.");
        } catch (err) {
            console.error("[WhatsApp] Error al cerrar sesión (forzando destrucción):", err);
            try {
                if (client) await client.destroy();
            } catch (destroyErr) {}
            whatsappState.status = 'DISCONNECTED';
            whatsappState.qr = '';
            whatsappState.phone = '';
            client = null;
        }
    } else {
        try {
            if (client) await client.destroy();
        } catch (err) {}
        whatsappState.status = 'DISCONNECTED';
        whatsappState.qr = '';
        whatsappState.phone = '';
        client = null;
    }
};