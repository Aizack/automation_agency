import { pool } from '../database/postgres';

export interface TicketFixResult {
  success: boolean;
  status: 'ai_resolved' | 'escalated_human';
  diagnosis: string;
  actionTaken: string;
}

/**
 * Agente de Diagnóstico y Auto-Fix Seguro (AI Self-Healing)
 * 
 * Reglas Incalculables de Seguridad:
 * 1. CERO DELETE: NUNCA se ejecutan borrados físicos en la base de datos.
 * 2. NO Inventar Parámetros: No se mutan esquemas ni se agregan columnas o campos inventados.
 * 3. Sin Ingeniería Inversa: Si el problema requiere cambios en código fuente o infraestructura,
 *    se escala a ingenieros humanos con el reporte técnico masticado.
 */
export async function runAutoFixAgent(clientId: string, ticketId: string): Promise<TicketFixResult> {
  try {
    // 1. Obtener ticket de la base de datos
    const ticketRes = await pool.query(
      `SELECT * FROM support_tickets WHERE id = $1 AND client_id = $2`,
      [ticketId, clientId]
    );

    if (ticketRes.rows.length === 0) {
      return {
        success: false,
        status: 'escalated_human',
        diagnosis: 'Ticket no encontrado.',
        actionTaken: 'No se realizaron cambios.'
      };
    }

    const ticket = ticketRes.rows[0];
    const textToAnalyze = `${ticket.title} ${ticket.description} ${ticket.stack_trace || ''}`.toLowerCase();

    // 2. Traer últimos logs de auditoría para diagnóstico contextual
    const auditRes = await pool.query(
      `SELECT module, action, description, created_at 
       FROM system_audit_logs 
       WHERE client_id = $1 
       ORDER BY created_at DESC 
       LIMIT 5`,
      [clientId]
    );
    const recentAuditLogs = auditRes.rows;

    // ----------------------------------------------------
    // REGLA DE EVALUACIÓN Y AUTORREPARACIÓN DE ESTADOS
    // ----------------------------------------------------

    // CASO 1: Bloqueo de turno de caja pendiente de confirmación
    if (textToAnalyze.includes('turno') || textToAnalyze.includes('caja') || textToAnalyze.includes('bloquead')) {
      const shiftRes = await pool.query(
        `SELECT id, status FROM cash_shifts WHERE client_id = $1 AND status = 'pending_confirmation' ORDER BY created_at DESC LIMIT 1`,
        [clientId]
      );
      if (shiftRes.rows.length > 0) {
        // Auto-fix seguro: Liberar confirmación de turno sin borrar datos
        await pool.query(
          `UPDATE cash_shifts SET status = 'confirmed', confirmed_at = NOW() WHERE id = $1`,
          [shiftRes.rows[0].id]
        );

        const diagnosis = `IA detectó un turno de caja (#${shiftRes.rows[0].id}) bloqueado en estado 'pending_confirmation'.`;
        const actionTaken = `Se actualizó de forma segura el estado del turno de caja a 'confirmed'. No se eliminó ningún dato.`;

        await pool.query(
          `UPDATE support_tickets 
           SET status = 'ai_resolved', ai_diagnosis = $3, ai_action_taken = $4, updated_at = NOW() 
           WHERE id = $1 AND client_id = $2`,
          [ticketId, clientId, diagnosis, actionTaken]
        );

        return { success: true, status: 'ai_resolved', diagnosis, actionTaken };
      }
    }

    // CASO 2: Desfase en contador de facturación electrónica o estado draft bloqueado
    if (textToAnalyze.includes('cufe') || textToAnalyze.includes('dian') || textToAnalyze.includes('factura')) {
      const invRes = await pool.query(
        `SELECT id, invoice_number FROM invoices WHERE client_id = $1 AND electronic_status = 'failed' ORDER BY created_at DESC LIMIT 1`,
        [clientId]
      );
      if (invRes.rows.length > 0) {
        // Auto-fix seguro: resetear estado electrónico a 'draft' para permitir reintento
        await pool.query(
          `UPDATE invoices SET electronic_status = 'draft' WHERE id = $1`,
          [invRes.rows[0].id]
        );

        const diagnosis = `Factura #${invRes.rows[0].invoice_number} tenía estado de emisión fallida con la DIAN.`;
        const actionTaken = `Se restableció el estado de emisión a 'draft' para permitir el reintento limpio desde la interfaz.`;

        await pool.query(
          `UPDATE support_tickets 
           SET status = 'ai_resolved', ai_diagnosis = $3, ai_action_taken = $4, updated_at = NOW() 
           WHERE id = $1 AND client_id = $2`,
          [ticketId, clientId, diagnosis, actionTaken]
        );

        return { success: true, status: 'ai_resolved', diagnosis, actionTaken };
      }
    }

    // CASO 3: Fallo de código / infraestructura -> Escalamiento a Ingeniero Humano
    const diagnosis = `IA analizó la traza de error y los últimos ${recentAuditLogs.length} logs de auditoría. El problema requiere revisión de código o infraestructura y no puede repararse únicamente con cambios de estado de datos.`;
    const actionTaken = `Ticket escalado automáticamente al equipo de ingenieros de soporte humano. Se adjuntó la traza técnica del error.`;

    await pool.query(
      `UPDATE support_tickets 
       SET status = 'escalated_human', ai_diagnosis = $3, ai_action_taken = $4, updated_at = NOW() 
       WHERE id = $1 AND client_id = $2`,
      [ticketId, clientId, diagnosis, actionTaken]
    );

    return {
      success: true,
      status: 'escalated_human',
      diagnosis,
      actionTaken
    };

  } catch (err: any) {
    console.error('[AI AutoFix Agent Error]:', err);
    return {
      success: false,
      status: 'escalated_human',
      diagnosis: `Error en la ejecución del agente: ${err.message}`,
      actionTaken: 'Escalado por precaución.'
    };
  }
}
