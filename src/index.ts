import 'dotenv/config'; // Inicializamos dotenv para leer las variables de entorno
import { initializeWhatsAppClient } from './services/whatsapp';
import './server';
import { registerShutdownHandlers, restoreSystemState } from './services/shutdownManager';
import { logger } from './services/logger';

// Capturar excepciones globales no controladas
process.on('uncaughtException', async (error) => {
    console.error('Fatal Uncaught Exception:', error);
    try {
        await logger.raiseAlert('uncaught_exception', 'red', 'El servidor experimentó un fallo crítico no controlado (Uncaught Exception).', error.stack);
    } catch (err) {
        console.error('Error enviando alerta por exception:', err);
    }
    process.exit(1);
});

process.on('unhandledRejection', async (reason: any) => {
    console.error('Fatal Unhandled Rejection:', reason);
    try {
        await logger.raiseAlert('unhandled_rejection', 'red', 'Se detectó una promesa rechazada no capturada (Unhandled Rejection).', reason?.stack || String(reason));
    } catch (err) {
        console.error('Error enviando alerta por rejection:', err);
    }
});

console.log("🚀 Agency AI Bot inicializando...");
console.log("Generando servicio de WhatsApp...");

// Registrar manejadores de señales para apagado seguro
registerShutdownHandlers();

// Restaurar sesiones de carga activas previas y limpiar archivo temporal
restoreSystemState();

// Inicia el cliente real de WhatsApp Web
// Esto generará el código QR en la consola.
initializeWhatsAppClient();