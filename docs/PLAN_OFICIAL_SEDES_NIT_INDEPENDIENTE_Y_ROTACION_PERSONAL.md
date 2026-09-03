# 🏢 Documentación Oficial: Arquitectura Multi-Sede con NIT Independiente y Rotación Dinámica de Personal (2026)

Este documento constituye la especificación y planificación oficial para la ampliación del módulo Multi-Sede en el ERP Multi-Tenant. Define la compatibilidad con sedes de identidad fiscal propia (NIT / Razón Social independiente) y la rotación dinámica de trabajadores entre múltiples sucursales con cajas chicas y turnos aislados.

---

## 🎯 1. OBJETIVOS DEL PROYECTO

1. **Sedes con Identidad Fiscal Propia (NIT / Razón Social Opcional)**:
   - Permitir que un grupo empresarial administre sucursales que comparten el mismo catálogo y operaciones, pero que emiten facturas bajo una razón social o NIT independiente (ej. consorcios, franquicias o sociedades por ciudad).
   - Si la sede NO tiene NIT propio, hereda automáticamente los datos fiscales de la casa matriz (`parent_client_id`).

2. **Rotación Dinámica de Personal entre Sedes**:
   - Permitir asignar un colaborador a múltiples sedes de la empresa (relación 1 a N / N a N).
   - Proveer un **Selector de Sede Activa (`active_branch_id`)** en la Topbar del ERP para que el empleado active el contexto de la sucursal donde trabajará en el turno actual.
   - Aislar los turnos de caja (`cash_shifts`), ventas y comisiones al `active_branch_id` asignado en el momento de la operación.

---

## 📋 2. PLAN DE IMPLEMENTACIÓN TÉCNICA

### 2.1. Modelo de Datos y Esquemas SQL (`src/database/initDb.ts`)

```sql
-- 1. Bandera y datos fiscales independientes por sede en la tabla clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS has_custom_tax_id BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS custom_tax_id VARCHAR(50);

-- 2. Soporte para sedes múltiples en la tabla employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS allowed_branches JSONB DEFAULT '[]'::jsonb;

-- 3. Auditoría de traslados/rotación de personal
CREATE TABLE IF NOT EXISTS employee_branch_transfers (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    employee_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    from_client_id VARCHAR(50) NOT NULL REFERENCES clients(id),
    to_client_id VARCHAR(50) NOT NULL REFERENCES clients(id),
    transferred_by_user_name VARCHAR(150) NOT NULL,
    reason TEXT,
    transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

### 2.2. Frontend - UI / UX

#### A. Modal "Agregar / Editar Sede" (`SaaSErpStoreSettings.tsx`)
- **Campos Generales**: Nombre comercial de la sede, Dirección, Teléfono, Ciudad.
- **Switch / Toggle Fiscal**: *"¿Esta sede maneja facturación / NIT independiente?"*.
- **Comportamiento Dinámico**:
  - **Activado (`has_custom_tax_id = true`)**: Despliega los campos para *NIT / Documento Fiscal propio*, *Razón Social Legal para Facturación* y *Prefijo/Resolución DIAN independiente*.
  - **Desactivado (`has_custom_tax_id = false`)**: Muestra la nota informativa: *"Hereda automáticamente el NIT y Razón Social de la casa matriz"*.

#### B. Selector de Sede Activa ("Store Switcher") (`ClientDashboard.tsx`)
- En el Topbar/Navbar del ERP:
  - Si el usuario tiene acceso a una sola sede, se muestra fija.
  - Si el usuario o empleado tiene acceso a múltiples sucursales: despliega un menú desplegable interactivo: `[ 📍 Sede Actual: Sede Norte ▼ ]`.
  - Al cambiar de sede activa, se actualiza el contexto global (`active_branch_id`) y se refrescan las métricas, arqueo de caja y facturación del turno.

#### C. Asignación de Sedes a Empleados (`SaaSErpEmployees.tsx`)
- En el modal de creación y edición de empleados, incluir un selector con checkboxes: *"Sedes autorizadas para operar"*.

---

### 2.3. Lógica de Negocio y Backend (`src/server.ts`)

#### A. Facturación y Ventas (POS)
- En el endpoint de emisión de factura (`POST /api/invoices`):
  - Verificar si la sede emisora tiene `has_custom_tax_id = true`.
  - Si es `true`, congelar el NIT, Razón Social y Prefijo propio de esa sucursal en la factura.
  - Si es `false`, consultar y heredar los datos fiscales de la casa matriz (`parent_client_id`).

#### B. Turnos, Arqueos de Caja y Ventas por Empleado (`cash_shifts`)
- Toda apertura de turno de caja chica registra la tripleta: `(employee_id, active_branch_id, opening_time)`.
- Esto garantiza independencia total en la cuadratura de cajas chicas sin cruzar saldos ni efectivo entre sucursales.

#### C. Reportes y Contabilidad
- Permitir a los administradores:
  1. Filtrar reportes de ventas y P&L por **Sede Individual** (para declaraciones de impuestos por cada NIT).
  2. Consultar el **Estado Consolidado del Grupo Empresarial** completo.

---

## 🧪 3. PLAN DE VERIFICACIÓN Y PRUEBAS

1. **Compilación Limpia**:
   - `npm run build:frontend` (Vite / TypeScript sin errores).
2. **Prueba de Creación de Sede con NIT Independiente**:
   - Crear una sede con NIT propio y emitir una factura. Verificar que el recibo contenga el NIT independiente.
   - Crear una sede sin NIT propio. Verificar que la factura salga con el NIT de la casa matriz.
3. **Prueba de Rotación de Empleado**:
   - Asignar a un empleado el acceso a Sede Centro y Sede Norte.
   - Iniciar turno en Sede Centro (Arqueo A) y luego cambiar a Sede Norte (Arqueo B). Verificar que los arqueos de caja sean totalmente independientes.

---

## 📌 4. WALKTHROUGH & RESUMEN DE CAMBIOS EJECUTADOS

*(Esta sección se completará formalmente en este mismo documento cuando se ejecute la implementación en el código base)*
