# 🎯 Módulo de Metas Mensuales de Ventas & Rendimiento Comercial

Este documento especifica la **arquitectura, flujo y diseño de interfaz** para la asignación y seguimiento de **Metas Mensuales de Ventas** por vendedor y departamento en **Diaz Lab ERP**.

---

## 📌 1. Concepto y Flujo del Módulo

El módulo conecta la estrategia comercial definida en reuniones con la ejecución diaria del vendedor:

```
[ Admin / Coordinador ] ── (Asigna Meta $) ──> [ DB: sales_goals ] <── (Auto-suma por Venta) ── [ Facturación / Cierre ]
                                                      │
                                                      └──> [ Portal del Vendedor (Barra de Progreso %) ]
```

1. **Asignación por Administración / Coordinador**: Desde la sección de Empleados en el ERP, el administrador o director comercial define la meta mensual en dinero ($ COP) para cada vendedor (ej. *$15.000.000 COP para el mes 2026-08*).
2. **Alimentación Automática en Cierre de Ventas**: Cada vez que el vendedor emite o cobra una factura en el ERP o cierra un negocio en el CRM, el monto facturado se suma automáticamente al `current_amount` de su meta del mes.
3. **Alimentación / Ajuste Manual**: Opción para que el vendedor o monitor pueda registrar un negocio cerrado directamente si requiere ajuste.
4. **Visualización en Tiempo Real**: En el **Portal del Vendedor**, se despliega un velocímetro/barra de progreso con:
   - **Monto Meta**: `$15.000.000 COP`
   - **Monto Logrado**: `$11.250.000 COP` (75% de avance)
   - **Faltante**: `$3.750.000 COP` para alcanzar la meta.

---

## 🗄️ 2. Estructura en Base de Datos

La tabla `sales_goals` (ya creada en `initDb.ts`) gestiona estos registros:

```sql
CREATE TABLE IF NOT EXISTS sales_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    department_id UUID REFERENCES business_departments(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    target_amount NUMERIC(12,2) NOT NULL,
    current_amount NUMERIC(12,2) DEFAULT 0.00,
    month_year VARCHAR(7) NOT NULL, -- Ej: '2026-08'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🛠️ 3. Especificación de Endpoints API (`src/server.ts`)

### A. Obteción y Asignación por Administrador
- `GET /api/clients/:clientId/sales-goals?month=YYYY-MM`: Obtiene la lista de empleados con sus metas asignadas y su progreso acumulado en el mes.
- `POST /api/clients/:clientId/sales-goals`: Crea o actualiza la meta mensual de un vendedor (`employee_id`, `target_amount`, `month_year`).

### B. Consulta por el Vendedor
- `GET /api/clients/:clientId/employees/:employeeId/sales-goal`: Retorna la meta activa del vendedor del mes corriente con porcentaje de cumplimiento, monto vendido y faltante.

### C. Actualización Automática al Facturar
- En el endpoint de emisión de factura (`POST /api/clients/:clientId/invoices`), la venta se atribuye al vendedor mediante la columna `seller_employee_id` en la tabla `invoices`.
- La atribución se determina mediante 3 mecanismos:
  1. **Selección Directa en Caja/ERP**: El usuario selecciona el *"Vendedor Responsable"* en un desplegable al crear la factura.
  2. **Por Sesión del Vendedor**: Si el vendedor está operando desde su Portal Móvil de Empleado, el sistema asigna su `employee_id` automáticamente.
  3. **Por CRM**: Si el cliente seleccionado tiene un asesor comercial pre-asignado (`crm_customers.assigned_seller_id`), la venta se le computa a dicho vendedor.
- Al registrar el pago o emitir la factura, el sistema ejecuta automáticamente:
  ```sql
  UPDATE sales_goals 
  SET current_amount = current_amount + $amount 
  WHERE client_id = $clientId AND employee_id = $sellerEmployeeId AND month_year = $currentMonth;
  ```

---

## 🖥️ 4. Interfaces de Usuario (UX)

### A. Vista del Administrador (`SaaSErpEmployees.tsx`)
- Pestaña o modal **"Metas Mensuales de Ventas"**.
- Tabla de vendedores con su meta asignada en dinero, ventas ejecutadas y porcentaje de cumplimiento.
- Botón *"Establecer Meta del Mes"* para abrir modal y digitar monto.

### B. Vista del Vendedor (`EmployeePortal.tsx`)
- Tarjeta destacada **"Mi Meta del Mes"** en el encabezado de su portal.
- Barra de progreso interactiva de colores:
  - 🔴 `0% - 49%`: Alerta inicial (Rojo/Ámbar).
  - 🟡 `50% - 89%`: En camino (Amarillo/Azul).
  - 🟢 `90% - 100%+`: Meta alcanzada / Superada (Verde Esmeralda).

---

*Diaz Lab Sales Performance Module — Especificación Técnica de Metas de Ventas.*
