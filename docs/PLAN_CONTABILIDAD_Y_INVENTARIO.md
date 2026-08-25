# Plan de Implementación: Módulo Contable, Métodos de Pago y Rotación de Inventario

Documento para ejecución por Copilot. Todas las intervenciones son **no destructivas**.
No eliminar rutas, tablas, columnas ni componentes existentes.

---

## Contexto del proyecto

- Backend: Express + TypeScript (`src/server.ts` ~6000 líneas)
- Frontend: React + TypeScript (`dashboard/src/`)
- Base de datos: PostgreSQL (pool en `src/database/postgres.ts`)
- Las migraciones van en `src/database/initDb.ts` al final de la función, antes del catch, usando `ADD COLUMN IF NOT EXISTS` y `CREATE TABLE IF NOT EXISTS`
- Los componentes ERP van en `dashboard/src/components/` con nombre `SaaSErp*.tsx`
- Se registran en `ClientDashboard.tsx` (import + tipo de activeTab + nav button + render)

---

## TAREA 1 — Corregir métodos de pago en Facturación

### 1.1 Cambio de nomenclatura en la UI y BD

El campo `payment_method` en las tablas `invoices` y cualquier otra tabla que lo use debe soportar los siguientes valores. **No renombrar los valores ya existentes si hay datos; agregar los nuevos**.

| Valor en BD | Etiqueta en UI |
|---|---|
| `efectivo` | 💵 Efectivo |
| `transferencia` | 🏦 Transferencia Bancaria |
| `tarjeta_credito` | 💳 Tarjeta de Crédito |
| `tarjeta_debito` | 💳 Tarjeta de Débito |
| `credito` | 📋 Crédito (por cuotas) |

> El valor anterior `contado` se reemplaza en la UI por `efectivo`. Si hay registros con `contado` en la BD se deben mostrar como "Efectivo" en la UI (mapeo visual, sin migrar datos).
> El valor anterior `cuotas` o `por_cuotas` se muestra en la UI como "Crédito (por cuotas)".

### 1.2 Campos adicionales para Transferencia Bancaria

Cuando el método de pago es `transferencia`, se deben capturar dos campos adicionales:

```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transfer_bank VARCHAR(100);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transfer_destination_account VARCHAR(200);
```

- `transfer_bank`: banco del cliente que hizo la transferencia (ej. "Bancolombia", "Davivienda", "Nequi", "PSE")
- `transfer_destination_account`: cuenta propia del negocio donde se recibe (ej. "Cuenta Ahorros Bancolombia #xxxx")

El negocio debe poder configurar sus cuentas bancarias en **Configuración** (ver Tarea 3).

### 1.3 Actualizar formulario de factura

En el componente `SaaSErpInvoices.tsx`, el selector de método de pago debe:
1. Mostrar las 5 opciones del listado de arriba
2. Cuando se selecciona `transferencia`, mostrar dos campos adicionales:
   - Select o input de texto para el banco del cliente
   - Select de "¿A cuál de nuestras cuentas?" (cargado desde la configuración del negocio)
3. Cuando se selecciona `tarjeta_credito` o `tarjeta_debito`, no requiere campos extra
4. Cuando se selecciona `credito`, mostrar el selector de cuotas (ya existe)

---

## TAREA 2 — Nuevo Módulo de Contabilidad

### 2.1 Backend — Endpoints necesarios

Crear los siguientes endpoints en `server.ts`. Todos requieren `authenticateToken` y `authorizeClientAccess`.

#### `GET /api/clients/:clientId/accounting/summary`

Parámetros de query:
- `period`: `day` | `week` | `month` | `quarter` | `semester` | `year`
- `date`: fecha de referencia en formato `YYYY-MM-DD` (por defecto hoy)

Respuesta:
```json
{
  "success": true,
  "period": "month",
  "date_range": { "from": "2025-08-01", "to": "2025-08-31" },
  "total_revenue": 1500000,
  "total_invoices": 45,
  "average_ticket": 33333,
  "by_payment_method": [
    { "method": "efectivo", "count": 20, "total": 600000 },
    { "method": "transferencia", "count": 15, "total": 500000 },
    { "method": "tarjeta_credito", "count": 5, "total": 200000 },
    { "method": "tarjeta_debito", "count": 3, "total": 100000 },
    { "method": "credito", "count": 2, "total": 100000 }
  ]
}
```

