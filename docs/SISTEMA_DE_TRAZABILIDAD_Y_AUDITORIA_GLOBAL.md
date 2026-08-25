# 📜 Sistema de Trazabilidad Global y Bitácora de Auditoría (Audit Trail 360°)

> [!IMPORTANT]
> Especificación técnica y arquitectura del sistema de trazabilidad de uso de la aplicación para confirmación de hechos, seguridad empresarial y control administrativo multi-tenant.

---

## 🎯 1. Objetivo General

Proporcionar una bitácora inalterable de auditoría (*Audit Trail*) que registre cada evento, inicio de sesión, cambio de datos y navegación de los usuarios y la IA dentro de la plataforma, garantizando que el propietario del negocio tenga evidencia transparente para confirmar hechos.

---

## 🗄️ 2. Arquitectura de la Base de Datos (`system_audit_logs`)

```sql
CREATE TABLE IF NOT EXISTS system_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100) NOT NULL DEFAULT 'Sistema / IA',
    user_email VARCHAR(100),
    user_role VARCHAR(50) DEFAULT 'operador',
    action VARCHAR(100) NOT NULL,            -- Ej: LOGIN, CREAR_FACTURA, MODIFICAR_PRECIO
    module VARCHAR(50) NOT NULL,             -- Ej: Seguridad, Facturación, Inventario, CRM, Domicilios, IA
    description TEXT NOT NULL,               -- Resumen legible de la acción
    details JSONB,                           -- Valores anteriores y nuevos (ej: { precio_anterior: 150000, precio_nuevo: 120000 })
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_client ON system_audit_logs(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON system_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON system_audit_logs(module);
```

---

## ⚙️ 3. Categorías de Eventos Auditados

```mermaid
graph TD
    User[👤 Usuario / Empleado / IA] --> Middleware[🛡️ Audit Middleware & Logger]
    Middleware --> DB[(PostgreSQL: system_audit_logs)]
    
    subgraph Eventos Auditados
        A[🔑 Seguridad & Auth: Login, Logout, Errores de acceso]
        B[💳 Facturación: Emisión, Aprobación de pago, Anulación]
        C[📦 Inventario: Precios, Ajuste de stock, Eliminación de producto]
        D[👥 CRM & Fórmulas: Creación de paciente, actualización de receta]
        E[🚚 Logística: Cambio de estado de entregas a domicilio]
        F[🤖 IA & WhatsApp: Recepción de comprobantes, Takeover humano]
    end
    
    Middleware --- Eventos Auditados
```

---

## 🖥️ 4. Visor de Auditoría en el Frontend (`SaaSErpAuditLogs.tsx`)

Un módulo dedicado en el Dashboard para administradores con:
- **Buscador en Tiempo Real:** Por nombre de usuario, acción o palabra clave.
- **Filtros por Módulo:** Seguridad, Facturación, Inventario, CRM, Logística, IA.
- **Filtros por Rango de Fechas:** Hoy, Últimos 7 días, Mes actual, Personalizado.
- **Modal de Detalle de Auditoría:** Muestra la IP, dispositivo, rol y los datos exactos modificados (valor anterior vs valor nuevo).

---

## 📅 Estado de Implementación

- [x] Documentación técnica creada (`docs/SISTEMA_DE_TRAZABILIDAD_Y_AUDITORIA_GLOBAL.md`).
- [ ] Tabla `system_audit_logs` creada en PostgreSQL (`src/database/initDb.ts`).
- [ ] Servicio de auditoría `src/services/auditService.ts` implementado.
- [ ] Conexión a endpoints Express en `src/server.ts`.
- [ ] Componente `SaaSErpAuditLogs.tsx` integrado en el panel del cliente.
