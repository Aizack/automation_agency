import 'dotenv/config'; // Inicializamos dotenv para leer las variables de entorno
import { initializeWhatsAppClient } from './services/whatsapp';

console.log("🚀 Agency AI Bot inicializando...");
console.log("Generando servicio de WhatsApp...");

// Inicia el cliente real de WhatsApp Web
// Esto generará el código QR en la consola.
initializeWhatsAppClient();