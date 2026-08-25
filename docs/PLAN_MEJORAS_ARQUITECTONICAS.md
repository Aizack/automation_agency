# Plan de Mejoras Arquitectónicas

Documento generado el 2026-08-20. Refleja el estado real del proyecto tras análisis completo del código fuente y revisión de lo que aplicó Copilot.

---

## Estado del sistema al momento del análisis

- Backend compila sin errores (`npx tsc --noEmit`)
- Frontend compila sin errores (`npm run build`)
- Servidor responde en runtime (`HTTP/1.1 200 OK`)
- `server.ts` tiene 6041 líneas
- `initDb.ts` tiene 889 líneas
- 20 componentes React en el dashboard

---

## Lo que aplicó Copilot (NO tocar, ya está hecho)

| Ítem | Archivo | Línea |
|------|---------|-------|
| `GET /api/clients/:clientId/tenant-users` | server.ts | 3310 |
| `POST /api/clients/:clientId/tenant-users` | server.ts | 3340 |
| `PUT /api/clients/:clientId/tenant-users/:userId` | server.ts | 3395 |
| `DELETE /api/clients/:clientId/tenant-users/:userId` | server.ts | 3454 |
| `POST /api/admin/alerts/:alertId/resolve` | server.ts | 5821 |
| `POST /api/admin/alerts/:alertId/snooze` | server.ts | 5848 |
| `POST /api/admin/alerts/:alertId/reopen` | server.ts | 5880 |
| Migraciones de arranque fase 4 duplicadas | server.ts | 5920 |
| `SaaSErpEmployees.tsx` ampliado | dashboard | +30KB |

### Bug detectado en lo de Copilot

En `GET /tenant-users` (línea 3314), el SELECT no tiene alias explícito para `u.id` vs `r.id`. PostgreSQL puede devolver el `id` de `user_client_roles` en lugar del de `users`. Hay que agregar `u.id AS user_id` explícitamente antes de construir el frontend.

---

## Estado real observado y diferencias con el plan

El plan original quedó desactualizado porque varias decisiones ya fueron implementadas después del análisis inicial.

### Lo que ya está hecho

| Tarea | Archivo | Estado |
|-------|---------|--------|
| Validación de variables de entorno al startup | `src/utils/envValidator.ts` | ✅ Implementado |
| Endpoint `/api/health` | `src/server.ts` | ✅ Implementado |
| Login de empleado por `phone + pin` | `src/server.ts` | ✅ Implementado |
| `slug` en `clients` | `src/database/initDb.ts` | ✅ Implementado |
| `user_id` en `employees` | `src/database/initDb.ts` | ✅ Implementado |
| `stock_movements` y stock comprometido/reservado | `src/database/initDb.ts` | ✅ Implementado |
| `tenant_admin` en middlewares | `src/middlewares/authMiddleware.ts` | ✅ Implementado |
| Pestaña de login negocio/empleado | `dashboard/src/components/Login.tsx` | ✅ Implementado |
| Portal personal del empleado | `dashboard/src/components/EmployeePortal.tsx` | ✅ Implementado |

### Qué todavía sigue siendo un riesgo real

| Tarea | Archivo | Estado |
|-------|---------|--------|
| Hashing de contraseñas con bcrypt para usuarios del negocio | `src/server.ts` + `src/utils/passwordUtils.ts` | ⚠️ Parcialmente implementado |
| Redirección limpia del flujo empleado | `dashboard/src/App.tsx` | ⚠️ Requiere revisión urgente |
| Diferenciación clara entre login del negocio y login del empleado | `dashboard/src/components/Login.tsx` | ⚠️ Tiene ambigüedad UX |
| PIN de 6 dígitos consistente para empleados | `employees.pin` / frontend | ⚠️ Aun no está unificado entre backend y UX |

---

## Bug actual que está generando la confusión inicial

El problema principal ya no es arquitectónico sino de flujo:

