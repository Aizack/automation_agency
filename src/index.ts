import 'dotenv/config'; // Inicializamos dotenv para leer las variables de entorno
import { routeIncomingMessage } from './core/router';

console.log("🚀 Agency AI Bot inicializando...");

// Simulador de entrada de mensajes de WhatsApp
// En producción, esto sería reemplazado por los eventos de WWebJS o Baileys
const simulateWhatsAppWebhook = async () => {
    console.log("\n--- Simulando mensaje a la Clínica Dental ---");
    await routeIncomingMessage("1234567890", "5550001111", "Hola, necesito una cita para el martes");

    console.log("\n--- Simulando mensaje a la Pizzería ---");
    await routeIncomingMessage("0987654321", "5550002222", "Quiero pedir una pizza familiar");
};

simulateWhatsAppWebhook();