# Módulo Especializado de Restaurantes & Gastronomía (Diaz Lab Food ERP)

Este documento contiene la **especificación técnica, funcional y de arquitectura operativa** para el módulo de Restaurantes, Bares, Cocinas Ocultas y Comiderías. Sirve como documento base permanente del sistema.

---

## 1. Arquitectura General y Flujo de Información

El módulo conecta en tiempo real los cuatro puntos neurálgicos de la operación gastronómica:

```
[ Cliente (QR / WhatsApp) ] ──> [ Comandero Móvil (Mesero) ] ──> [ Pantalla KDS (Cocina/Barra) ] ──> [ Caja POS & DIAN ]
```

1. **Cliente / QR de Mesa**: Acceso al menú interactivo digital o atención automatizada por WhatsApp.
2. **Mesero / Comandero**: Recepción de la solicitud, validación, adición de modificadores y envío a cocina.
3. **Cocina / Barra (KDS)**: Recepción de comandas en pantallas digitales clasificadas por estación (Cocina vs. Barra) con temporizador.
4. **Caja Central**: Facturación POS 80mm, cobro con sugerencia de propina del 10% y emisión de Factura Electrónica DIAN.

---

## 2. Especificación de Funcionalidades

### A. Gestión de Inventarios e Insumos (Recetario / BOM)
- **Doble Inventario**:
  - **Insumos / Materia Prima**: Unidades de medida primarias (gramos, mililitros, unidades crudas).
  - **Menú / Productos Terminados**: Platos del menú comercial.
- **Descuento Automático**: Al vender 1 unidad de un plato del menú, el sistema descuenta de la bodega los insumos configurados en su receta (BOM - Bill of Materials).
- **Alertas de Stock Crítico**: Notificación automática cuando un insumo básico cae por debajo del nivel mínimo de reabastecimiento.

### B. Mapa de Mesas & Comandero Móvil de Meseros
- **Mapa por Zonas**: Visualización gráfica del estado de mesas (Libre, Ocupada, Esperando Comida, Solicitó Cuenta).
- **Toma de Pedido Táctil**: Selección de ítems en 3 toques.
- **Personalización de Platos (Modificadores)**:
  - **Remociones (Sin Costo)**: Notas de cocina (ej. *"Sin cebolla"*, *"Término 3/4"*).
  - **Adicionales (Con Costo)**: Ingredientes extra con precio adicional (ej. *"Tocineta extra +$4.000"*).
- **Notificación de Entrega**: Alerta en la pantalla del mesero cuando la cocina marca un plato como *"Listo"*.

### C. Pantallas de Cocina y Barra (KDS - Kitchen Display System)
- **Separación de Estaciones**: Las comandas de alimentos se envían a la Pantalla de Cocina (Chef) y las bebidas/cócteles a la Pantalla de Barra (Bartender).
- **Semáforo de Tiempo de Preparación**:
  - 🟢 **Verde**: 0 - 8 minutos.
  - 🟡 **Amarillo**: 8 - 14 minutos.
  - 🔴 **Rojo**: +15 minutos (Alerta de demora).
- **Acción de Estado**: Botón táctil *"Iniciar Preparación"* y *"Marcar Listo"*.

### D. Punto de Venta (POS) & Políticas de Pago
- **Cobro Flexible**:
  - *Modo Autoservicio / Comida Rápida*: Pago previo al envío a cocina.
  - *Modo Restaurante Tradicional*: Pago al finalizar el servicio.
- **División de Cuentas**: División equitativa o por consumos individuales.
- **Propina Voluntaria del 10%**: Sugerida automáticamente sobre el subtotal, con opción de modificar o exonerar a solicitud del cliente.
- **Facturación**: Impresión en tiquete térmico 80mm y emisión de Factura Electrónica DIAN con CUFE y QR.

### F. Recetario Digital e Instructivo Técnico de Preparación (SOP / Secret Recipe - Planes Avanzados)
- **Ficha Técnica del Plato**: Espacio donde el propietario o Chef Ejecutivo almacena el procedimiento paso a paso de preparación de cada plato.
- **Estandarización de Sabor**: Incluye fotos del emplatado final, secretos de sazón, temperaturas de cocción y tiempos exactos.
- **Continuidad Operativa**: Si el restaurante cambia de cocinero o contrata personal nuevo, el empleado consulta el instructivo desde su pantalla KDS/Tablet y replica la receta manteniendo exactamente la esencia, presentación y calidad del restaurante.

### G. Creación de Menú Digital & Gramaje por Insumo (BOM por Peso)
- **Formulario de Creación de Plato**: Nombre, categoría del menú (Entradas, Fuertes, Bebidas, Postres), precio comercial, foto y descripción.
- **Desglose en Gramos / ML**: El usuario ingresa la cantidad exacta en gramos, mililitros o unidades de cada insumo que compone el plato (ej. *200g Carne de Res, 40g Queso, 150g Papas*).
- **Guía de Inventario**: Leyenda informativa recomendando ingresar el peso exacto para garantizar el descuento automático del inventario de insumos comprado por Libra o Kilogramo.

