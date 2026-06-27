/**
 * Herramienta (Tool) para que el Agente pueda procesar ventas / crear pedidos.
 */
export const crearPedidoTool = {
    name: "crear_pedido",
    description: "Utiliza esta herramienta cuando el usuario quiera confirmar un pedido de comida o compra de producto.",
    parameters: {
        type: "object",
        properties: {
            producto: { type: "string", description: "El nombre del producto solicitado" },
            cantidad: { type: "number", description: "La cantidad solicitada" }
        },
        required: ["producto", "cantidad"]
    },
    execute: async (args: { producto: string, cantidad: number }) => {
        console.log(`[Tool Ejecutada] 🍕 Procesando venta: ${args.cantidad}x ${args.producto}`);
        // Aquí iría la lógica para enviar esto a un POS, Shopify, o base de datos de pedidos
        return `Éxito: Pedido de ${args.cantidad}x ${args.producto} ha sido creado y enviado a cocina/inventario.`;
    }
};