- La pestaña "Empleado" sí hace login con `phone + pin`.
- Sin embargo, el flujo de sesión posterior no siempre conserva la vista correcta.
- Cuando el sistema llega a `EmployeePortal` o a la redirección del ERP, el guard de rutas puede volver a renderizar `Login` si no hay una validación de sesión explícita antes de reabrir la pantalla.

Esto produce la sensación de que "el empleado vuelve a un login previo" cuando en realidad el sistema está re-evaluando la sesión sin tener memoria clara de la vista `employee`.

### Causa probable

La lógica de [dashboard/src/App.tsx](dashboard/src/App.tsx) usa `localStorage` y estado local para decidir la vista; si no se valida el token y el `current_view` de manera estricta antes de mostrar `Login`, el navegador puede volver a la pantalla de autenticación aunque ya exista sesión.

---

## Pendientes reales de corrección (orden de prioridad)

### Bloque 1 — Seguridad del login

| Tarea | Estado |
|-------|--------|
| Integrar bcrypt en `/api/login` para usuarios del negocio | ⚠️ Pendiente |
| Migrar contraseñas legadas a hash seguro | ⚠️ Pendiente |
| Evitar que la contraseña larga del negocio se confunda con un PIN de empleado | ⚠️ Pendiente |

### Bloque 2 — Claridad UX en la pantalla de login

| Tarea | Estado |
|-------|--------|
| Mantener tabs claros: `Negocio` / `Empleado` | ✅ Ya existe |
| Definir si la pestaña de negocio acepta solo usuario o también celular | ⚠️ Pendiente de decisión UX |
| Forzar PIN de 6 dígitos y NO de 4 | ⚠️ Pendiente de consolidación |
| Mostrar modo de login según tab activo | ⚠️ Pendiente de mejora |

### Bloque 3 — Corrección de flujo de empleado

| Tarea | Estado |
|-------|--------|
| Evitar que el portal personal vuelva a mostrar `Login` | ⚠️ Pendiente |
| Asegurar que `current_view === 'employee'` se preserve | ⚠️ Pendiente |
| Decidir si `/empleados` es una ruta de vista autenticada o una segunda pantalla de login | ⚠️ Pendiente de decisión |

---

## Soluciones recomendadas para remediar el problema actual

### Solución 1 — Login dual por modo de entrada (recomendada)

- En la pestaña "Negocio": campo `usuario` + contraseña larga.
- En la pestaña "Empleado": campo `teléfono` + PIN de 6 dígitos.
- Si se quiere evitar la confusión, se agrega un selector de tipo de login debajo del título:
  - `Usuario`
  - `Número celular`
- Cuando esté en `Usuario`, la contraseña es larga.
- Cuando esté en `Número celular`, la contraseña es el PIN de 6 dígitos.

### Solución 2 — No repetir el login dentro del portal de empleado

- `Login` solo debe manejar acceso inicial.
- `EmployeePortal` debe renderizarse solo cuando el token ya esté validado y la sesión pertenezca a un empleado.
- El sistema no debe volver a ejecutar el `Login` cuando `current_view` ya es `employee`.

### Solución 3 — Guard de sesión estricto

- Verificar token + `current_view` antes de renderizar cualquier vista.
- Si la sesión es `employee`, priorizar `EmployeePortal` o ERP y no abrir el `Login`.
- Si la vista es `employee` y no hay token válido, hacer logout limpio y redirigir a `Login` una sola vez.

### Recomendación final

La arquitectura correcta es esta:

1. Negocio = `usuario + contraseña larga`
2. Empleado = `teléfono + PIN de 6 dígitos`
3. Empleado autenticado = ERP o portal personal, nunca otra pantalla de login
4. Guard de sesión con prioridad sobre la vista `Login`

Con esto se resuelve la confusión de la UI y se mantiene la separación funcional que pediste: negocio admin vs empleados operativos.

---

## Principio rector

> Todas las intervenciones son **no destructivas**.
> No se elimina ninguna ruta, tabla, columna ni componente existente.
> El sistema sigue funcionando en cada paso intermedio.