### H. Historial de Variación de Precios de Insumos & Estrategia de Margen
- **Bitácora Volátil de Costos**: Cada vez que se registra una compra o cambia el costo de un insumo (ej. subida en la carne o verduras), el sistema guarda un registro en el historial (`raw_material_price_history`).
- **Análisis de Impacto en Utilidad**: Al subir el costo de un insumo, el módulo de planeación analiza 3 alternativas estratégicas:
  1. *Conservar Precio de Venta*: Evalúa la pérdida de porcentaje de margen (ej. baja del 45% al 38%) y alerta si está en rango aceptable.
  2. *Ajuste de Precio Comercial*: Sugiere el nuevo precio de venta recomendado para mantener el margen neto objetivo.
  3. *Porcionado Inteligente (Shrinkflation Controlada)*: Recomienda el ajuste exacto en gramos por plato para conservar el precio final sin sacrificar rentabilidad.

---

## 3. Matriz de Roles y Permisos por Sector

Cuando una empresa tiene la categoría `restaurante`, el **Portal de Empleados** ajusta la interfaz según el rol:

| Rol | Perfil de Pantalla | Permisos Principales |
|---|---|---|
| 🍽️ **`mesero`** | Comandero Móvil | Mapa de mesas, toma de comandas, notas/modificadores, estado de platos, propinas del turno. |
| 👨‍🍳 **`cocinero`** | Pantalla KDS Cocina | Visualización de comandas de comida, notas de preparación, temporizador, marca de listo. |
| 🍹 **`bartender`** | Pantalla KDS Barra | Comandas de bebidas, licores y cócteles. |
| 💵 **`caja`** | POS Express | Cierre de cuentas, propinas, impresión 80mm, emisión DIAN, arqueo de caja. |
| 🤵 **`capitan_meseros`** | Panel Salón | Supervisión de zonas, reasignación de mesas y anulación autorizada de ítems. |
| 🛵 **`delivery`** | App Domiciliario | Hojas de ruta de entregas, navegación GPS y cobro contra-entrega. |
| 👑 **`admin`** | ERP General | Control total de menús, recetas (BOM), ventas, márgenes, propinas y auditoría. |

---

## 4. Estructura de Datos (Esquema de Migración)

- `restaurant_tables`: id, client_id, table_number, zone, capacity, status (`free`, `occupied`, `waiting_food`, `billing`).
- `product_recipes`: id, client_id, product_id (plato), raw_product_id (insumo), quantity_required, unit_of_measure.
- `kitchen_orders`: id, client_id, table_id, invoice_id, station (`kitchen` / `bar`), status (`pending`, `in_preparation`, `ready`), prep_time_minutes, created_at.
- `dish_modifiers`: id, kitchen_order_item_id, type (`removal` / `addition`), name, extra_price.
- `raw_material_price_history`: id, client_id, product_id, previous_cost, new_cost, changed_at, supplier_id.

---

## 5. Estudio de Viabilidad: Marketplace B2B de Proveedores para Restaurantes (Red Mayorista B2B)

### A. Concepto del Proyecto
Una vitrina o mercado público virtual integrado dentro de Diaz Lab ERP donde **proveedores mayoristas** (distribuidores de carnes, verduras, lácteos, empaques y licores) pueden ofertar directamente sus insumos a los restaurantes afiliados a la plataforma.

### B. Análisis de Viabilidad & Estrategias de Ingreso (Monetización)

1. **Estrategia A (Monetización por Comisión B2B)**:
   - Los restaurantes emiten sus Órdenes de Compra directamente dentro del ERP hacia los proveedores conectados.
   - Diaz Lab cobra un **% de comisión por transacción al proveedor mayorista** (ej. 2% - 4% sobre la orden), generando un flujo de ingresos recurrente masivo sin cobrarle extra al restaurante.

2. **Estrategia B (Plus de Adquisición / Imán de Clientes - Freemium)**:
   - Ofrecer el Marketplace de Insumos con **Descuentos Exclusivos Negociados por Volumen** para los restaurantes clientes.
   - Sirve como argumento comercial imbatible: *"Al usar Diaz Lab ERP, ahorras un 12% en tus compras semanales de carne y vegetales a través de nuestra red de proveedores aliados, lo que paga solo la suscripción del ERP"*.

3. **Estrategia C (Inventario Automatizado & Auto-Reabastecimiento)**:
   - Cuando un restaurante llega al stock mínimo de un insumo (ej. quedan menos de 5 kg de carne), el ERP genera una sugerencia automática de orden de compra con el proveedor mayorista de mejor precio en la red.

---

*Diaz Lab Food ERP — Especificación Técnica y Estratégica del Módulo Gastronómico.*
