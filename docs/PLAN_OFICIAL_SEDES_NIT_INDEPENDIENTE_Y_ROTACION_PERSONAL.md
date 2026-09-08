# 🏢 Documentación Oficial: Arquitectura Multi-Sede con NIT Independiente y Rotación Dinámica de Personal (2026)

Este documento constituye la especificación y planificación oficial para el módulo **Multi-Sede** en el ERP Multi-Tenant. Define la compatibilidad con sedes de identidad fiscal propia (NIT / Razón Social independiente) y la rotación dinámica de trabajadores entre múltiples sucursales con cajas chicas y turnos aislados.

---

## 📊 1. AUDITORÍA DEL ESTADO ACTUAL

### ✅ A. Lo que YA está implementado en la plataforma:
1. **Jerarquía Multi-Sede Matriz / Sucursales**:
   - Columnas `parent_client_id`, `branch_name`, `is_main_branch` en la tabla `clients`.
   - Endpoints `/api/clients/:clientId/branches` (GET/POST) para alta y consulta de sucursales en backend (`src/server.ts`).
2. **Interfaz UI/UX Rediseñada**:
   - Vista principal dedicada **`+ Nueva Sede`** en `ClientDashboard.tsx` (removido el modal emergente y reemplazado por la pestaña completa con lista de sedes activas).
3. **Aislamiento Dinámico por Vertical de Negocio (`category`)**:
   - Filtros condicionales según `category` (`optica`, `restaurante`, `tienda`, `clinica`).
   - Las ópticas ven solo laboratorios, fórmulas y campañas de salud visual; los restaurantes ven solo comandero KDS, mesas y recetas.
4. **Estructuras SQL Iniciales**:
   - Tabla `inventory_transfers` para el movimiento de stock entre sedes.
   - Tabla `employee_branch_transfers` para la auditoría de trasladados.

---

### ⏳ B. Lo que FALTA por implementar (Fase Siguiente):
1. **Identidad Fiscal Propia por Sede (NIT e Identificación Tributaria)**:
   - Campos `has_custom_tax_id`, `legal_name`, `custom_tax_id` en la tabla `clients`.
   - Formulario con *Switch de NIT Independiente* en la vista de alta/edición de sedes.
   - Herencia automática del NIT y Razón Social de la casa matriz si el switch está desactivado.
2. **Rotación Dinámica y Permisos Multisede de Personal**:
   - Campo `allowed_branches JSONB` en la tabla `employees` para autorizar a un colaborador en múltiples tiendas.
   - Checkboxes de selección de sedes en el módulo de empleados (`SaaSErpEmployees.tsx`).
   - Selector de Sede Activa (**"Store Switcher"**) en el Topbar para cambiar de contexto en tiempo real.
3. **Aislamiento de Cajas y Facturación por Sede Activa**:
   - Registro de la tripleta `(employee_id, active_branch_id, opening_time)` en apertura de turnos de caja (`cash_shifts`).
   - Congelar el NIT y datos fiscales correspondientes a la sede emisora en cada comprobante o factura de venta.

---

## 📋 2. PLAN DE IMPLEMENTACIÓN PASO A PASO

### Paso 1: Migración e Incremental SQL (`src/database/initDb.ts`)
```sql
-- 1. Agregar banderas de NIT independiente en clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS has_custom_tax_id BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS legal_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS custom_tax_id VARCHAR(50);

-- 2. Permitir múltiples sedes autorizadas por empleado
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS allowed_branches JSONB DEFAULT '[]'::jsonb;

-- 3. Completar columnas de auditoría en employee_branch_transfers
ALTER TABLE employee_branch_transfers
ADD COLUMN IF NOT EXISTS from_client_id VARCHAR(50) REFERENCES clients(id),
ADD COLUMN IF NOT EXISTS to_client_id VARCHAR(50) REFERENCES clients(id);
```

### Paso 2: Formulario de Sede con Switch Fiscal (`ClientDashboard.tsx`)
- En la pestaña de **`+ Nueva Sede`**, incluir el toggle: *"¿Esta sede cuenta con NIT y Razón Social propia?"*.
- **Si se activa**: Habilita los campos para ingresar NIT con dígito de verificación y Razón Social de la sucursal.
- **Si está desactivado**: Muestra el aviso *"Heredará los datos fiscales de la Casa Matriz"*.

### Paso 3: Selector de Sede Activa ("Store Switcher") en la Barra Superior
- En la barra superior (`Topbar`) de `ClientDashboard.tsx`, renderizar un desplegable cuando el usuario tenga más de 1 sede autorizada: `[ 📍 Sede Activa: Sede Norte ▼ ]`.
- Al cambiar la opción, se actualiza el `active_branch_id` en el estado global y se recargan las ventas, turnos de caja y métricas.

### Paso 4: Selector de Sedes Autorizadas en Empleados (`SaaSErpEmployees.tsx`)
- En el modal de creación/edición de colaboradores, incluir checkboxes para marcar las sedes en las que el trabajador tiene permiso de operar.

### Paso 5: Emisión de Facturación Aislada por NIT
- En `POST /api/invoices`, verificar si la sede emisora posee `has_custom_tax_id = true`.
- Congelar el NIT y Razón Social propios de la sede en la factura, o usar los de la matriz si es `false`.

---

## 🧪 3. PLAN DE VERIFICACIÓN

1. **Prueba de NIT Independiente**:
   - Crear la sede *1 Óptica Nuevo Horizonte* con NIT propio (ej. `901234567-1`).
   - Crear la sede *2 Óptica Nuevo Horizonte* con NIT propio (ej. `901234568-2`).
   - Emitir factura en ambas sedes y verificar que los comprobantes reflejen el NIT y Razón Social correspondientes.
2. **Prueba de Rotación de Empleado**:
   - Asignar a un optómetra/cajero acceso a ambas sedes.
   - Cambiar de sede en el Topbar y verificar que el turno de caja y las métricas se ajusten al contexto seleccionado.

---

## 📌 4. WALKTHROUGH & RESUMEN DE CAMBIOS

*(Esta sección se completará formalmente una vez que se ejecuten los pasos del plan en el repositorio).*
