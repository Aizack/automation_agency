import { pool } from '../database/postgres';

interface ConsultarEstadoCuentaArgs {
    clienteName?: string;
    documentNumber?: string;
}

export const consultarEstadoCuentaTool = {
    execute: async (args: ConsultarEstadoCuentaArgs, clientId: string): Promise<string> => {
        const { clienteName, documentNumber } = args;
        try {
            let query = `
                SELECT id, invoice_number, customer_name, customer_phone, total_amount, status, due_date 
                FROM invoices 
                WHERE client_id = $1
            `;
            const params: any[] = [clientId];

            if (documentNumber) {
                params.push(documentNumber);
                query += ` AND customer_document_number = $${params.length}`;
            } else if (clienteName) {
                params.push(`%${clienteName}%`);
                query += ` AND customer_name ILIKE $${params.length}`;
            } else {
                // Si no se filtra por cliente, traer pendientes y vencidas
                query += ` AND status IN ('pending', 'overdue')`;
            }

            query += ` ORDER BY due_date ASC LIMIT 10`;

            const res = await pool.query(query, params);

            if (res.rows.length === 0) {
                return "No se encontraron facturas pendientes o en mora.";
            }

            let responseText = "📊 *Estado de Cuenta / Cartera:* \n\n";

            const formattedInvoices = res.rows.map(inv => {
                const formattedDueDate = new Date(inv.due_date).toLocaleDateString('es-CO');
                const formattedAmount = new Intl.NumberFormat('es-CO', {
                    style: 'currency', currency: 'COP', minimumFractionDigits: 0
                }).format(parseFloat(inv.total_amount));
                
                const statusEmoji = inv.status === 'overdue' ? '🔴 MORA' : '🟡 PENDIENTE';
                return `🧾 *Factura ${inv.invoice_number}* - ${inv.customer_name}\n  💵 Monto: ${formattedAmount}\n  📅 Vence: ${formattedDueDate}\n  🏷️ Estado: ${statusEmoji}`;
            }).join('\n\n');

            responseText += formattedInvoices;

            // Si es consulta general, agregar el total de la cartera activa
            if (!clienteName && !documentNumber) {
                const sumRes = await pool.query(
                    `SELECT status, SUM(total_amount) as total FROM invoices WHERE client_id = $1 GROUP BY status`,
                    [clientId]
                );
                
                let summaryStr = "\n\n📈 *Resumen General de Cartera:*";
                sumRes.rows.forEach(r => {
                    const formattedTotal = new Intl.NumberFormat('es-CO', {
                        style: 'currency', currency: 'COP', minimumFractionDigits: 0
                    }).format(parseFloat(r.total || '0'));
                    summaryStr += `\n• Total ${r.status === 'overdue' ? 'en Mora 🔴' : 'Pendiente 🟡'}: ${formattedTotal}`;
                });
                responseText += summaryStr;
            }

            return responseText;
        } catch (err: any) {
            console.error("[Tool ConsultarEstadoCuenta] Error:", err);
            return `Error consultando estado de cuenta: ${err.message}`;
        }
    }
};
