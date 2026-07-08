import 'dotenv/config';
import { routeIncomingMessage } from './core/router';
import { pool } from './database/connection';

const runTest = async () => {
    console.log("=== INICIANDO PRUEBA E2E DE ROUTING Y BASE DE DATOS ===");

    // Simularemos un mensaje hacia la Clínica Dental (cuyo teléfono es 1234567890)
    const botRecipientPhone = "1234567890";
    const userSenderPhone = "5551234567"; // Número inventado del usuario
    const userMessage = "Hola, necesito una cita para mañana";

    console.log(`[TEST] Simulando mensaje de ${userSenderPhone} hacia ${botRecipientPhone}: "${userMessage}"`);

    // Ejecutamos el flujo
    const response = await routeIncomingMessage(botRecipientPhone, userSenderPhone, userMessage);

    console.log(`[TEST] Respuesta obtenida: ${response}`);

    console.log("\n=== PRUEBA E2E FINALIZADA ===");

    // Cerramos el pool de base de datos para que el script termine correctamente.
    await pool.end();
};

runTest().catch(console.error);
