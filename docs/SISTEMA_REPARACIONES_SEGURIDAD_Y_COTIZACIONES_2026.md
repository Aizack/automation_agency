# Documentación Permanente de Cambios, Seguridad y Módulo de Cotizaciones (2026)

Este documento registra de forma permanente las reparaciones de seguridad, mejoras de arquitectura, reglas de permisos de empleados y el nuevo módulo de cotizaciones implementado en la plataforma multi-tenant.

---

## 1. 🛡️ Seguridad y Aislamiento Multi-Tenant

### Problema Resuelto
Previamente, la autenticación de usuarios de tiendas (ej. `lioro`) podía llegar a colisionar o conceder acceso indeseado al panel de SuperAdmin si no se filtraba de manera estricta el identificador único del cliente (`client_id`).

### Solución e Implementación
* **Aislamiento por Tienda (`client_id`)**:
  * Todos los endpoints de la API (`/api/clients/:clientId/...`) validan que la sesión pertenezca explícitamente al `client_id` autenticado.
  * El middleware `authMiddleware.ts` y las consultas SQL/JSONB incluyen la cláusula obligatoria `WHERE client_id = $1`.
* **Aislamiento de Módulos (Metas, Ventas, Empleados)**:
  * Los módulos de Metas Empresariales, Facturación y Empleados cargan únicamente registros pertenecientes al `client_id` de la tienda activa.

---

## 2. 🔐 Reglas de Permisos de Empleados en Inventario

### Requisito del Negocio
Los empleados encargados del inventario deben poder crear productos y agregar mercancía (reabastecer), pero **NO pueden reducir o restar stock existente de forma directa**. Solo los administradores/superadministradores tienen permiso para editar la cantidad de stock a la baja.

### Solución Implementada
* **Frontend (`SaaSErpInventory.tsx`)**:
  * Si el usuario autenticado tiene el rol `employee`, el campo de `stock` al editar un producto existente aparece deshabilitado 🔒 con una nota indicando que debe usar el botón **"Reabastecer (+)"**.
  * En el modal de reabastecimiento, la cantidad mínima está forzada a `1` (`min="1"`), impidiendo valores negativos.
* **Backend (`src/server.ts`)**:
  * El endpoint `PUT /api/clients/:clientId/products/:productId` verifica el rol del usuario en la sesión. Si un `employee` intenta enviar un valor de `stock` inferior al actual en la base de datos, el servidor rechaza la petición con código `403 Forbidden`.

---

## 3. 📋 Módulo de Cotizaciones y Prospectos Comerciales (CRM)

### Flujo de Negocio
Permite generar propuestas comerciales para clientes que solicitan precios sin comprar de inmediato, capturando sus datos como prospectos de venta y permitiendo convertir la cotización a factura con 1 solo clic.

### Componentes y Esquema de Base de Datos
* **Tabla `quotes` (`initDb.ts`)**:
  * Contiene: `quote_number`, `customer_name`, `customer_phone`, `customer_email`, `customer_document`, `items` (JSONB), `subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `status` (`pending`, `converted`, `expired`, `cancelled`), `valid_until`, `notes`, `seller_name`, `converted_invoice_id`.
* **Endpoints API (`server.ts`)**:
  * `GET /api/clients/:clientId/quotes`: Obtiene las cotizaciones del cliente.
  * `POST /api/clients/:clientId/quotes`: Crea una cotización y registra/actualiza el contacto en `agent_contacts` con estado `prospecto_cotizacion`.
  * `POST /api/clients/:clientId/quotes/:quoteId/convert-to-invoice`: Convierte la cotización en una factura de venta real (`FAC-XXXX`), descuenta stock en inventario y actualiza el estado del prospecto CRM a `cliente_activo`.
  * `DELETE /api/clients/:clientId/quotes/:quoteId`: Elimina una cotización.

### Experiencia de Usuario (`SaaSErpQuotes.tsx`)
* **Buscador Inteligente**: Permite buscar productos por **Nombre** o **SKU** con autocompletado en tiempo real.
* **Precio Unitario Modificable**: Permite editar el precio unitario del producto o servicio cotizado libremente.
* **Impresión y Compartir**: Vista de ticket imprimible y botón directo para compartir la cotización por **WhatsApp**.

---

## 4. 🎨 Sistema de Diseño Obsidian Gold & Escalado Tipográfico

### Estándar Visual Obsidian Gold
* **Paleta de Colores**:
  * Fondo base: `#141517`
  * Tarjetas e insumos internos: `#1c1e22`
  * Bordes sutiles: `#2d3036`
  * Acentos principales: `#eab308` (Dorado ámbar)
  * Valores y Totales: `#10b981` (Verde esmeralda font-mono)
* **Formulario de Facturación (`SaaSErpInvoices.tsx`)**: Rediseñado bajo el patrón Obsidian Gold, eliminando campos innecesarios (como Categoría automática) para dar mayor amplitud a la búsqueda de artículos.

### Escalado Tipográfico Global
* **Archivo**: `dashboard/src/index.css`
* **Configuración**: `html { font-size: 115%; }`
* Aumenta en un **15%** la escala de fuente para garantizar una legibilidad óptima en pantallas de ordenadores portátiles de 13" a 15".

---

## 5. ⚙️ Reglas Git y Despliegue Automático en VPS

### Reglas de Control de Versiones (`docs/GIT_WORKFLOW_RULES.md`)
* Prohibido hacer `git pull` a ciegas o sobreescribir código local en caso de fallos.
* Uso de la rama de trabajo `feature/initial-architecture-6060039206840083513`.

### Despliegue Continuo (CI/CD)
* **Workflow**: `.github/workflows/deploy.yml`
* Al hacer `git push origin feature/initial-architecture-6060039206840083513`, GitHub Actions ejecuta la conexión SSH al VPS (`209.145.50.230`), realiza la compilación del frontend con Vite (`npm run build`), reinicia la aplicación en **PM2** y recarga **Nginx**.
