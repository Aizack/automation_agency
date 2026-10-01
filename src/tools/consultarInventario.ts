import { ERPBridgeService } from '../services/erpBridgeService';

interface ConsultarInventarioArgs {
    sku?: string;
    busqueda?: string;
}

export const consultarInventarioTool = {
    execute: async (args: ConsultarInventarioArgs, clientId: string): Promise<string> => {
        try {
            const result = await ERPBridgeService.consultarInventario(clientId, args);
            if (!result.success) {
                return `Error consultando inventario: ${result.error}`;
            }

            if (!result.items || result.items.length === 0) {
                return "No se encontraron productos en el inventario que coincidan con la búsqueda.";
            }

            const formattedProducts = result.items.map(p => {
                const formattedPrice = new Intl.NumberFormat('es-CO', {
                    style: 'currency', currency: 'COP', minimumFractionDigits: 0
                }).format(p.precio);
                return `📦 *${p.nombre}* (SKU: ${p.sku || 'N/A'})\n  💵 Precio: ${formattedPrice}\n  🔋 Stock: ${p.stock} uds\n  📝 ${p.descripcion || 'Sin descripción'}`;
            }).join('\n\n');

            return `📋 *Catálogo / Inventario:* \n\n${formattedProducts}`;
        } catch (err: any) {
            console.error("[Tool ConsultarInventario] Error:", err);
            return `Error consultando inventario: ${err.message}`;
        }
    }
};
