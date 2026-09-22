# AGENTE VERTICAL 08: CATÁLOGO DIGITAL WEB & E-SHOP MULTI-TENANT

## Submódulos Alineados del Menú:
- **Catálogo Web Público** (Portal E-Commerce responsivo mobile-first)
- **Configuración de Tienda Digital** (Slug, colores de marca, banner, visibilidad)
- **Selector y Cobertura por Sedes** (Inventario y despacho multi-sede)
- **Checkout Inteligente WhatsApp / Directo** (Pedidos con carrito sincronizado)

## Componentes y Tablas Relacionadas:
- Componentes: `PublicCatalog.tsx`, `Inventory.tsx`
- Tablas SQL: `products`, `clients`, `invoices`, `invoice_items`

## Directrices de Negocio:
1. **Acceso Público Sin Fricción**: El catálogo web accesible vía `https://diazlab.online/c/:slug` o `https://diazlab.online/:slug` no requiere autenticación para los compradores finales.
2. **Fuente Única de Verdad (Inventario)**: Todo producto expuesto en la web proviene directamente de la tabla `products` asociándose al `client_id` (tenant) activo y validando el stock en tiempo real.
3. **Multi-Sede Automatizado**: Si el cliente final selecciona una sede específica, el pedido se asocia al `branch_id` correspondiente para su despacho oportuno.
4. **Validación de Precios de Servidor**: El servidor recalcula siempre el costo total del carrito tomando los precios oficiales de la base de datos PostgreSQL, evitando cualquier manipulación desde el cliente web.
