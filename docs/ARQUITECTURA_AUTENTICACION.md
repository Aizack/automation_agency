# Arquitectura de Autenticación y Modelo de Identidad

Documento generado el 2026-08-20. Actualizado el 2026-08-21 con decisión de login unificado de dos pestañas.

---

## 1. Entidades de identidad — definición final

Estas cinco entidades son distintas y nunca deben mezclarse:

| Entidad | Tabla | Descripción |
|---------|-------|-------------|
| **Negocio / Tenant** | `clients` | La óptica, el restaurante, el consultorio. No es una persona. |
| **Usuario de plataforma** | `users` | Cuenta de acceso digital. Históricamente existía pero se reemplaza por el modelo de empleados. |
| **Acceso por negocio** | `user_client_roles` | Pivote usuario ↔ tenant ↔ rol ↔ permisos. |
| **Empleado del negocio** | `employees` | Personal interno. Tiene ficha laboral, salario, horario, rol de trabajo. |
| **Cliente del negocio** | `crm_customers` | Pacientes, compradores. No tienen login. Nunca son usuarios. |

---

## 2. Modelo de autenticación — decisiones tomadas

### 2.1 Identificador de usuario

**Decisión actual corregida: el login de negocio y el login de empleados están separados por intención y por tipo de credencial.**

- El acceso del negocio se hace con **usuario + contraseña larga** para usuarios admin del tenant o dueños del negocio.
- El acceso del empleado se hace con **teléfono + PIN de 6 dígitos**.
- El teléfono es universal, ya está en la tabla `employees`, y es el canal principal del sistema (WhatsApp).
- El PIN de 6 dígitos es la nueva convención para trabajadores; se reemplaza el PIN de 4 dígitos heredado para evitar conflicto con contraseñas cortas.
- El `username` todavía tiene sentido para el negocio/admin del tenant, pero no reemplaza el acceso de personal.

### 2.2 Fuente de datos única

**Decisión: `employees` es la fuente de verdad para todo el personal del negocio.**

La tabla `employees` ya tiene:
- `phone` — identificador único dentro del negocio
- `pin` — autenticación de 6 dígitos
- `client_id` — el negocio al que pertenece (tenant context implícito)
- `role` — rol de trabajo que determina qué módulos puede ver

No se necesita una tabla de usuarios separada para el personal de cada negocio.

### 2.3 Distinción correcta entre negocio y personal

Hay dos tipos de acceso distintos y no intercambiables:

1. **Negocio / admin del tenant**
   - Usuario que administra el negocio o la plataforma.
   - Loguea con `username` o `user_id` + contraseña larga.
   - Puede crear más usuarios del negocio y asignar permisos.
   - Es el flujo de administración del negocio y del ERP.

2. **Empleado del negocio**
   - Persona interna del negocio.
   - Loguea con `phone` + `pin` de 6 dígitos.
   - Su acceso se limita por `department` / `role` y por módulos habilitados.
   - Puede entrar al ERP o al portal personal, según el rol.

Esto reemplaza la antigua idea de que “todo mundo era usuario” o que el empleado usaba el mismo login del negocio.

### 2.4 Unicidad del teléfono

**Decisión: el teléfono es único dentro del negocio, no globalmente.**

```
Óptica:      573001234567 → María López (recepcionista)
Restaurante: 573001234567 → María López (cajera) — persona diferente
```

Son cuentas completamente aisladas. Cada una pertenece a su tenant por `client_id`.

### 2.5 URL de acceso

**Decisión: una sola URL `diazlab.online` para todos.**

- No se expone el `client_id` en la URL.
- El contexto del tenant se obtiene del `client_id` en la tabla `employees` tras autenticar.
- No se necesita URL por tenant para el login.

### 2.6 Super administrador global

**Decisión: cuenta separada, no toca el modelo de empleados.**

El super admin (dueño de la plataforma SaaS) sigue usando el login de la tabla `clients` con `username = 'admin'`. Tiene acceso a todos los tenants.

---

## 3. Portales de acceso

### Una sola URL de entrada: `diazlab.online`

El login tiene **dos pestañas** en la misma pantalla. No hay paths separados por tipo de usuario.

