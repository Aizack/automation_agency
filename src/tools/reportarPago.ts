import { ERPBridgeService } from '../services/erpBridgeService';

interface ReportarPagoArgs {
    invoiceNumber: string;
    montoPagado: number;
}

export const reportarPagoTool = {
    execute: async (args: ReportarPagoArgs, clientId: string): Promise<string> => {
        try {
            const result = await ERPBridgeService.reportarPago(clientId, args);
            if (!result.success) {
                return `Error: ${result.error}`;
            }

            const formattedAmount = new Intl.NumberFormat('es-CO', {
                style: 'currency', currency: 'COP', minimumFractionDigits: 0
            }).format(result.montoAbonado || 0);

            return `✅ Pago de ${formattedAmount} registrado exitosamente para la factura ${result.invoiceNumber}. Estado actualizado a '${result.nuevoEstado}'.`;
        } catch (err: any) {
            console.error("[Tool ReportarPago] Error:", err);
            return `Error registrando el pago: ${err.message}`;
        }
    }
};
