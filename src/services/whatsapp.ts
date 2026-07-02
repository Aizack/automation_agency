import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { routeIncomingMessage } from '../core/router';

// Estado global de WhatsApp expuesto para el Dashboard
export const whatsappState = {
    status: 'DISCONNECTED', // 'DISCONNECTED', 'QR', 'CONNECTED'
    qr: '',
    phone: '',
};

// Usamos LocalAuth para que la sesión se guarde en la computadora
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'], // Útil para Docker/VPS
    }
});

const startupTime = Math.floor(Date.now() / 1000);

export const initializeWhatsAppClient = () => {
    console.log("[WhatsApp] Iniciando cliente...");

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

    // Evento: Autenticación exitosa
    client.on('ready', () => {
        console.log('[WhatsApp] Cliente está listo y conectado correctamente.');
        
        // Actualizar estado global
        whatsappState.status = 'CONNECTED';
        whatsappState.qr = '';
        whatsappState.phone = client.info.wid.user;
    });

    // Evento: Recepción de mensajes
    client.on('message', async (msg) => {
        if (msg.from === 'status@broadcast') return;
        if (msg.from.endsWith('@g.us')) return;

        if (msg.timestamp < startupTime) {
            console.log(`[WhatsApp] Ignorando mensaje antiguo de ${msg.from}`);
            return;
        }

        console.log(`[WhatsApp] Mensaje recibido de ${msg.from}: ${msg.body}`);

        try {
            const senderPhone = msg.from.split('@')[0];

            // Resolvemos dinámicamente el número de teléfono del bot que está logueado
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
            }

        } catch (error) {
            console.error('[WhatsApp] Error procesando el mensaje:', error);
            await msg.reply('Lo siento, estoy experimentando dificultades técnicas. Intenta de nuevo más tarde.');
        }
    });

    // Evento: Desconexión
    client.on('disconnected', (reason) => {
        console.log('[WhatsApp] Cliente desconectado:', reason);
        whatsappState.status = 'DISCONNECTED';
        whatsappState.qr = '';
        whatsappState.phone = '';
    });

    client.initialize();
};