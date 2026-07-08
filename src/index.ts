import 'dotenv/config'; // Inicializamos dotenv para leer las variables de entorno
import { initializeWhatsAppClient } from './services/whatsapp';
import { initializeDatabase } from './database/initDb';

const start = async () => {
  console.log("🚀 Agency AI Bot inicializando...");

  // 1. Inicializar Base de Datos y Seed
  await initializeDatabase();

  // 2. Iniciar cliente de WhatsApp
  console.log("Generando servicio de WhatsApp...");
  // Inicia el cliente real de WhatsApp Web
  // Esto generará el código QR en la consola.
  initializeWhatsAppClient();
};

start().catch(err => {
  console.error("Error crítico durante el inicio:", err);
  process.exit(1);
});