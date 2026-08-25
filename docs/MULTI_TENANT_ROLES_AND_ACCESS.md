# Modelo multi-tenant: usuarios, roles, negocio y CRM

## 1. Objetivo

Este documento define la separación correcta entre:

- la SaaS central
- cada negocio / tenant
- el usuario que administra ese negocio
- los usuarios internos del negocio
- los empleados del negocio
- los clientes del negocio (CRM)

La intención es evitar mezclar:

- un usuario de plataforma con un cliente del negocio
- un admin del negocio con un empleado normal
- un cliente de CRM con un usuario de acceso
- un negocio con otro negocio

---

## 2. Capas del sistema

### 2.1. SaaS central

La SaaS central es la plataforma que tú administras como super admin global.

Responsabilidades:

- crear y gestionar negocios / tenants
- definir estructura global
- dar acceso a los negocios
- revisar logs y salud general
- gestionar los clientes del sistema como usuario de plataforma si aplica

Ejemplo:

- tú eres el super admin global
- puedes entrar a todas las tiendas
- puedes hacer cambios globales si hace falta

---

### 2.2. Negocio / tenant

Cada negocio es un tenant dentro de la SaaS.

Ejemplo:

- client_id = client_001
- nombre = "Óptica de Prueba"

Cada negocio tiene su propia:

- base de clientes (CRM)
- inventario
- facturación
- citas
- fórmulas
- empleados
- usuarios internos
- permisos
- configuración

Cada negocio debe estar aislado de los demás.

---

### 2.3. Usuario de la plataforma

Un usuario es una cuenta con login y contraseña.

Debe estar modelado por separado de la persona del negocio.

Un usuario puede tener:

- rol global
- rol en un negocio concreto
- permisos por módulo

Ejemplo:

- usuario "test_optica"
- pertenece al tenant "Óptica de Prueba"
- tiene rol "admin_tenant"
- puede acceder al panel de administración del negocio

Este usuario NO es el mismo que el cliente del negocio.

---

### 2.4. Admin del negocio

El admin del negocio es el responsable de ese tenant.

Ejemplo:

- Carlos es propietario de Óptica Prueba
- Carlos es admin del tenant "Óptica Prueba"
- Carlos puede:
  - crear usuarios internos del negocio
  - asignar roles
  - ver KPI del negocio
  - administrar configuración del negocio
  - crear empleados
  - asignar permisos por módulo

Este admin NO debería serlo solo porque sea un cliente del CRM.

Debe existir como usuario del negocio con permisos específicos.

---

### 2.5. Empleado del negocio

Los empleados son personas internas del negocio.

Ejemplo:

- optometra
- recepcionista
- vendedor
- laboratorio
- asistente

Estos empleados pueden tener:

- perfil de persona
- datos generales
- horario
- salario
- rol de trabajo interno

Pero ese empleado no necesariamente es un usuario que pueda entrar a la plataforma con login.

Por eso hay que separar:

- employee
- user

---

### 2.6. CRM client / paciente / comprador

Los clientes del negocio o pacientes son personas que compran o interactúan con el negocio.

Ejemplo:

- María Gómez
- Juan Pérez
- cliente en factura
- paciente con cita
- persona con receta

Estos viven en la tabla `crm_customers`.

Cada CRM customer debe pertenecer a un negocio concreto:

- `crm_customers.client_id = tenant_id`

Eso significa:

- los clientes de Óptica Prueba no se mezclan con los de otra tienda
- la factura, la cita y la fórmula pertenecen a ese negocio

---

## 3. Relación entre conceptos

### 3.1. Usuario global vs negocio

Un usuario puede o no tener acceso a un negocio concreto.

Ejemplo:

- tú: acceso a todos los negocios
- Carlos: acceso solo a Óptica Prueba
- Ana: acceso solo a Óptica Prueba como optometra

Esto se resuelve con una tabla de asignación:

- `user_client_roles`

Campos sugeridos:

- `id`
- `user_id`
- `client_id`
- `role`
- `permissions_json`
- `created_at`

Ejemplo:

- user_id = 42
- client_id = client_001
- role = admin_tenant

- user_id = 42
- client_id = client_002
- role = viewer

---

### 3.2. Empleado vs usuario

Un empleado puede estar ligado a un usuario de acceso opcionalmente.

Ejemplo:

- employee_id = emp_001
- name = "Ana López"
- role_in_business = "optometra"
- linked_user_id = user_876

Pero no todo empleado tiene que ser usuario.

Y no todo usuario tiene que ser empleado.

Esto permite separar:

- identidad laboral
- identidad digital de acceso

---

### 3.3. Cliente del negocio vs usuario del negocio

Un cliente del CRM no es un usuario de plataforma.

Ejemplo:

- cliente: "María Gómez"
- no tiene login
- no tiene contraseña
- no tiene permisos a módulos
- puede ser paciente, comprador o cliente

Eso debe quedar separado del acceso del sistema.

---

