import { getClientConfigByPhone } from './config';
import { AIAgent } from '../agents/base';
import { query } from '../database/connection';

/**
 * El Router es el núcleo del sistema Multi-tenant.
 * Recibe un mensaje entrante (ej. de WhatsApp) e identifica a qué cliente
 * pertenece la conversación, para instanciar el Agente correcto.
 */
export const routeIncomingMessage = async (
  recipientPhone: string, // El número de WhatsApp del bot al que el usuario escribió
  senderPhone: string,    // El número de WhatsApp de la persona que escribe
  messageText: string
) => {
  console.log(`[Router] Nuevo mensaje recibido en la línea: ${recipientPhone}`);

  // 1. Identificar el Tenant (Cliente)
  const clientConfig = await getClientConfigByPhone(recipientPhone);

  if (!clientConfig) {
    console.error(`[Router] No se encontró cliente asociado al número ${recipientPhone}`);
    return;
  }

  console.log(`[Router] Mensaje ruteado al cliente: ${clientConfig.name} (ID: ${clientConfig.id})`);

  // 2. Instanciar el Agente con la configuración del Cliente
  const agent = new AIAgent(clientConfig);

  // 3. Procesar el mensaje (RAG, LLM, Tools)
  const response = await agent.processMessage(messageText, senderPhone);

  // 4. Guardar registro de la interacción (Métricas)
  try {
    await query(
      `INSERT INTO interactions (client_id, sender_phone, message_text, response_text)
       VALUES ($1, $2, $3, $4)`,
      [clientConfig.id, senderPhone, messageText, response]
    );
    console.log(`[Router] ✅ Interacción registrada en base de datos para cliente ${clientConfig.id}`);
  } catch (error) {
    console.error(`[Router] ❌ Error registrando la interacción:`, error);
  }

  // 5. (Pendiente) Enviar la respuesta de vuelta por WhatsApp
  console.log(`[Router] Respuesta generada: ${response}`);

  return response;
};
