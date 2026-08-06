import { pool } from '../database/postgres';

interface ReportarPagoArgs {
    invoiceNumber: string;
    montoPagado: number;
}

export const reportarPagoTool = {
    execute: async (args: ReportarPagoArgs, clientId: string): Promise<string> => {
        const { invoiceNumber, montoPagado } = args;
        try {
            // 1. Buscar la factura
            const res = await pool.query(
                `SELECT id, customer_name, total_amount, status FROM invoices WHERE client_id = $1 AND invoice_number = $2 LIMIT 1`,
                [clientId, invoiceNumber]
            );

            if (res.rows.length === 0) {
                return `Error: No se encontró la factura '${invoiceNumber}' para este negocio.`;
            }

            const invoice = res.rows[0];

            // 2. Registrar el pago (actualizando estado a 'paid')
            await pool.query(
                `UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = $1`,
                [invoice.id]
            );

            const formattedAmount = new Intl.NumberFormat('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0
            }).format(montoPagado);

            return `✅ Pago de ${formattedAmount} registrado exitosamente para la factura ${invoiceNumber} del cliente ${invoice.customer_name}. Estado de la factura actualizado a 'paid' (Pagado).`;
        } catch (err: any) {
            console.error("[Tool ReportarPago] Error:", err);
            return `Error registrando el pago: ${err.message}`;
        }
    }
};
