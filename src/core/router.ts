import { getClientConfigByPhone } from './config';
import { AIAgent } from '../agents/base';
import { pool } from '../database/postgres';

// Mapas en memoria para gestionar confirmaciones pendientes
// 1. Confirmación del Asesor (¿Desea mandar notificación al cliente de que ya está disponible? si/no)
export const pendingAgentConfirmations = new Map<string, { 
    clientId: string; 
    customerPhone: string; 
    customerName: string;
    agentName: string;
}>(); // Clave: agentPhone

// 2. Confirmación del Cliente (¿Deseas que te comunique con Carlos o quieres seguir conmigo? si/no)
export const pendingCustomerConfirmations = new Map<string, {
    clientId: string;
    agentPhone: string;
    agentName: string;
    sessionId: string;
}>(); // Clave: customerPhone

/**
 * El Router es el núcleo del sistema Multi-tenant.
 * Recibe un mensaje entrante (ej. de WhatsApp) e identifica a qué cliente
 * pertenece la conversación, para instanciar el Agente correcto.
 */
export const routeIncomingMessage = async (
  recipientPhone: string, // El número de WhatsApp del bot al que el usuario escribió (Línea del Bot)
  senderPhone: string,    // El número de WhatsApp de la persona que escribe (Cliente o Agente)
  messageText: string,
  sendMessageFn?: (to: string, text: string) => Promise<any>,
  sendVoiceFn?: (to: string, filePath: string) => Promise<any>
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
  const cleanMessage = messageText.trim().toLowerCase();

  // --- MODELO DE TRASPASO HUMANO (HUMAN TAKEOVER) ---

  // Buscar si el sender es un asesor registrado de este cliente
  const agentRes = await pool.query(
    `SELECT name, phone, status FROM agent_contacts WHERE client_id = $1 AND phone = $2 LIMIT 1`,
    [clientId, senderPhone]
  );
  const isAgent = agentRes.rows.length > 0;
  const agentData = agentRes.rows[0];

  // ==========================================
  // CASO A: QUIEN ESCRIBE ES UN ASESOR HUMANO
  // ==========================================
  if (isAgent) {
    const agentName = agentData.name;

    // A.1 Manejar Comandos de Estado del Asesor (/out y /in)
    if (cleanMessage === '/out' || cleanMessage === '/busy') {
      await pool.query(
        `UPDATE agent_contacts SET status = 'offline' WHERE client_id = $1 AND phone = $2`,
        [clientId, senderPhone]
      );
      console.log(`[Router] 👤 Asesor ${agentName} (${senderPhone}) se puso ausente.`);
      return `Te has puesto en modo ausente. Ya no recibirás alertas de nuevos clientes. Para ponerte disponible responde /in`;
    }

    if (cleanMessage === '/in' || cleanMessage === '/online') {
      await pool.query(
        `UPDATE agent_contacts SET status = 'online' WHERE client_id = $1 AND phone = $2`,
        [clientId, senderPhone]
      );
      console.log(`[Router] 👤 Asesor ${agentName} (${senderPhone}) se puso en línea.`);
      return `Te has puesto en línea. Volverás a recibir alertas de clientes en espera.`;
    }

    // A.2 Verificar si este asesor tiene una confirmación pendiente (si/no de disponibilidad tardía)
    const pendingConfirm = pendingAgentConfirmations.get(senderPhone);
    if (pendingConfirm) {
      if (cleanMessage === 'si' || cleanMessage === 'sí') {
        // El asesor quiere conectarse tardíamente con el cliente.
        // Primero verificamos si el cliente no ha interactuado ya con otro asesor humano.
        const sessionRes = await pool.query(
          `SELECT id, current_agent_phone, interacted_with_agent 
           FROM takeover_sessions 
           WHERE client_id = $1 AND customer_phone = $2 AND status IN ('active', 'waiting_fallback')
           LIMIT 1`,
          [clientId, pendingConfirm.customerPhone]
        );

        if (sessionRes.rows.length === 0 || sessionRes.rows[0].interacted_with_agent) {
          pendingAgentConfirmations.delete(senderPhone);
          return "El cliente ya está siendo atendido por otro asesor.";
        }

        const session = sessionRes.rows[0];

        // Guardamos la confirmación pendiente del cliente
        pendingCustomerConfirmations.set(pendingConfirm.customerPhone, {
          clientId,
          agentPhone: senderPhone,
          agentName,
          sessionId: session.id
        });

        // Enviar propuesta al cliente
        if (sendMessageFn) {
          const clientPrompt = `-Hola ${pendingConfirm.customerName} parece que nuestro acesor ${agentName} ya está disponible y quiere atenderte, deseas que te comunique con ${agentName} o quieres seguir conmigo?`;
          await sendMessageFn(pendingConfirm.customerPhone, clientPrompt);
        }

        pendingAgentConfirmations.delete(senderPhone);
        return `Se ha enviado la consulta al cliente. Por favor espera a que confirme si desea hablar contigo.`;
      } 
      
      if (cleanMessage === 'no') {
        pendingAgentConfirmations.delete(senderPhone);
        return "Operación cancelada. El cliente continuará con el asistente virtual.";
      }

      return "Por favor responde únicamente SI o NO.";
    }

    // A.3 Verificar si este asesor es el asignado actualmente a una sesión de traspaso activa
    const activeSessionRes = await pool.query(
      `SELECT id, customer_phone, customer_name, interacted_with_agent
       FROM takeover_sessions 
       WHERE client_id = $1 AND current_agent_phone = $2 AND status = 'active'
       LIMIT 1`,
      [clientId, senderPhone]
    );

    if (activeSessionRes.rows.length > 0) {
      const session = activeSessionRes.rows[0];
      const customerPhone = session.customer_phone;

      // Comando especial para cerrar la sesión y reactivar la IA
      if (cleanMessage === '/close' || cleanMessage === '/terminar') {
        await pool.query(
          `UPDATE takeover_sessions 
           SET status = 'closed', updated_at = NOW() 
           WHERE id = $1`,
          [session.id]
        );
        console.log(`[Router] 🔓 Traspaso finalizado por el agente. IA reactivada para el cliente ${customerPhone}.`);
        
        if (sendMessageFn) {
          await sendMessageFn(customerPhone, "El asesor humano ha finalizado la sesión. El Asistente Virtual (IA) vuelve a estar activo para ayudarte.");
        }

        return `[System] Sesión finalizada con el cliente ${customerPhone}. La IA vuelve a estar activa.`;
      }

      // Si es la primera respuesta del asesor al cliente, marcamos que ha interactuado
      if (!session.interacted_with_agent) {
        await pool.query(
          `UPDATE takeover_sessions SET interacted_with_agent = TRUE WHERE id = $1`,
          [session.id]
        );
      }

      // Reenviar mensaje del agente al cliente
      console.log(`[Router] ➡️ AGENTE responde: Reenviando mensaje del Agente (${senderPhone}) al Cliente (${customerPhone}): "${messageText}"`);
      if (sendMessageFn) {
        await sendMessageFn(customerPhone, messageText);
      }
      return `[Proxy para Cliente ${customerPhone}]: ${messageText}`;
    }

    // A.4 Si el asesor escribe un mensaje común (sin tener sesión activa asignada), 
    // asumimos que responde tarde a una alerta anterior.
    const unservedSessionRes = await pool.query(
      `SELECT id, customer_phone, customer_name, updated_at
       FROM takeover_sessions
       WHERE client_id = $1 
         AND status IN ('active', 'waiting_fallback') 
         AND interacted_with_agent = FALSE
       ORDER BY created_at DESC LIMIT 1`
    );

    if (unservedSessionRes.rows.length > 0) {
      const session = unservedSessionRes.rows[0];
      const customerPhone = session.customer_phone;
      const customerName = session.customer_name || 'Cliente';

      // Obtener el último mensaje del cliente para ponérselo en contexto al asesor
      const lastMsgRes = await pool.query(
        `SELECT message_text, timestamp FROM interactions 
         WHERE client_id = $1 AND sender_phone = $2 
         ORDER BY timestamp DESC LIMIT 1`,
        [clientId, customerPhone]
      );
      
      const lastMsgText = lastMsgRes.rows.length > 0 ? lastMsgRes.rows[0].message_text : 'Hola';
      const lastMsgTime = lastMsgRes.rows.length > 0 
        ? new Date(lastMsgRes.rows[0].timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) 
        : 'hace unos momentos';

      // Registrar la confirmación pendiente del asesor
      pendingAgentConfirmations.set(senderPhone, {
        clientId,
        customerPhone,
        customerName,
        agentName
      });

      return `El cliente no ha interactuado con un agente humano. El último mensaje del cliente fue el ${lastMsgTime} y dijo: "${lastMsgText}". ¿Desea mandar notificación al cliente de que ya estás disponible? si/no`;
    }

    return "No tienes ningún cliente asignado activamente en este momento.";
  }

  // ==========================================
  // CASO B: QUIEN ESCRIBE ES EL CLIENTE FINAL
  // ==========================================

  // B.1 Buscar si el cliente tiene una confirmación pendiente sobre conectar con un asesor rezagado
  const customerConfirm = pendingCustomerConfirmations.get(senderPhone);
  if (customerConfirm) {
    if (cleanMessage === 'si' || cleanMessage === 'sí' || cleanMessage === '1') {
      // El cliente acepta hablar con el asesor rezagado
      await pool.query(
        `UPDATE takeover_sessions 
         SET current_agent_phone = $1, interacted_with_agent = TRUE, status = 'active', assigned_at = NOW() 
         WHERE id = $2`,
        [customerConfirm.agentPhone, customerConfirm.sessionId]
      );

      console.log(`[Router] 👤 Cliente ${senderPhone} conectado con asesor rezagado ${customerConfirm.agentName}.`);

      if (sendMessageFn) {
        await sendMessageFn(customerConfirm.agentPhone, `Has reanudado la conversación con el cliente.`);
      }

      pendingCustomerConfirmations.delete(senderPhone);
      return `Conectado con el asesor ${customerConfirm.agentName}.`;
    }

    if (cleanMessage === 'no' || cleanMessage === '2') {
      // El cliente prefiere seguir con la IA
      await pool.query(
        `UPDATE takeover_sessions SET status = 'closed', updated_at = NOW() WHERE id = $1`,
        [customerConfirm.sessionId]
      );

      if (sendMessageFn) {
        await sendMessageFn(customerConfirm.agentPhone, `El cliente prefirió continuar con el Asistente Virtual.`);
      }

      pendingCustomerConfirmations.delete(senderPhone);
      return "¡Perfecto! Continuaremos con el Asistente Virtual (IA). ¿En qué te puedo colaborar ahora?";
    }

    return "Por favor responde 'si' para hablar con el asesor, o 'no' para seguir conmigo.";
  }

  // B.2 Buscar si el cliente tiene una sesión de traspaso activa
  const takeoverRes = await pool.query(
    `SELECT id, status, current_agent_phone, customer_name, interacted_with_agent
     FROM takeover_sessions 
     WHERE client_id = $1 AND customer_phone = $2 AND status IN ('active', 'waiting_fallback') 
     LIMIT 1`,
    [clientId, senderPhone]
  );

  if (takeoverRes.rows.length > 0) {
    const session = takeoverRes.rows[0];
    const customerName = session.customer_name || 'Cliente';

    // B.2.1 El cliente está en el menú de Fallback (nadie contestó en toda la cascada)
    if (session.status === 'waiting_fallback') {
      if (cleanMessage === 'ia') {
        await pool.query(`UPDATE takeover_sessions SET status = 'closed' WHERE id = $1`, [session.id]);
        return "¡Perfecto! He reactivado el Asistente Virtual (IA). ¿En qué te puedo colaborar ahora?";
      }

      if (cleanMessage === 'reintentar' || cleanMessage === 'intentar una vez más' || cleanMessage === 'intentar') {
        // Buscar el primer asesor en línea disponible
        const onlineAgentsRes = await pool.query(
          `SELECT name, phone FROM agent_contacts WHERE client_id = $1 AND status = 'online' ORDER BY priority ASC LIMIT 1`,
          [clientId]
        );

        if (onlineAgentsRes.rows.length > 0) {
          const firstAgent = onlineAgentsRes.rows[0];
          await pool.query(
            `UPDATE takeover_sessions 
             SET status = 'active', current_agent_phone = $1, escalation_index = 0, assigned_at = NOW(), interacted_with_agent = FALSE 
             WHERE id = $2`,
            [firstAgent.phone, session.id]
          );

          if (sendMessageFn) {
            // Enviar alerta al primer asesor
            const alertMsg = `⚠️ *ALERTA:* El cliente +${senderPhone} solicita hablar con un humano.\n\n*Instrucciones del Chat:*\n• Escribe cualquier respuesta aquí para contestarle.\n• Responde */close* para cerrar el traspaso.\n• Responde */out* para ponerte ausente.`;
            await sendMessageFn(firstAgent.phone, alertMsg);
          }

          return "Entendido. Intentaré comunicarte de nuevo, por favor dame dos minutos.";
        } else {
          return "Lo siento, parece que no hay asesores en línea en este momento. Escribe 'IA' para seguir conversando conmigo o 'Llamada' para que te contactemos por teléfono.";
        }
      }

      if (cleanMessage === 'llamada') {
        // Enviar alerta de llamada a todos los asesores en línea
        const onlineAgentsRes = await pool.query(
          `SELECT phone FROM agent_contacts WHERE client_id = $1 AND status = 'online'`,
          [clientId]
        );

        if (sendMessageFn) {
          for (const agent of onlineAgentsRes.rows) {
            await sendMessageFn(agent.phone, `☎️ *SOLICITUD DE LLAMADA:* El cliente +${senderPhone} solicita que lo llamen por teléfono.`);
          }
        }

        await pool.query(`UPDATE takeover_sessions SET status = 'closed' WHERE id = $1`, [session.id]);
        return "Entendido. He registrado tu solicitud de llamada. Un asesor se comunicará contigo lo antes posible. Mientras tanto, he reactivado el Asistente Virtual (IA). ¿Qué deseas consultar?";
      }

      return "El asistente virtual está pausado. Por favor, selecciona una de las opciones: escribe 'IA' para hablar con el bot, 'Reintentar' para intentar de nuevo con un asesor, o 'Llamada' para solicitar que te llamemos.";
    }

    // B.2.2 Sesión de traspaso activa (esperando o platicando con un asesor asignado)
    if (cleanMessage === 'ia') {
      await pool.query(`UPDATE takeover_sessions SET status = 'closed' WHERE id = $1`, [session.id]);
      
      if (sendMessageFn && session.current_agent_phone) {
        await sendMessageFn(session.current_agent_phone, `ℹ️ INFO: El cliente +${senderPhone} ha vuelto a activar el Asistente Virtual (IA) y finalizado la espera.`);
      }

      return "¡Perfecto! He reactivado el Asistente Virtual (IA). ¿En qué te puedo colaborar ahora?";
    }

    // Reenviar el mensaje del cliente al asesor asignado
    if (session.current_agent_phone && sendMessageFn) {
      await sendMessageFn(session.current_agent_phone, `[Cliente +${senderPhone}]: ${messageText}`);
    }

    // Actualizamos el timestamp de la sesión
    await pool.query(
      `UPDATE takeover_sessions SET updated_at = NOW() WHERE id = $1`,
      [session.id]
    );

    return "🤖 El asistente virtual está pausado y tu conversación fue transferida a un asesor humano. Si deseas hablar con el bot de nuevo en cualquier momento, escribe 'IA'.";
  }

  // B.3 Detectar si el cliente solicita explícitamente un humano (Regla semántica rápida antes de Gemini)
  const isRequestingHuman = /\b(humano|asesor|soporte|persona|operador|agente)\b/i.test(messageText);
  if (isRequestingHuman) {
    console.log(`[Router] ⚠️ Cliente ${senderPhone} solicita atención humana. Buscando asesores disponibles.`);

    // Obtener el nombre del cliente desde los appointments previos (si lo hay)
    let customerName = 'Cliente';
    const apptRes = await pool.query(
      `SELECT customer_name FROM appointments WHERE client_id = $1 AND customer_phone = $2 ORDER BY created_at DESC LIMIT 1`,
      [clientId, senderPhone]
    );
    if (apptRes.rows.length > 0) {
      customerName = apptRes.rows[0].customer_name;
    }

    // Buscar el primer asesor en línea del cliente
    const onlineAgentsRes = await pool.query(
      `SELECT name, phone FROM agent_contacts WHERE client_id = $1 AND status = 'online' ORDER BY priority ASC LIMIT 1`,
      [clientId]
    );

    // Buscar si ya existe una sesión previa para este cliente y número
    const existingSessionRes = await pool.query(
      `SELECT id FROM takeover_sessions WHERE client_id = $1 AND customer_phone = $2 LIMIT 1`,
      [clientId, senderPhone]
    );
    const hasExistingSession = existingSessionRes.rows.length > 0;

    if (onlineAgentsRes.rows.length > 0) {
      const firstAgent = onlineAgentsRes.rows[0];

      // Abrir sesión de traspaso activa asignada al primer asesor
      if (hasExistingSession) {
        await pool.query(
          `UPDATE takeover_sessions 
           SET status = 'active', current_agent_phone = $1, escalation_index = 0, assigned_at = NOW(), interacted_with_agent = FALSE, customer_name = $2, updated_at = NOW()
           WHERE client_id = $3 AND customer_phone = $4`,
          [firstAgent.phone, customerName, clientId, senderPhone]
        );
      } else {
        await pool.query(
          `INSERT INTO takeover_sessions (client_id, customer_phone, status, current_agent_phone, escalation_index, assigned_at, interacted_with_agent, customer_name) 
           VALUES ($1, $2, 'active', $3, 0, NOW(), FALSE, $4)`,
          [clientId, senderPhone, firstAgent.phone, customerName]
        );
      }

      // Enviar alerta al primer asesor
      if (sendMessageFn) {
        const alertMsg = `⚠️ *ALERTA:* El cliente +${senderPhone} solicita hablar con un humano.\n\nMensaje: "${messageText}"\n\n*Instrucciones del Chat:*\n• Escribe cualquier respuesta aquí para contestarle.\n• Responde */close* para cerrar el traspaso.\n• Responde */out* para ponerte ausente.`;
        await sendMessageFn(firstAgent.phone, alertMsg);
      }

      return "Entendido. He pausado el asistente virtual y transferido tu conversación a un asesor humano. En un momento te responderá.\n\n*(Si deseas reactivar la IA para seguir conversando con el bot, escribe 'IA' en cualquier momento)*";
    } else {
      // Si no hay ningún asesor en línea disponible en el momento
      if (hasExistingSession) {
        await pool.query(
          `UPDATE takeover_sessions 
           SET status = 'waiting_fallback', current_agent_phone = NULL, escalation_index = -1, assigned_at = NOW(), interacted_with_agent = FALSE, customer_name = $1, updated_at = NOW()
           WHERE client_id = $2 AND customer_phone = $3`,
          [customerName, clientId, senderPhone]
        );
      } else {
        await pool.query(
          `INSERT INTO takeover_sessions (client_id, customer_phone, status, current_agent_phone, escalation_index, assigned_at, interacted_with_agent, customer_name) 
           VALUES ($1, $2, 'waiting_fallback', NULL, -1, NOW(), FALSE, $3)`,
          [clientId, senderPhone, customerName]
        );
      }

      return "Lo siento parece que todos nuestros agentes están ocupados en el momento puedes seguir platicando conmigo o podemos intentarlo una vez más, pero no te preocupes cuando uno de nuestros asesores esté disponible te lo haré saber. ¿Qué deseas hacer? (Responde 'IA', 'Reintentar' o 'Llamada')";
    }
  }

  // --- FLUJO CONVERSACIONAL DE IA ---

  console.log(`[Router] Mensaje ruteado al cliente: ${clientConfig.name} (ID: ${clientConfig.id})`);

  // 3. Instanciar el Agente con la configuración del Cliente
  const agent = new AIAgent(clientConfig);

  // 4. Procesar el mensaje (RAG, LLM, Tools)
  const response = await agent.processMessage(messageText, senderPhone, sendVoiceFn);

  console.log(`[Router] Respuesta generada: ${response}`);

  // 5. Registrar Métricas de la Interacción en la Base de Datos
  try {
    const inputTokens = 0; 
    const outputTokens = 0; 
    const estimatedCost = 0.000000; 

    await pool.query(`
      INSERT INTO interactions (client_id, sender_phone, message_text, response_text, tokens_input, tokens_output, api_cost)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [clientId, senderPhone, messageText, response, inputTokens, outputTokens, estimatedCost]);

  } catch (dbError) {
    console.error('[Router] Error al registrar métricas de interacción:', dbError);
  }

  return response;
};
