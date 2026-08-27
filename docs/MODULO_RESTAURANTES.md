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

---

*Diaz Lab Food ERP — Especificación Técnica del Módulo Gastronómico.*
