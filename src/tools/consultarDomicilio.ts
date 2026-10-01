import { ERPBridgeService } from '../services/erpBridgeService';

interface ConsultarDomicilioArgs {
    invoiceNumber?: string;
    orderId?: string;
}

export const consultarDomicilioTool = {
    execute: async (args: ConsultarDomicilioArgs, clientId: string): Promise<string> => {
        try {
            const result = await ERPBridgeService.consultarDomicilio(clientId, args);
            if (!result.success) {
                return `Error consultando domicilio: ${result.error}`;
            }

            if (result.count === 0 || !result.deliveryId) {
                return result.message || "No se encontró un registro de domicilio o envío registrado para este documento.";
            }

            const stateMap: Record<string, string> = {
                pending: '⏳ Pendiente de despacho',
                assigned: '🚴 Repartidor asignado',
                in_transit: '🚚 En camino',
                delivered: '✅ Entregado',
                failed: '❌ Intento de entrega fallido'
            };

            const estadoLabel = stateMap[result.estadoEnvio] || result.estadoEnvio;

            let response = `🛵 *Estado de Envío / Domicilio:* \n\n`;
            response += `🧾 Factura: *${result.factura || 'N/A'}*\n`;
            response += `📦 Estado: *${estadoLabel}*\n`;
            response += `👤 Repartidor: ${result.repartidor}\n`;
            if (result.telefonoRepartidor && result.telefonoRepartidor !== 'N/A') {
                response += `📞 Teléfono Repartidor: ${result.telefonoRepartidor}\n`;
            }
            if (result.direccion) {
                response += `📍 Dirección de entrega: ${result.direccion}\n`;
            }
            if (result.linkRastreo) {
                response += `🔗 Rastreo en tiempo real: ${result.linkRastreo}\n`;
            }

            return response;
        } catch (err: any) {
            console.error("[Tool ConsultarDomicilio] Error:", err);
            return `Error consultando domicilio: ${err.message}`;
        }
    }
};
