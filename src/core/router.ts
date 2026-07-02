import { getClientConfigByPhone } from './config';
import { AIAgent } from '../agents/base';
import { pool } from '../database/postgres';

/**
 * El Router es el núcleo del sistema Multi-tenant.
 * Recibe un mensaje entrante (ej. de WhatsApp) e identifica a qué cliente
 * pertenece la conversación, para instanciar el Agente correcto.
 */
export const routeIncomingMessage = async (
  recipientPhone: string, // El número de WhatsApp del bot al que el usuario escribió (Línea del Bot)
  senderPhone: string,    // El número de WhatsApp de la persona que escribe (Cliente o Agente)
  messageText: string
): Promise<string | undefined> => {
  console.log(`[Router] Nuevo mensaje recibido en la línea: ${recipientPhone} de ${senderPhone}`);

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

  const clientId = clientConfig.id;

  // --- MODELO DE TRASPASO HUMANO (HUMAN TAKEOVER) ---

  // CASO A: Quien escribe es el Agente Humano asignado a esta cuenta
  if (clientConfig.agentPhone && senderPhone === clientConfig.agentPhone) {
    // Buscar si este agente tiene alguna sesión de traspaso activa para este cliente
    const activeSessionRes = await pool.query(
      `SELECT customer_phone 
       FROM takeover_sessions 
       WHERE client_id = $1 AND status = 'active' 
       ORDER BY updated_at DESC LIMIT 1`,
      [clientId]
    );

    if (activeSessionRes.rows.length > 0) {
      const customerPhone = activeSessionRes.rows[0].customer_phone;
      const cleanMessage = messageText.trim().toLowerCase();

      // Comando especial para cerrar la sesión y reactivar la IA
      if (cleanMessage === '/close' || cleanMessage === '/terminar') {
        await pool.query(
          `UPDATE takeover_sessions 
           SET status = 'closed', updated_at = NOW() 
           WHERE client_id = $1 AND customer_phone = $2 AND status = 'active'`,
          [clientId, customerPhone]
        );
        console.log(`[Router] 🔓 Traspaso finalizado por el agente. IA reactivada para el cliente ${customerPhone}.`);
        return `[System] Sesión finalizada con el cliente ${customerPhone}. La IA vuelve a estar activa.`;
      }

      // Si es un mensaje común, se reenvía al cliente
      console.log(`[Router] ➡️ AGENTE responde: Reenviando mensaje del Agente (${senderPhone}) al Cliente (${customerPhone}): "${messageText}"`);
      // En producción física: client.sendMessage(customerPhone, messageText);
      return `[Proxy para Cliente ${customerPhone}]: ${messageText}`;
    }
  }

  // CASO B: Quien escribe es el Cliente Final
  // Revisamos si el cliente final tiene una sesión de traspaso humano activa
  const takeoverRes = await pool.query(
    `SELECT id 
     FROM takeover_sessions 
     WHERE client_id = $1 AND customer_phone = $2 AND status = 'active' 
     LIMIT 1`,
    [clientId, senderPhone]
  );

  if (takeoverRes.rows.length > 0) {
    // La IA está pausada para este cliente. Reenviamos el mensaje al agente humano.
    console.log(`[Router] ➡️ CLIENTE en espera: Reenviando mensaje de Cliente (${senderPhone}) al Agente Humano (${clientConfig.agentPhone}): "${messageText}"`);
    // En producción física: client.sendMessage(clientConfig.agentPhone, `[Cliente +${senderPhone}]: ${messageText}`);
    
    // Actualizamos el timestamp de la sesión para mantenerla arriba en la cola
    await pool.query(
      `UPDATE takeover_sessions SET updated_at = NOW() WHERE client_id = $1 AND customer_phone = $2 AND status = 'active'`,
      [clientId, senderPhone]
    );

    return `[Proxy para Agente]: Tu mensaje ha sido transferido al asesor humano.`;
  }

  // Detectar si el cliente solicita explícitamente un humano (Regla semántica rápida antes de Gemini)
  const isRequestingHuman = /\b(humano|asesor|soporte|persona|operador|agente)\b/i.test(messageText);
  if (isRequestingHuman) {
    console.log(`[Router] ⚠️ Cliente ${senderPhone} solicita atención humana. Pausando IA y abriendo sesión.`);
    
    // Insertar sesión de traspaso
    await pool.query(
      `INSERT INTO takeover_sessions (client_id, customer_phone, status) 
       VALUES ($1, $2, 'active')
       ON CONFLICT DO NOTHING`,
      [clientId, senderPhone]
    );

    // Enviar alerta inicial al agente en producción física:
    // client.sendMessage(clientConfig.agentPhone, `⚠️ ALERTA: El cliente +${senderPhone} solicita un humano. Mensaje: "${messageText}".`);

    return "Entendido. He pausado el asistente virtual y transferido tu conversación a un asesor humano. En un momento te responderá.";
  }

  // --- FLUJO CONVERSACIONAL DE IA ---

  console.log(`[Router] Mensaje ruteado al cliente: ${clientConfig.name} (ID: ${clientConfig.id})`);

  // 3. Instanciar el Agente con la configuración del Cliente
  const agent = new AIAgent(clientConfig);

  // 4. Procesar el mensaje (RAG, LLM, Tools)
  const response = await agent.processMessage(messageText, senderPhone);

  console.log(`[Router] Respuesta generada: ${response}`);

  // 5. Registrar Métricas de la Interacción en la Base de Datos
  try {
    const estimatedInputTokens = Math.ceil(messageText.length / 4) + 150;
    const estimatedOutputTokens = Math.ceil(response.length / 4);

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
