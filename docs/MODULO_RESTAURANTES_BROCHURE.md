# 🍔 Diaz Lab Food ERP — Sistema de Gestión y Automatización para Restaurantes

## 🚀 La Solución Integral Todo-en-Uno para Restaurantes, Cocinas Ocultas, Bares y Comiderías

**Diaz Lab Food ERP** es una plataforma SaaS de última generación que conecta en tiempo real a tus **Clientes**, **Meseros**, **Cocina/Barra**, **Domiciliarios** y **Caja Central**, eliminando la demora en el servicio, reduciendo desperdicios de insumos y aumentando las ventas de tu establecimiento.

---

## ⭐️ 1. Propuesta de Valor Comercial (Brochure de Ventas)

### 💥 Beneficios Clave para tu Restaurante:

1. **⚡ Reducción del Tiempo de Espera en 40%**: Comandas enviadas a cocina en milisegundos desde el QR de la mesa o la tablet del mesero.
2. **📈 Incremento del Ticket Promedio en 25%**: El menú digital sugiere automáticamente adicionales (tocineta, queso extra, bebidas, postres) y maridajes en el momento preciso.
3. **🥩 Control Real de Inventario de Insumos (Recetario / BOM)**: Cada plato vendido descuenta gramos de carne, unidades de pan o mililitros de salsa de tu bodega, evitando fugas y robo hormiga.
4. **📲 Bot de WhatsApp IA para Domicilios a $0 Costo de API**: Toma pedidos a domicilio las 24 horas del día, muestra el menú con fotos, calcula el costo con envío y notifica al cliente sin pagar comisiones a aplicaciones de terceros (Rappi/Ifood).
5. **💵 Control de Propina Voluntaria y Métricas por Mesero**: Transparencia total en el recaudo diario de propinas y ranking de eficiencia de atención.

---

## 🔄 2. El Flujo Operativo Inteligente (Paso a Paso)

```
[ Cliente en Mesa / WhatsApp ] ──> [ Comandero Móvil Mesero ] ──> [ Pantalla KDS Cocina / Barra ] ──> [ Caja / Factura POS ]
         │                                    │                                 │                              │
   Escanea QR de Mesa                  Valida o Toma Orden               Semáforo de Tiempo               Imprime Tiquete 80mm
   Arma su Pedido                     Confirma Modificaciones             Marcar "Listo"                   Propina 10% + DIAN
```

### 📍 A. Experiencia del Cliente en Mesa (Menú Interactivo QR)
- Cada mesa cuenta con un código QR único (ej. `Mesa #4`).
- Al escanear el QR con su celular, el cliente accede al menú digital sin descargar aplicaciones.
- Puede solicitar el pedido directamente o llamar al mesero con un toque.

### 🍽️ B. Comandero Móvil para Meseros (Tablet / Celular)
- Los meseros ingresan a su perfil con un PIN personal.
- Visualizan el mapa de mesas por zonas (Terraza, Salón Principal, Barra) con código de colores:
  - 🟢 **Verde**: Mesa Libre.
  - 🔴 **Rojo**: Mesa Ocupada.
  - 🟡 **Amarillo**: Esperando Comida.
  - 🔵 **Azul**: Solicitó Cuenta.
- **Toma de Pedido Táctil**: Selecciona platos, aplica remociones sin costo (*"Sin cebolla"*, *"Término 3/4"*) o adicionales con costo (*"Tocineta extra +$4.000"*).
- Notificación sonora instantánea cuando la cocina marca *"Plato Listo para Servir"*.

### 👨‍🍳 C. Pantalla de Cocina y Barra KDS (Kitchen Display System)
- Reemplaza el desorden de los papeles en cocina por una pantalla táctil o tablet resistente.
- **Diferenciación Inteligente**: Las comandas de comida van a la pantalla del Chef y las bebidas/cócteles a la pantalla del Bartender.
- **Semáforo de Tiempos de Preparación**:
  - 🟢 **0 - 8 minutos**: Preparación dentro de tiempo.
  - 🟡 **8 - 14 minutos**: Alerta media.
  - 🔴 **+15 minutos**: Alerta de demora crítica (parpadeo de advertencia).
