import { getClientConfigByPhone } from './config';
import { AIAgent } from '../agents/base';
import { pool } from '../database/postgres';

/**
 * El Router es el núcleo del sistema Multi-tenant.
 * Recibe un mensaje entrante (ej. de WhatsApp) e identifica a qué cliente
 * pertenece la conversación, para instanciar el Agente correcto.
 */
export const routeIncomingMessage = async (
  recipientPhone: string, // El número de WhatsApp del bot al que el usuario escribió
  senderPhone: string,    // El número de WhatsApp de la persona que escribe
  messageText: string
): Promise<string | undefined> => {
  console.log(`[Router] Nuevo mensaje recibido en la línea: ${recipientPhone}`);

  // 1. Identificar el Tenant (Cliente) desde la Base de Datos
  const clientConfig = await getClientConfigByPhone(recipientPhone);

  if (!clientConfig) {
    console.error(`[Router] ❌ No se encontró cliente asociado al número ${recipientPhone}`);
    return;
  }

  // 2. Control de Facturación / Estado de Cuenta
  if (clientConfig.status !== 'active') {
    console.warn(`[Router] ⚠️ El cliente ${clientConfig.name} (ID: ${clientConfig.id}) tiene la cuenta bloqueada (estado: ${clientConfig.status}).`);
    return "Lo siento, este servicio se encuentra suspendido temporalmente por mantenimiento de cuenta.";
  }

  console.log(`[Router] Mensaje ruteado al cliente: ${clientConfig.name} (ID: ${clientConfig.id})`);

  // 3. Instanciar el Agente con la configuración del Cliente
  const agent = new AIAgent(clientConfig);

  // 4. Procesar el mensaje (RAG, LLM, Tools)
  const response = await agent.processMessage(messageText, senderPhone);

  console.log(`[Router] Respuesta generada: ${response}`);

  // 5. Registrar Métricas de la Interacción en la Base de Datos
  try {
    // Estimación aproximada de tokens (1 token ≈ 4 caracteres)
    const estimatedInputTokens = Math.ceil(messageText.length / 4) + 150; // Agregando base de System Prompt
    const estimatedOutputTokens = Math.ceil(response.length / 4);

    // Cálculo de costo estimado para Gemini 1.5/3.5 Flash:
    // $0.075 por millón de tokens de entrada, $0.30 por millón de tokens de salida
    const costInput = (estimatedInputTokens * 0.075) / 1000000;
    const costOutput = (estimatedOutputTokens * 0.30) / 1000000;
    const totalEstimatedCost = costInput + costOutput;

    await pool.query(
      `INSERT INTO interactions 
        (client_id, sender_phone, message_text, response_text, tokens_input, tokens_output, api_cost) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        clientConfig.id,
        senderPhone,
        messageText,
        response,
        estimatedInputTokens,
        estimatedOutputTokens,
        totalEstimatedCost
      ]
    );

    console.log(`[Router] 📊 Métrica registrada con éxito en DB (Costo estimado: $${totalEstimatedCost.toFixed(6)} USD).`);

  } catch (dbError) {
    console.error("[Router] ❌ Error registrando métricas de interacción en DB:", dbError);
  }

  return response;
};
