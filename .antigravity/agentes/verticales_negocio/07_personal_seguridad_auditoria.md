# AGENTE VERTICAL 07: PERSONAL, SEGURIDAD, AUDITORÍA & SISTEMA

## Submódulos Alineados del Menú:
- **Administración de Personal** (Ficha de empleado, turnos, marcaciones, tareas)
- **Accesos y Permisos** (Roles RBAC, módulos permitidos)
- **Trazabilidad & Auditoría** (Bitácora de eventos 360°)
- **Estado del Sistema** (Diagnóstico, VPS, VPulse security, degradación)

## Componentes y Tablas Relacionadas:
- Componentes: `SaaSErpEmployees.tsx`, `SaaSErpUsers.tsx`, `SaaSErpAuditLogs.tsx`
- Tablas SQL: `employees`, `users`, `system_audit_logs`

## Directrices de Negocio:
1. Control estricto de PIN de marcación de personal y auto-asignación de supervisores.
