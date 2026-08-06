import { pool } from '../database/postgres';

interface ConsultarInventarioArgs {
    sku?: string;
    busqueda?: string;
}

export const consultarInventarioTool = {
    execute: async (args: ConsultarInventarioArgs, clientId: string): Promise<string> => {
        const { sku, busqueda } = args;
        try {
            let query = `SELECT name, sku, description, price, stock FROM products WHERE client_id = $1`;
            const params: any[] = [clientId];

            if (sku) {
                params.push(sku);
                query += ` AND sku = $${params.length}`;
            } else if (busqueda) {
                params.push(`%${busqueda}%`);
                query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
            }

            query += ` ORDER BY name ASC LIMIT 10`;

            const res = await pool.query(query, params);

            if (res.rows.length === 0) {
                return "No se encontraron productos en el inventario que coincidan con la búsqueda.";
            }

            const formattedProducts = res.rows.map(p => {
                const formattedPrice = new Intl.NumberFormat('es-CO', {
                    style: 'currency', currency: 'COP', minimumFractionDigits: 0
                }).format(parseFloat(p.price));
                return `📦 *${p.name}* (SKU: ${p.sku || 'N/A'})\n  💵 Precio: ${formattedPrice}\n  🔋 Stock: ${p.stock} uds\n  📝 ${p.description || 'Sin descripción'}`;
            }).join('\n\n');

            return `📋 *Catálogo / Inventario:* \n\n${formattedProducts}`;
        } catch (err: any) {
            console.error("[Tool ConsultarInventario] Error:", err);
            return `Error consultando inventario: ${err.message}`;
        }
    }
};