- Al finalizar, el cocinero toca el botón *"Marcar Listo"*, notificando al mesero responsable.

### 🧾 D. Punto de Venta (POS) & Facturación Electrónica DIAN
- Cierre de cuentas rápido por mesa.
- **División de Cuentas**: Permite dividir la cuenta entre N personas o pagar por ítems consumidos.
- **Sugerencia de Propina del 10%**: Calculada automáticamente sobre el subtotal de consumo (modificable/removible según la preferencia del cliente).
- Impresión instantánea en tiquetes térmicos de 80mm y emisión de **Factura Electrónica DIAN** con código CUFE y QR.

### 🛵 E. Domicilios & Hojas de Ruta por Cercanía
- Recepción de pedidos vía WhatsApp Bot.
- Organización de repartos por **ruta geográfica más cercana**.
- Los domiciliarios ( Speedie ) cuentan con botón directo para **abrir la ruta en Google Maps** y confirmar cobros en efectivo contra-entrega o comprobantes de transferencia Nequi/Bancolombia.

---

## 📦 3. Desglose de Módulos e Inventarios (Recetario / BOM)

```
PLATO DEL MENÚ: "Hamburguesa Especial" ($28.000 COP)
└── RECETA / BOM (Descuento de Insumos de Bodega):
    ├── 200g Carne Angus Prime
    ├── 1 Pan Brioche Artesanal
    ├── 50g Queso Cheddar
    ├── 30g Tocineta Ahumada
    └── 150g Papa a la Francesa
```

- **Manejo Doble de Inventario**:
  - **Inventario Insumos / Materia Prima**: Gramos, mililitros, unidades crudas.
  - **Inventario Comercial (Menú)**: Platos preparados, bebidas embotelladas, postres.
- **Alertas de Stock Crítico**: El sistema notifica al administrador cuando un insumo básico (ej. queso, papas, café) cae por debajo del mínimo para reabastecer a tiempo.

---

## 👥 4. Matriz de Roles y Accesos para Restaurantes

| Rol | Perfil / Dispositivo | Funciones y Permisos |
|---|---|---|
| 🤵 **Capitán de Meseros** | Tablet / Celular | Supervisión de salón, reasignación de mesas, cancelación o modificación de comandas. |
| 🍽️ **Mesero** | Celular / Tablet | Mapa de mesas, comandero táctil, remociones/adicionales, reporte de propinas del turno. |
| 👨‍🍳 **Cocinero / Chef** | Tablet Cocina KDS | Visualización de comandas de alimentos, notas de preparación, temporizador y marca de *"Listo"*. |
| 🍹 **Bartender** | Tablet Barra KDS | Comandas exclusivas de tragos, cócteles, jugos y bebidas. |
| 💵 **Cajero / Caja** | PC / Tablet POS | Cobro de cuentas, liquidación de propinas, impresión de tiquetes 80mm, emisión DIAN y arqueo de caja. |
| 🛵 **Domiciliario** | Celular Móvil | Ruta de entregas, navegación en Google Maps y confirmación de cobro contra-entrega. |
| 👑 **Administrador** | PC / Laptop | Reportes de ventas, costo de recetas, métricas de tiempo de cocina, propinas globales y auditoría. |

---

## 📊 5. Reportes y Métricas Operativas para el Propietario

1. **Platos Más Vendidos & Margen de Ganancia (Ingeniería de Menú)**.
2. **Promedio de Tiempo de Servicio por Cocinero y Tipo de Plato**.
3. **Ventas y Propinas Recaudadas por Mesero en el Día**.
4. **Informe de Desperdicios y Consumo de Insumos**.
5. **Bitácora de Auditoría Zero-Trust**: Registro de anulaciones, cortes de caja y cambios en comandas.

---

*Documento preparado por Diaz Lab Automation — Soluciones de Ingeniería de Software & ERP Multi-Tenant.*
