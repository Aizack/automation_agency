import { pool } from '../database/postgres';

let pollerInterval: NodeJS.Timeout | null = null;

export const startEscalationService = (
    sendMessageFn: (to: string, text: string) => Promise<any>
) => {
    if (pollerInterval) return;

    console.log("[Escalation Service] 🕒 Servicio de escalamiento en cascada iniciado.");

    pollerInterval = setInterval(async () => {
        try {
            // Buscar sesiones de traspaso que lleven más de 1 minuto sin interacción del agente
            const sessionsRes = await pool.query(`
                SELECT id, client_id, customer_phone, escalation_index, current_agent_phone, customer_name
                FROM takeover_sessions
                WHERE status = 'active'
                  AND interacted_with_agent = FALSE
                  AND assigned_at < NOW() - INTERVAL '1 minute'
            `);

            for (const session of sessionsRes.rows) {
                const clientId = session.client_id;
                const customerPhone = session.customer_phone;
                const customerName = session.customer_name || 'Cliente';
                const currentAgentPhone = session.current_agent_phone;

                // Obtener todos los asesores en línea del cliente ordenados por prioridad
                const agentsRes = await pool.query(`
                    SELECT name, phone, priority 
                    FROM agent_contacts
                    WHERE client_id = $1 AND status = 'online'
                    ORDER BY priority ASC
                `, [clientId]);

                const onlineAgents = agentsRes.rows;

                if (onlineAgents.length === 0) {
                    // Si no hay asesores en línea, ir a fallback inmediatamente
                    console.log(`[Escalation] ⚠️ No hay asesores en línea para el cliente ${clientId}. Ruteando a fallback.`);
                    const finalMsg = "Lo siento parece que todos nuestros agentes están ocupados en el momento puedes seguir platicando conmigo o podemos intentarlo una vez más, pero no te preocupes cuando uno de nuestros asesores esté disponible te lo haré saber. ¿Qué deseas hacer? (Responde 'IA', 'Reintentar' o 'Llamada')";
                    await sendMessageFn(customerPhone, finalMsg);
                    await pool.query(`
                        UPDATE takeover_sessions 
                        SET status = 'waiting_fallback', current_agent_phone = NULL, escalation_index = -1 
                        WHERE id = $1
                    `, [session.id]);
                    continue;
                }

                // Encontrar la posición del agente actual en la lista en línea
                const currentIndex = onlineAgents.findIndex(a => a.phone === currentAgentPhone);
                const nextIndex = currentIndex + 1;

                if (nextIndex < onlineAgents.length) {
                    // Hay un siguiente asesor en la lista
                    const nextAgent = onlineAgents[nextIndex];
                    
                    console.log(`[Escalation] 🔄 Escalando cliente ${customerPhone} de ${currentAgentPhone || 'Ninguno'} a ${nextAgent.name} (${nextAgent.phone})`);

                    // 1. Notificar al asesor anterior
                    if (currentAgentPhone) {
                        const alertPrevAgent = `El cliente ${customerPhone} llamado ${customerName} quiere contactarse con humano como no respondistes contactaré al siguiente en la lista de agentes humanos que es ${nextAgent.name} si quieres intentar contestar responde este mensaje para reanudar la conversación con el cliente`;
                        await sendMessageFn(currentAgentPhone, alertPrevAgent).catch(err => 
                            console.error(`[Escalation] Error enviando alerta a asesor anterior ${currentAgentPhone}:`, err)
                        );
                    }

                    // 2. Notificar al cliente
                    const alertCustomer = "Lo siento, parece que nuestro primer asesor no está disponible te comunicaré con el siguiente por favor dame dos minutos";
                    await sendMessageFn(customerPhone, alertCustomer).catch(err => 
                        console.error(`[Escalation] Error enviando alerta al cliente ${customerPhone}:`, err)
                    );

                    // 3. Alertas al nuevo asesor
                    const alertNextAgent = `⚠️ *ALERTA:* El cliente +${customerPhone} solicita hablar con un humano.\n\n*Instrucciones del Chat:*\n• Escribe cualquier respuesta aquí para contestarle.\n• Responde */close* para cerrar el traspaso.\n• Responde */out* para ponerte ausente.`;
                    await sendMessageFn(nextAgent.phone, alertNextAgent).catch(err => 
                        console.error(`[Escalation] Error enviando alerta al siguiente asesor ${nextAgent.phone}:`, err)
                    );

                    // 4. Actualizar estado de la sesión en la base de datos
                    await pool.query(`
                        UPDATE takeover_sessions 
                        SET current_agent_phone = $1, escalation_index = $2, assigned_at = NOW()
                        WHERE id = $3
                    `, [nextAgent.phone, nextIndex, session.id]);

                } else {
                    // Se llegó al final de la lista de asesores sin respuesta
                    console.log(`[Escalation] 🏁 Fin de la lista de asesores para el cliente ${customerPhone}. Ofreciendo fallback.`);
                    
                    const finalMsg = "Lo siento parece que todos nuestros agentes están ocupados en el momento puedes seguir platicando conmigo o podemos intentarlo una vez más, pero no te preocupes cuando uno de nuestros asesores esté disponible te lo haré saber. ¿Qué deseas hacer? (Responde 'IA', 'Reintentar' o 'Llamada')";
                    await sendMessageFn(customerPhone, finalMsg).catch(err => 
                        console.error(`[Escalation] Error enviando mensaje de fallback al cliente ${customerPhone}:`, err)
                    );

                    // Poner sesión en estado 'waiting_fallback'
                    await pool.query(`
                        UPDATE takeover_sessions 
                        SET status = 'waiting_fallback', current_agent_phone = NULL, escalation_index = -1
                        WHERE id = $1
                    `, [session.id]);
                }
            }
        } catch (error) {
            console.error("[Escalation Service] Error en ciclo de escalamiento:", error);
        }
    }, 15000); // Ejecutar cada 15 segundos
};

export const stopEscalationService = () => {
    if (pollerInterval) {
        clearInterval(pollerInterval);
        pollerInterval = null;
        console.log("[Escalation Service] 🛑 Servicio de escalamiento en cascada detenido.");
    }
};
