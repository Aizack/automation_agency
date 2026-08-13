# Contexto de Desarrollo - Multi-tenant SaaS ERP

Este archivo sirve como memoria persistente del proyecto para sincronizar rápidamente al asistente IA al iniciar o continuar la sesión, minimizando el consumo de tokens.

---

## 🛠️ Arquitectura General
*   **Backend:** Node.js (TypeScript, Express) en [server.ts](file:///d:/Archivos/proyectos/Agencia%20Automatizaci%C3%B3n/Bot%20multi-tenant/src/server.ts).
*   **Base de Datos:** PostgreSQL en [initDb.ts](file:///d:/Archivos/proyectos/Agencia%20Automatizaci%C3%B3n/Bot%20multi-tenant/src/database/initDb.ts).
*   **Frontend:** React (TypeScript, Vite, Tailwind CSS / Vanilla CSS) en `/dashboard`.

---

## 🚀 Módulos y Funcionalidades Activas

### 1. Agenda de Citas (`SaaSErpAppointments.tsx`)
*   **Buscador predictivo del CRM:** Filtra por nombre, celular o documento de `crm_customers` en tiempo real.
*   **Campos de Fecha y Hora Separados:** Campos independientes de tipo `date` e `time` en los modales de creación y edición.
*   **Husos Horarios Protegidos:** Serialización ISO ingenua sin desplazamientos UTC en frontend.
*   **Etiquetas de Visita:** Opciones rápidas de `Examen Vista`, `Venta Lentes` y `Otros` (con campo descriptivo libre).
*   **Calendario Simplificado:** Resalta días con citas activas con un indicador discreto (sin saturar de nombres las celdas del mes).
*   **Panel de Horas Activo:** Muestra el nombre del cliente en los bloques ocupados y permite abrir la cita para edición.

### 2. Personal y Control de Asistencia (`SaaSErpEmployees.tsx`)
*   **Ficha Única de Empleado (Popup):** Al hacer clic en el nombre de un empleado, se abre un popup que integra:
    1.  **Información General:** Datos personales del empleado y PIN de marcación rápida.
    2.  **Turnos:** Marcaciones de entrada, almuerzo y salida de asistencia.
    3.  **Tareas:** Lista de tareas asignadas al empleado y formulario para crear nuevas tareas.
*   **Asignación de Tareas Automática:** El campo "Asignado Por" se auto-rellena dinámicamente con el nombre del usuario supervisor de la sesión activa (`localStorage.getItem('session_name')`).
*   **Departamentos por Defecto:** Al consultar departamentos, si el cliente tiene 0 registros, se auto-siembran `RRHH`, `Contabilidad`, `Recepción`, `Ventas`, `Logística` y `Optometría`.

### 3. CRM e Historial Clínico (`SaaSErpCRM.tsx`)
*   **Historial de Fórmulas:** El detalle del cliente en el CRM despliega de forma cronológica todas sus recetas oftálmicas y prescripciones registradas.

### 4. Chat Corporativo (`EmployeePortal.tsx`)
*   **Mensajería Directa:** El portal permite seleccionar a cualquier compañero de trabajo activo para entablar un chat privado, calculando de manera compartida el nombre del canal (`direct_{minId}_{maxId}`) en la base de datos.
