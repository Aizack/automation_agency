# Arquitectura de Tareas y CRM - Documentación del Sistema

Esta documentación detalla las propiedades añadidas, la estructura de la base de datos y la dinámica de interacción entre el módulo administrativo y el portal del empleado.

---

## 1. Esquema de Propiedades y Base de Datos

Se han modificado y creado tablas en PostgreSQL para segmentar el CRM y gestionar las tareas con control de estado y auditoría obligatoria.

### Tabla: `crm_customers`
Almacena la información de contacto y prescripciones de personas y empresas.

| Propiedad | Tipo | Descripción |
| :--- | :--- | :--- |
| `customer_type` | `VARCHAR(20)` | `persona` (por defecto) o `empresa`. |
| `name` | `VARCHAR(255)` | Nombre del cliente o Nombre comercial de la empresa. |
| `last_name` | `VARCHAR(255)` | Apellidos (nulo para empresas). |
| `document_type` | `VARCHAR(20)` | `CC`, `CE` (para personas) o `NIT` (para empresas). |
| `document_number`| `VARCHAR(50)` | Número único de identificación fiscal o de ciudadanía. |

### Tabla: `employee_tasks`
Gestiona el listado de actividades y visitas asignadas o creadas por el trabajador.

| Propiedad | Tipo | Descripción |
| :--- | :--- | :--- |
| `task_type` | `VARCHAR(20)` | `tarea` (común, por defecto) o `visita` (CRM). |
| `target_customer_id` | `UUID` | Llave foránea a `crm_customers.id` (para asociar visitas). |
| `due_date` | `TIMESTAMP` | Fecha y hora límite consolidadas en formato ISO. |
| `status` | `VARCHAR(50)` | Estado de avance: `pendiente`, `en proceso` o `terminado`. |

### Tabla: `employee_task_updates` (Nueva)
Bitácora de auditoría. Cada cambio de estado de una tarea o campaña requiere registrar una fila en esta tabla.

| Propiedad | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `UUID (PK)` | Identificador autogenerado de la actualización. |
| `task_id` | `UUID` | ID de la tarea (`employee_tasks`) o campaña (`field_visits`). |
| `old_status` | `VARCHAR(50)` | Estado anterior de la tarea antes del cambio. |
| `new_status` | `VARCHAR(50)` | Nuevo estado seleccionado por el trabajador. |
| `report_text` | `TEXT` | Texto obligatorio del reporte de avances ingresado. |
| `created_by_name`| `VARCHAR(255)` | Nombre de quien realizó la actualización. |
| `created_at` | `TIMESTAMP` | Timestamp del registro. |

---

## 2. Esquema General de Interacciones (Mermaid)

Este diagrama representa cómo se conectan el CRM, el Programador de Tareas, el Historial de Avances y el Portal de Empleado de manera unificada.

```mermaid
graph TD
    %% Base de datos e interfaces
    subgraph "Base de Datos (PostgreSQL)"
        DB_CRM["crm_customers (Clientes/Empresas)"]
        DB_TASKS["employee_tasks (Tareas/Visitas)"]
        DB_VISITS["field_visits (Campañas de Campo)"]
        DB_UPDATES["employee_task_updates (Historial/Bitácora)"]
    end

    subgraph "Portal Administrativo (SaaS)"
        ADMIN_CRM["Ficha CRM: Pestañas Persona vs Empresa"]
        ADMIN_EMP["Gestor de Empleados (Asignador Tareas con Fecha/Hora)"]
        ADMIN_CAMP["Planificador Campañas (Buscador Predictivo NIT)"]
    end

    subgraph "Portal del Empleado"
        EMP_LIST["Lista de Actividades Unificada (Tareas + Campañas)"]
        EMP_MODAL["Detalle Tarea (Auditoría con Reporte Obligatorio)"]
        EMP_NEW["Creador Tareas/Visitas (Buscador Predictivo CRM)"]
    end

    %% Relaciones de Base de Datos
    DB_CRM -->|target_customer_id| DB_TASKS
    DB_CRM -->|location_customer_id| DB_VISITS
    DB_TASKS -->|task_id| DB_UPDATES
    DB_VISITS -->|task_id/visit_id| DB_UPDATES

    %% Interacciones de Vista Administrativa
    ADMIN_CRM -->|Persiste tipo y NIT| DB_CRM
    ADMIN_EMP -->|Asigna Fecha/Hora limite| DB_TASKS
    ADMIN_CAMP -->|Vincula campaña a empresa| DB_VISITS

    %% Interacciones del Empleado
    DB_TASKS -->|Mapea tareas| EMP_LIST
    DB_VISITS -->|Mapea visitas como tareas| EMP_LIST
    EMP_LIST -->|Abre| EMP_MODAL
    EMP_MODAL -->|Inserta reporte| DB_UPDATES
    EMP_MODAL -->|Modifica estado| DB_TASKS
    EMP_MODAL -->|Modifica estado campaña| DB_VISITS
    EMP_NEW -->|Crea| DB_TASKS
    DB_CRM -->|Buscador predictivo| EMP_NEW
```

