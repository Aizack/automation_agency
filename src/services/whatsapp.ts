import { Client, LocalAuth } from 'whatsapp-web.js';
import * as qrcode from 'qrcode-terminal';
import { routeIncomingMessage } from '../core/router';

// Usamos LocalAuth para que la sesión se guarde en la computadora
// y no tengas que escanear el QR cada vez que apagas y enciendes el bot.
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
    });

    // Evento: Autenticación exitosa
    client.on('ready', () => {
        console.log('[WhatsApp] Cliente está listo y conectado correctamente.');
    });

    // Evento: Recepción de mensajes
    client.on('message', async (msg) => {
        // Ignoramos los mensajes propios del bot o mensajes de estado
        if (msg.from === 'status@broadcast') return;

        // Evitar responder a grupos
        if (msg.from.endsWith('@g.us')) return;

        // Evitar responder a mensajes antiguos/no leídos previos a encender el bot
        if (msg.timestamp < startupTime) {
            console.log(`[WhatsApp] Ignorando mensaje antiguo de ${msg.from}`);
            return;
        }

        console.log(`[WhatsApp] Mensaje recibido de ${msg.from}: ${msg.body}`);

        try {
            // El número del cliente que escribió el mensaje (ej: 573001234567@c.us)
            const senderPhone = msg.from.split('@')[0];

            // En este entorno (whatsapp-web.js escaneado), el "bot" asume un solo número.
            // Para mantener la arquitectura multi-tenant de nuestra prueba,
            // enviaremos un "número de la agencia / bot" ficticio por ahora
            // para que el router sepa a qué cliente (tenant) enrutar.
            // En producción con WWebJS y Multi-dispositivo, usarías "msg.to".

            const recipientPhone = "1234567890"; // Simulamos que le escribieron a "Clínica Dental"

            const responseText = await routeIncomingMessage(recipientPhone, senderPhone, msg.body);

            if (responseText) {
                // Simulación de tipeo humana y retardo antiban
                const chat = await msg.getChat();
                await chat.sendStateTyping();

                // Retardo aleatorio de 2 a 4 segundos
                const delayMs = Math.floor(Math.random() * 2000) + 2000;
                await new Promise(resolve => setTimeout(resolve, delayMs));

                // Enviar la respuesta generada por Gemini de vuelta al usuario por WhatsApp
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
        // Podrías reiniciar el cliente aquí
    });

    // Iniciar el cliente
    client.initialize();
};