# 🚚 Módulo de Domicilios, Rutas y Panel de Repartidor (Speedie Gonzalez)

## 📋 Resumen Ejecutivo
Este módulo gestiona la logística integral de entregas a domicilio para empresas de retail, ópticas y servicios. Permite asignar facturas con despacho a domicilio a un domiciliario específico (ej. **Speedie Gonzalez**), organizando automáticamente la hoja de ruta del día por orden de cercanía/prioridad geográfica, detallando montos a cobrar en efectivo contra-entrega y ofreciendo botones directos para mapas y contacto rápido por WhatsApp.

---

## 🏗️ Arquitectura Técnica y Flujo de Datos

### 1. Base de Datos (`deliveries` & `invoices`)
La tabla `deliveries` se vincula directamente a `invoices` y al colaborador repartidor (`delivery_guy_id` en `employees`):

```sql
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    delivery_guy_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    address VARCHAR(250) NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    route_order INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'en_camino', 'entregado', 'cancelado'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Endpoints API REST

#### `GET /api/clients/:clientId/employees/:employeeId/deliveries`
Obtiene las entregas asignadas al repartidor para el día actual, ordenadas por `route_order ASC` (cercanía):
- **Parámetros:** `clientId`, `employeeId`
- **Retorno:** Objeto JSON con lista de entregas, incluyendo:
  - `invoice_number`: Código de factura (ej. `DOM-7919`).
  - `customer_name`: Nombre del cliente final.
  - `customer_phone`: Teléfono de contacto.
  - `delivery_address`: Dirección completa de despacho.
  - `total_amount`: Monto total de la factura.
  - `payment_method`: Método de pago (`efectivo`, `transferencia`, `tarjeta_debito`).
  - `payment_status`: Estado del pago (`pending` = cobrar contra-entrega, `paid` = ya pagado).
  - `route_order`: Secuencia optimizada de parada (1, 2, 3...).
  - `notes`: Indicaciones específicas para el domiciliario.

#### `POST /api/clients/:clientId/deliveries/seed-test`
Endpoint de pruebas para generar automáticamente **6 facturas de domicilio** de prueba asignadas a Speedie Gonzalez con ruta optimizada en la ciudad (Barranquilla):
1. **Parada #1 (Alto Prado):** Calle 84 #52-10 | $185.000 COP en Efectivo
2. **Parada #2 (El Golf):** Carrera 53 #79-120 | Pagado por Transferencia/Nequi
3. **Parada #3 (Centro Comercial Mall):** Calle 72 #44-05 | $140.000 COP en Efectivo
4. **Parada #4 (Barrio Recreo):** Carrera 43 #65-18 | $210.000 COP en Efectivo
5. **Parada #5 (Riomar / Alameda):** Calle 98 #56-22 | Pagado en Tienda
6. **Parada #6 (Riomar):** Carrera 51B #93-15 | $295.000 COP en Efectivo

---

## 🎨 Interfaz de Usuario (Panel de Empleado / Domiciliario)

Dentro de la **Ficha del Empleado** (`SaaSErpEmployees.tsx`), se integró la pestaña **`🚚 Mis Entregas`**:

1. **Encabezado con Estado de Ruta:** Muestra la cantidad total de entregas del día y el botón de prueba **`🧪 Generar 6 Entregas de Prueba`**.
2. **Tarjeta por Parada (Tarjetas de Cercanía):**
   - **Insignia de Cercanía:** `Parada #1 (Cercanía)`, `Parada #2`, etc.
   - **Monto a Cobrar:** Destacado en dorado/amarillo si es en efectivo contra-entrega (`$185.000 COP en Efectivo`), o en verde si ya fue pagado.
   - **Acción Rápida Google Maps:** Abre la ubicación en Google Maps con 1 clic.
   - **Acción Rápida WhatsApp:** Inicia chat directo por WhatsApp con mensaje pre-redactado para avisar al cliente que el domiciliario va en camino.
   - **Notas del Despacho:** Indicaciones clave (ej: *"Llamar al cliente 5 min antes", "Cobrar en portería"*).

---

## ✅ Verificación y Pruebas Ejecutadas

1. **Prueba de Inserción de 6 Facturas (`seed-test`):**
   - **Resultado:** Éxito (`{"success":true}`).
   - **Facturas Creadas:** `DOM-7919`, `DOM-7218`, `DOM-4299`, `DOM-8843`, `DOM-7341`, `DOM-7618`.

2. **Prueba de Consulta por Domiciliario (`GET deliveries`):**
   - **Resultado:** 6 paradas ordenadas de 1 a 6 por cercanía con importes en efectivo y estado de entrega.

3. **Prueba de Compilación Frontend & Backend:**
   - `npx tsc --noEmit`: 0 errores.
   - `npm run build:frontend`: Compilación limpia en 333ms.