SQL base:
```sql
SELECT 
  payment_method,
  COUNT(*) as count,
  SUM(total_amount) as total
FROM invoices
WHERE client_id = $1
  AND created_at >= $date_from
  AND created_at <= $date_to
  AND status != 'cancelled'
GROUP BY payment_method
ORDER BY total DESC;
```

#### `GET /api/clients/:clientId/accounting/top-products`

Parámetros: `period`, `date`, `limit` (default 10)

Respuesta:
```json
{
  "success": true,
  "products": [
    {
      "product_id": "uuid",
      "product_name": "Armazón Ray-Ban",
      "total_sold": 25,
      "total_revenue": 1250000,
      "avg_price": 50000,
      "rotation_rank": 1
    }
  ]
}
```

SQL base:
```sql
SELECT 
  p.id as product_id,
  p.name as product_name,
  SUM(ii.quantity) as total_sold,
  SUM(ii.quantity * ii.unit_price) as total_revenue,
  AVG(ii.unit_price) as avg_price
FROM invoice_items ii
JOIN invoices i ON ii.invoice_id = i.id
JOIN products p ON ii.product_id = p.id
WHERE i.client_id = $1
  AND i.created_at >= $date_from
  AND i.created_at <= $date_to
  AND i.status != 'cancelled'
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT $limit;
```

> Nota: Si la tabla `invoice_items` no existe, buscar la tabla equivalente que relaciona facturas con productos. Puede llamarse `sale_items`, `order_items` o estar embebida como JSONB en `invoices`. Adaptar el SQL según la estructura real.

#### `GET /api/clients/:clientId/accounting/daily-trend`

Parámetros: `period` (month | quarter | semester | year), `date`

Devuelve array de ventas agrupadas por día para graficar tendencia.

```json
{
  "success": true,
  "trend": [
    { "date": "2025-08-01", "revenue": 150000, "count": 3 },
    { "date": "2025-08-02", "revenue": 220000, "count": 5 }
  ]
}
```

### 2.2 Frontend — `SaaSErpAccounting.tsx`

Crear el componente `dashboard/src/components/SaaSErpAccounting.tsx`.

**Estructura visual:**

```
┌─────────────────────────────────────────────────────┐
│  Contabilidad                    [Hoy][Semana][Mes] │
│                              [Trimestre][Semestre][Año]│
├─────────────────┬───────────────────────────────────┤
│ KPI Cards (4):  │  Gráfico de tendencia diaria       │
│ • Total ingresos│  (línea o barras simples con CSS)  │
│ • Nro facturas  │                                    │
│ • Ticket promedio│                                   │
│ • Mejor día     │                                    │
├─────────────────┴───────────────────────────────────┤
│  Métodos de Pago          │  Productos Más Vendidos  │
│  Barras horizontales con  │  Lista top 10 con        │
│  % de cada método         │  cantidad y total        │
└───────────────────────────┴──────────────────────────┘
```

**Selector de período:** botones tipo tab: `Hoy | Semana | Mes | Trimestre | Semestre | Año`

**Estilo:** usar las clases del design system:
- `.glass-card`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- `.status-badge`, `.section-header`, `.input-field`
- Variables CSS: `--primary-color`, `--text-color`, `--text-muted`, `--surface-container-val`

**Gráfico de tendencia:** implementar con CSS puro (barras con `height` proporcional al máximo) o usar una librería ligera ya instalada si existe. No instalar nuevas dependencias pesadas.

**Correlación con inventario:** al final del componente, sección "Productos con baja rotación" — listar productos del top de ventas vs. productos con menos de X unidades vendidas en el período, marcados como candidatos a discontinuar.

### 2.3 Integrar en `ClientDashboard.tsx`

1. Importar: `import { SaaSErpAccounting } from './SaaSErpAccounting';`
2. Agregar `'contabilidad'` al tipo de `activeTab`
3. Agregar nav button en el sidebar bajo la sección "Facturación y Cobro":
```tsx
<button onClick={() => setActiveTab('contabilidad')} className={...}>
  <span className="material-symbols-outlined text-[18px]">bar_chart</span>
  <span className="font-bold text-xs">Contabilidad</span>
</button>
```
4. Agregar título en el header: `activeTab === 'contabilidad' ? 'Contabilidad y Análisis' :`
5. Agregar render del contenido después del bloque de `facturacion`:
```tsx
{activeTab === 'contabilidad' && (
  <div className="glass-card p-6 rounded-2xl border border-outline/10">
    <SaaSErpAccounting clientId={clientId} />
  </div>
)}
```

---

## TAREA 3 — Cuentas Bancarias del Negocio (Configuración)