```
┌─────────────────────────────────────┐
│         Diaz Lab Automations        │
│                                     │
│   [ Negocio ]     |     [ Empleado ]│
│                                     │
│  Pestaña Negocio:                   │
│  ├── Usuario (username)             │
│  └── Contraseña                     │
│                                     │
│  Pestaña Empleado:                  │
│  ├── Teléfono                       │
│  └── PIN 6 dígitos                 │
└─────────────────────────────────────┘
```

### Pestaña "Negocio"
- **Credenciales:** username + password larga
- **Fuente:** tabla `clients` o `users` del tenant
- **Quiénes entran:** super admin global, dueños del negocio, usuarios administrativos del negocio
- **Endpoint:** `POST /api/login` (existente)
- **Redirige a:** `AdminDashboard` (admin) o `ClientDashboard` (client)

### Pestaña "Empleado"
- **Credenciales:** teléfono + PIN de 6 dígitos
- **Fuente:** tabla `employees`
- **Quiénes entran:** todo el personal del negocio con acceso a la plataforma
- **Endpoint:** `POST /api/auth/employee-login` (existente)
- **Redirige a:** ERP según `role` o al portal personal según el acceso registrado

### Importante: el portal personal no debe ser un segundo login

El flujo correcto es:

- El empleado entra por `diazlab.online` con la pestaña "Empleado".
- Si tiene acceso ERP, se reenvía al ERP del negocio.
- Si no tiene acceso ERP, se reenvía al portal personal de empleado (`/empleados` o la vista `employee`).
- El portal personal no debe abrir otra pantalla de login encima; debe ser la vista interna del empleado autenticado.

### Acceso según rol del empleado

| Rol en `employees` | Módulos accesibles en ERP |
|---|---|
| `admin` | Todo el ERP + gestión de personal |
| `vendedor` | Facturación, CRM, inventario (lectura) |
| `optometra` | Citas, fórmulas, historial clínico |
| `laboratorio` | Tablero de lab jobs, actualización de estados |
| `recepcion` | Citas, CRM básico |
| `domicilios` | Portal personal (Jornada, Tareas, RRHH) |

### ¿Y el `/empleados`?
- Sigue existiendo como ruta de la SPA para el **portal personal del empleado** (Jornada, Tareas, RRHH, Nómina, Chat IA)
- Ya NO es una pantalla de login separada — el empleado entra siempre por `diazlab.online` pestaña "Empleado"
- Tras autenticarse, el sistema decide si redirige al ERP o al portal personal según el rol
- Si la vista del portal personal se abre sin token válido o sin estado persistido, se está rompiendo la sesión y se debe corregir el guard de rutas

### Super admin
- Entra por pestaña **"Negocio"** con `username = 'admin'`
- Transparente para el usuario — la pestaña es la misma, el sistema detecta el rol

### Acceso según rol del empleado

| Rol en `employees` | Módulos accesibles en ERP |
|---|---|
| `admin` | Todo el ERP + gestión de personal |
| `vendedor` | Facturación, CRM, inventario (lectura) |
| `optometra` | Citas, fórmulas, historial clínico |
| `laboratorio` | Tablero de lab jobs, actualización de estados |
| `recepcion` | Citas, CRM básico |
| `domicilios` | Portal personal (Jornada, Tareas, RRHH) |

### ¿Y el `/empleados`?
- Sigue existiendo como ruta de la SPA para el **portal personal del empleado** (Jornada, Tareas, RRHH, Nómina, Chat IA)
- Ya NO es una pantalla de login separada — el empleado entra siempre por `diazlab.online` pestaña "Empleado"
- Tras autenticarse, el sistema decide si redirige al ERP o al portal personal según el rol

### Super admin
- Entra por pestaña **"Negocio"** con `username = 'admin'`
- Transparente para el usuario — la pestaña es la misma, el sistema detecta el rol

---

## 4. Flujo de autenticación objetivo

```
Usuario abre diazlab.online
        ↓
┌─────────────────────────────┐
│  Pestaña Negocio            │  → username + password
│  → POST /api/login          │  → JWT: { id, role: 'admin'|'client' }
│  → AdminDashboard o         │
│    ClientDashboard          │
└─────────────────────────────┘
        ó
┌─────────────────────────────┐
│  Pestaña Empleado           │  → phone + PIN (6 dígitos)
│  → POST /api/auth/          │  → JWT: { employeeId, clientId,
│    employee-login           │           employeeRole, permissions[] }
│  → ERP según role o         │
│    Portal personal          │
└─────────────────────────────┘
```