---

## 3. Flujo Detallado por Secciones

### A. Sección CRM y Registro de Clientes

Este flujo muestra cómo el formulario en el panel administrativo adapta los campos según la pestaña activa del CRM para evitar registros inconsistentes.

```mermaid
sequenceDiagram
    participant Usuario as Administrador
    participant UI as CRM View (SaaSErpCRM)
    participant Modal as Modal de Registro
    participant DB as crm_customers

    alt Pestaña Activa: Personas
        Usuario->>UI: Clic en "+ Nuevo Cliente"
        UI->>Modal: Inicializa tipo = "persona", documento = "CC"
        Modal->>Modal: Oculta campos corporativos. Muestra Apellidos y Fórmulas
        Usuario->>Modal: Completa Datos y Guarda
        Modal->>DB: POST /crm-customers (tipo: persona)
    else Pestaña Activa: Empresas
        Usuario->>UI: Clic en "+ Nueva Empresa"
        UI->>Modal: Inicializa tipo = "empresa", documento = "NIT"
        Modal->>Modal: Oculta Apellidos y Fórmulas. Muestra "Nombre Empresa" e "Identificación de Empresa (NIT)"
        Usuario->>Modal: Completa Datos y Guarda
        Modal->>DB: POST /crm-customers (tipo: empresa)
    end
```

---

### B. Módulo de Empleados: Ciclo de Vida de una Tarea y Auditoría

Flujo de interacción cuando un empleado visualiza una tarea asignada, cambia su estado, y se le exige ingresar un avance detallado por escrito.

```mermaid
sequenceDiagram
    participant E as Empleado
    participant Portal as Portal Empleado (EmployeePortal)
    participant Server as Servidor Express (server.ts)
    participant DB as PostgreSQL

    E->>Portal: Entra a pestaña "Mis Tareas"
    Portal->>Server: GET /employees/:id/tasks
    Server->>DB: Query unificada (tasks + field_visits)
    DB-->>Server: Retorna lista de tareas y visitas
    Server-->>Portal: Muestra tareas ordenadas con color de estado (Rojo, Amarillo, Verde, Azul)
    
    E->>Portal: Clic en tarea (abre detalle)
    Portal->>Server: GET /tasks/:id/updates (Carga historial)
    Server-->>Portal: Retorna timeline de comentarios históricos
    
    E->>Portal: Selecciona "Nuevo Estado" y escribe reporte de avance
    E->>Portal: Clic en "Guardar Reporte"
    
    alt Reporte vacío o incompleto
        Portal->>E: Muestra error (campo obligatorio)
    else Reporte completo
        Portal->>Server: POST /tasks/:id/updates (new_status, report_text)
        Server->>DB: INSERT INTO employee_task_updates
        Server->>DB: UPDATE employee_tasks / field_visits SET status = new_status
        Server-->>Portal: Confirmación exitosa
        Portal->>Portal: Recarga lista y refresca historial en caliente
    end
```

---

### C. Autogestión de Visitas con Buscador Predictivo

Muestra cómo el empleado programa una visita y consulta contactos corporativos y personales del CRM en tiempo real.

```mermaid
sequenceDiagram
    participant E as Empleado
    participant Modal as Modal "Nueva Tarea/Visita"
    participant DB as CRM Customers Table

    E->>Modal: Selecciona tipo "Visita (CRM)"
    Modal->>Modal: Habilita el input de búsqueda predictiva
    E->>Modal: Escribe en el buscador (Ej: "Santa Fe")
    Modal->>DB: Filtra clientes cargados (name, last_name, document_number)
    DB-->>Modal: Retorna coincidencias
    Modal->>E: Despliega sugerencias predictivas
    E->>Modal: Selecciona empresa "Óptica Santa Fe (NIT: 900500100)"
    Modal->>Modal: Fija target_customer_id y autocompleta el título de la visita
    E->>Modal: Clic en "Programar Actividad"
    Modal->>DB: POST /tasks (con target_customer_id, task_type = "visita")
```
