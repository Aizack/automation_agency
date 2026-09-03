# Arquitectura de Seguridad: Sesión Única por Dispositivo y Protección Estricta de Memoria

Este documento establece el estándar de seguridad permanente del sistema para la gestión de sesiones de usuario, previniendo inicios de sesión simultáneos en múltiples dispositivos y eliminando riesgos de fuga de memoria o residuos en el navegador.

---

## 1. 🛡️ Sesión Única por Dispositivo (Single Active Device Session)

### Regla General
Ningún usuario (Administrador de Tienda, Usuario Secundario o Empleado) puede mantener una sesión activa simultáneamente en dos o más dispositivos (ordenadores, teléfonos o tabletas).

### Mecanismo de Funcionamiento
1. **Generación de `sessionId` Único**:
   * En cada inicio de sesión exitoso (`/api/login` o `/api/auth/employee-login`), el servidor genera un UUID de sesión (`sessionId`).
2. **Registro en PostgreSQL (`active_user_sessions`)**:
   * El `sessionId` activo se almacena en la tabla de base de datos asociada al identificador del usuario (`user_id` / `employee_id` / `client_id`).
   * Si existía un `sessionId` registrado anteriormente para ese usuario (ej. de un teléfono u otra computadora), es reemplazado inmediatamente por el nuevo `sessionId`.
3. **Validación en el Middleware (`authMiddleware.ts`)**:
   * Cada token JWT firmado incluye el `sessionId` emitido al momento del login.
   * En cada petición HTTP a la API, el middleware consulta o valida contra `active_user_sessions`.
   * Si el `sessionId` del token del cliente no coincide con el `sessionId` activo en la base de datos, la petición se rechaza con status `401 Unauthorized` y el mensaje:
     > *"Tu sesión ha sido iniciada en otro dispositivo o ha caducado por seguridad."*

---

## 2. 🔒 Protección de Memoria en el Navegador (`sessionStorage` + Limpieza Atómica)

### Almacenamiento Volátil (`sessionStorage`)
* Las credenciales y datos de sesión se almacenan primariamente en `sessionStorage`.
* Al cerrar la pestaña o el navegador web, `sessionStorage` se destruye automáticamente por especificación del navegador, sin dejar rastros en el disco duro.

### Limpieza Atómica (`clearAllSessionData`)
* Tanto al hacer clic en **"Acceder al ERP"**, **"Cerrar Sesión"**, o al recibir una respuesta de desconexión del servidor (status 401), se ejecuta un borrado total e instantáneo (`localStorage.clear()` y `sessionStorage.clear()`).

### Sincronización entre Pestañas (`storage` event listener)
* Si un usuario cierra sesión o su sesión es desautorizada en una pestaña, un evento global notifica a las demás pestañas abiertas en la misma computadora para que cierren sesión y limpien memoria de inmediato.

---

## 3. ⏱️ Expiración de Tokens JWT

* Duración máxima del token JWT: **4 horas**.
* Vencimiento automático si no hay actividad o si la sesión es sobreescrita desde otro dispositivo.
