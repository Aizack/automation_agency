import { ERPBridgeService } from '../services/erpBridgeService';

interface ConsultarEstadoCuentaArgs {
    clienteName?: string;
    documentNumber?: string;
}

export const consultarEstadoCuentaTool = {
    execute: async (args: ConsultarEstadoCuentaArgs, clientId: string): Promise<string> => {
        try {
            const result = await ERPBridgeService.consultarEstadoCuenta(clientId, args);
            if (!result.success) {
                return `Error consultando estado de cuenta: ${result.error}`;
            }

            if (!result.invoices || result.invoices.length === 0) {
                return "No se encontraron facturas pendientes o en mora.";
            }

            let responseText = "📊 *Estado de Cuenta / Cartera:* \n\n";

            const formattedInvoices = result.invoices.map(inv => {
                const formattedDueDate = inv.fechaVencimiento ? new Date(inv.fechaVencimiento).toLocaleDateString('es-CO') : 'N/A';
                const formattedAmount = new Intl.NumberFormat('es-CO', {
                    style: 'currency', currency: 'COP', minimumFractionDigits: 0
                }).format(inv.saldoPendiente > 0 ? inv.saldoPendiente : inv.montoTotal);
                
                const statusEmoji = inv.estado === 'overdue' ? '🔴 MORA' : '🟡 PENDIENTE';
                return `🧾 *Factura ${inv.numeroFactura}* - ${inv.cliente}\n  💵 Monto: ${formattedAmount}\n  📅 Vence: ${formattedDueDate}\n  🏷️ Estado: ${statusEmoji}`;
            }).join('\n\n');

            responseText += formattedInvoices;
            return responseText;
        } catch (err: any) {
            console.error("[Tool ConsultarEstadoCuenta] Error:", err);
            return `Error consultando estado de cuenta: ${err.message}`;
        }
    }
};