Para que el formulario de transferencia pueda cargar las cuentas del negocio, se necesita:

### 3.1 Migración de BD

```sql
CREATE TABLE IF NOT EXISTS business_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  bank_name VARCHAR(100) NOT NULL,
  account_type VARCHAR(50) NOT NULL DEFAULT 'ahorros',
  account_number VARCHAR(50),
  account_holder VARCHAR(200),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_client ON business_bank_accounts(client_id);
```

### 3.2 Endpoints CRUD

```
GET    /api/clients/:clientId/bank-accounts       → listar cuentas activas
POST   /api/clients/:clientId/bank-accounts       → crear cuenta
PUT    /api/clients/:clientId/bank-accounts/:id   → editar
DELETE /api/clients/:clientId/bank-accounts/:id   → eliminar (soft delete: is_active = false)
```

### 3.3 UI

Agregar sección "Cuentas Bancarias" en el componente `SaaSErpStoreSettings.tsx` (o en Información Empresa) con CRUD básico.

---

## TAREA 4 — Rotación de Inventario

### 4.1 Backend — Endpoint

#### `GET /api/clients/:clientId/inventory/rotation`

Parámetros: `period` (month | quarter | year), `date`

```json
{
  "success": true,
  "products": [
    {
      "product_id": "uuid",
      "product_name": "Armazón Ray-Ban",
      "current_stock": 15,
      "units_sold": 25,
      "rotation_rate": 1.67,
      "rotation_label": "Alta",
      "days_of_stock": 18,
      "recommendation": "Reabastecer pronto"
    },
    {
      "product_id": "uuid",
      "product_name": "Estuche Genérico",
      "current_stock": 50,
      "units_sold": 2,
      "rotation_rate": 0.04,
      "rotation_label": "Baja",
      "days_of_stock": 750,
      "recommendation": "Candidato a descontinuar"
    }
  ]
}
```

**Cálculo de rotation_rate:** `units_sold / days_in_period`

**Labels:**
- `rotation_rate > 0.5` → "Alta" (verde)
- `rotation_rate 0.1–0.5` → "Media" (amarillo)
- `rotation_rate < 0.1` → "Baja" (rojo/naranja)

**Días de stock:** `current_stock / (units_sold / days_in_period)`

### 4.2 Frontend

Agregar pestaña o sección "Rotación" dentro del componente `SaaSErpInventory.tsx` existente.

Vista: tabla ordenable por `rotation_rate` con columnas:
- Producto
- Stock actual
- Unidades vendidas (período)
- Índice de rotación
- Días de stock estimados
- Badge de recomendación

Correlacionar con el módulo contable: el endpoint `/accounting/top-products` y `/inventory/rotation` comparten datos. Se puede hacer una sola consulta en el backend o reusar los datos en el frontend si ambas pestañas están abiertas.

---

## Orden de ejecución recomendado para Copilot

1. **Migración BD** (initDb.ts): agregar columnas a `invoices` (transfer_bank, transfer_destination_account) + tabla `business_bank_accounts`
2. **Endpoints contables** (server.ts): `/accounting/summary`, `/accounting/top-products`, `/accounting/daily-trend`
3. **Endpoint rotación** (server.ts): `/inventory/rotation`
4. **CRUD cuentas bancarias** (server.ts): 4 endpoints
5. **Actualizar SaaSErpInvoices.tsx**: nuevos métodos de pago + campos de transferencia
6. **Crear SaaSErpAccounting.tsx**: nuevo componente
7. **Agregar sección cuentas bancarias** en SaaSErpStoreSettings.tsx
8. **Agregar pestaña Rotación** en SaaSErpInventory.tsx
9. **Integrar Contabilidad** en ClientDashboard.tsx
10. **Compilar** con `npx tsc --noEmit` y corregir errores

---

## Notas importantes para Copilot

- Siempre agregar `authenticateToken as any, authorizeClientAccess as any` a los endpoints ERP
- Las migraciones van dentro del `try` en `initDb.ts`, antes del catch, usando `pool.query()`
- El design system está en `dashboard/src/index.css`. Usar las clases existentes: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.status-badge`, `.input-field`, `.section-header`, `.glass-card`
- Los fetch del frontend usan `authFetch as fetch` importado de `'../utils/api'`
- Verificar que `invoice_items` existe antes de usar. Si no existe, buscar la estructura real en `initDb.ts`
- No instalar nuevas dependencias sin verificar si ya existe algo equivalente
- Compilar con `npx tsc --noEmit` en backend y `npx tsc --noEmit` en `dashboard/` al final