## 4. Modelo de base de datos recomendado

### 4.1. Tabla `clients`

Representa cada negocio / tenant.

Campos típicos:

- `id`
- `name`
- `status`
- `created_at`

---

### 4.2. Tabla `users`

Representa cuentas de acceso a la plataforma.

Campos típicos:

- `id`
- `username`
- `password_hash`
- `email`
- `full_name`
- `is_global_admin`
- `created_at`

---

### 4.3. Tabla `user_client_roles`

Representa la relación usuario ↔ negocio ↔ rol.

Ejemplo:

- user_id: X
- client_id: client_001
- role: admin
- permissions: {modules: ["inventory","billing","crm","optometry"]}

Esto es la pieza clave del multi-tenant.

---

### 4.4. Tabla `employees`

Representa personas internas del negocio.

Ejemplo:

- `id`
- `client_id`
- `full_name`
- `role`
- `document_number`
- `email`
- `phone`
- `user_id` (opcional)

---

### 4.5. Tabla `crm_customers`

Representa clientes, pacientes o compradores del negocio.

Ejemplo:

- `id`
- `client_id`
- `name`
- `last_name`
- `document_number`
- `phone`
- `email`
- `address`

La regla importante es:

- cada customer pertenece a un negocio concreto
- no se comparte entre tenants

---

### 4.6. Tabla `invoices`

La factura pertenece al negocio y al cliente del negocio.

Ejemplo:

- `id`
- `client_id`
- `customer_id` (si se usa CRM customer)
- `customer_name`
- `customer_document_number`
- `total_amount`

Esto permite relacionar facturas con clientes reales del negocio.

---

### 4.7. Tabla `lab_jobs`

Relaciona el trabajo de laboratorio con el cliente del negocio.

Ejemplo:

- `id`
- `client_id`
- `customer_id`
- `invoice_id`
- `product_name`
- `status`

---

## 5. Caso de ejemplo: Óptica Prueba

### escenario

- tú eres el super admin global
- Carlos es el dueño de Óptica Prueba
- Carlos es también admin del negocio
- test_optica es el usuario con acceso a la tienda de Óptica Prueba

### modelado

- `clients`: Óptica Prueba
- `users`: test_optica
- `user_client_roles`:
  - user: test_optica
  - client: Óptica Prueba
  - role: admin_tenant
- `employees`: Carlos, optometra, recepcionista, etc.
- `crm_customers`: clientes de la tienda, pacientes y compradores

### permisos esperados

Carlos/admin_tenant puede crear:

- otros usuarios del negocio
- roles para cada usuario
- empleados
- permisos por módulo
- clientes del CRM
- citas, recetas, facturas, lab jobs

Un optometra puede tener:

- acceso a optometría
- citas
- fórmulas
- historial clínico

Un vendedor puede tener:

- facturación
- inventario
- atención al cliente

Un laboratorio puede tener:

- tablero de trabajos de laboratorio
- actualización de estados

---

## 6. Qué falta en el proyecto actual

Tal como lo describes, el proyecto actual está mezclando estas dos capas:

- `employees` se usa como personal interno
- pero no existe una capa real de usuarios de negocio con roles y permisos
- y tampoco hay un panel de administración de accesos por negocio

Eso significa que:

- hay empleados, pero no usuarios del negocio
- hay logins, pero no separación por tenant
- hay roles, pero no permisos por módulo
- hay portal del negocio, pero no administración de usuarios para cada tenant

---

## 7. Regla de diseño final

La separación correcta es:

- `users` = acceso a la plataforma
- `clients` = negocio / tenant
- `user_client_roles` = acceso del usuario al negocio con rol
- `employees` = personal interno del negocio
- `crm_customers` = clientes / pacientes del negocio

Nunca mezclar:

- cliente del negocio con usuario del sistema
- empleado del negocio con admin del negocio
- dueño del negocio con super admin global
- tenant con otra tienda distinta

---

## 8. Recomendación concreta para esta app

Debes implementar estas piezas antes de seguir ampliando módulos:

1. panel de administración de usuarios por negocio
2. roles por módulo
3. permisos por tenant
4. separación clara entre `employee` y `user`
5. creación del admin del tenant desde la consola de negocio
6. lectura de permisos dinámicamente en frontend y backend

Eso permitirá que:

- el admin de Óptica Prueba pueda crear su staff
- el optometra tenga acceso solo a optometría
- el vendedor tenga acceso solo a ventas y CRM
- el laboratorio vea solo trabajo de laboratorio
- tú sigas siendo super admin global de la SaaS

---

## 9. Resumen corto

- tú = super admin global
- Carlos = admin de Óptica Prueba
- test_optica = usuario del negocio con rol admin_tenant
- empleados = personal del negocio
- crm_customers = clientes del negocio
- cada negocio tiene su propio aislamiento y su propio conjunto de usuarios, clientes, facturas y trabajos

Eso es el modelo multi-tenant correcto para esta app.