### 4.1 Regla crítica sobre la pantalla de login

La pestaña "Empleado" no puede abrir una segunda pantalla de autenticación detrás del portal personal.

El flujo correcto debe ser:

1. Login de empleado en `Login`.
2. Autenticación exitosa con token JWT.
3. Redirección directa a la vista correspondiente:
   - `ClientDashboard` si tiene permisos ERP
   - `EmployeePortal` si no tiene ERP
4. El guard de sesión debe validar el token y decidir la vista sin volver a renderizar el `Login`.

Si el sistema vuelve a la pantalla de login, significa que hay un guard o un `useEffect` que está anulando el estado persistido o que la vista `employee` se está perdiendo al recargar la ruta.

---

## 5. Slug por negocio (para futuro)

Se propone agregar campo `slug` a la tabla `clients`:

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
```

- Ejemplo: `"Óptica de Prueba"` → slug `opticadeprueba`
- Se usa para URL amigable: `diazlab.online/opticadeprueba`
- Se genera automáticamente del nombre del negocio con resolución de conflictos
- Prepara el terreno para subdominios en el futuro: `opticadeprueba.diazlab.online`
- **No afecta el login actual** — es solo un punto de entrada visual futuro

---

## 6. Estrategia mobile

**Decisión: Capacitor o PWA encima del React existente.**

- El portal de empleados ya renderiza bien en móvil (confirmado visualmente)
- Capacitor envuelve el mismo código React sin reescribir nada
- Habilita: notificaciones push, cámara nativa, GPS nativo
- Alternativa inmediata sin App Store: PWA guardada desde Chrome/Safari
- El mercado objetivo (negocios pequeños en Latinoamérica) acepta ambas opciones

---

## 7. Qué NO hacer (anti-patrones descartados)

| Anti-patrón | Por qué se descartó |
|---|---|
| Username auto-generado | Innecesario en sistema interno; el teléfono ya identifica |
| Username único por negocio con URL de tenant | Requiere rediseño del login y manejo de contexto en URL |
| Tabla `users` como fuente de auth para empleados | Duplica datos que ya están en `employees` |
| Login con email | No universal en el mercado objetivo |
| Subdominio wildcard ahora | Requiere infraestructura adicional (DNS, SSL wildcard) |
| OTP por WhatsApp como único auth | Empleados no interactúan con WA para acceder a la plataforma |
| Path `/empleados` como login separado | Una sola URL es más limpia; las pestañas resuelven la separación de flujos |
| Tercer path para empleados con acceso ERP | Innecesario; el role en el JWT determina qué ve cada empleado |

---

## 8. Soluciones recomendadas para remediar la confusión actual del login

### Opción A — Modo híbrido detectado por pestaña

**Recomendado por claridad UX.**

- En la pestaña "Negocio": campo `usuario` + contraseña larga.
- En la pestaña "Empleado": campo `teléfono` + PIN de 6 dígitos.
- Si se quiere mantener una sola pantalla, se puede añadir un selector `Usuario | Número celular` encima del campo de login en la pestaña de negocio.
- El valor del `password` cambia según el modo:
  - `usuario`: contraseña larga del negocio
  - `número celular`: PIN de 6 dígitos del empleado

### Opción B — Modo dual con tabs distintos pero no anidados

- Mantener `Negocio` y `Empleado` como tabs distintos claros.
- La pestaña `Empleado` debe autenticarse y salir directamente al `EmployeePortal` o al ERP.
- No volver a renderizar `Login` dentro del flujo del empleado.

### Opción C — Separa la vista de autenticación del portal personal

- `Login` solo deber ser responsable del acceso inicial.
- `EmployeePortal` solo debe renderizarse después de un token válido.
- La ruta `/empleados` no debe disparar un `Login` si ya existe sesión válida.

### Recomendación final

La combinación más segura y menos confusa es:

1. `Negocio` = usuario + contraseña larga
2. `Empleado` = teléfono + PIN de 6 dígitos
3. `EmployeePortal` = vista interna, nunca una segunda pantalla de login
4. `App` debe priorizar el estado persistido (`current_view`, token, role) antes de volver a `Login`

Esto elimina la ambigüedad que está provocando la confusión visual y la sensación de “doble autenticación”.

