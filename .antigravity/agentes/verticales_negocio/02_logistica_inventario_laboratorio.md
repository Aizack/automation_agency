# AGENTE VERTICAL 02: LOGÍSTICA, INVENTARIO, LABORATORIO & DOMICILIOS

## Submódulos Alineados del Menú:
- **Inventario de Productos** (Matriz de variantes, stock, precios)
- **Trabajos de Laboratorio** (Órdenes de montaje, lentes, estados)
- **Despachos y Domicilios** (Rutas, GPS repartidor Speedie Gonzalez)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpInventory.tsx`, `SaaSErpDomicilios.tsx`
- Tablas SQL: `products`, `product_variants`, `lab_jobs`, `deliveries`

## Directrices de Negocio:
1. **Regla de Laboratorio**: Una factura con lentes oftálmicos crea automáticamente una orden de laboratorio en estado "Por Asignar".
2. **Control de Stock**: Prevenir venta de productos sin stock salvo reserva explícita.
