# Arquitectura y Estrategia de Landings: `frant.app` vs `diazlab.online`

**Fecha de documentación:** 23 de octubre de 2026  
**Propósito:** Guía maestra de producto, diseño, modelo comercial y cumplimiento (Google OAuth / Meta) para la separación y diseño de las páginas principales de **Frant ERP** (`frant.app`) y **Diaz Lab Automation** (`diazlab.online`).

---

## 1. Visión General y Separación de Dominios

El ecosistema cuenta con dos dominios con propósitos estrictamente diferenciados:

| Dominio | Rol Principal | Enfoque de Contenido |
| :--- | :--- | :--- |
| **`https://frant.app`** | **Producto SaaS (Frant ERP)** | Habla **única y exclusivamente del software Frant ERP**: sus módulos operativos, verticales por rubro, integraciones nativas (Gmail OAuth para envío de facturas/cotizaciones, WhatsApp Cloud API, DIAN) y acceso directo al Login (`/login`). **No mezcla servicios externos de agencia.** |
| **`https://diazlab.online`** | **Casa Matriz / Agencia (`Diaz Lab Automation`)** | Presenta la agencia tecnológica, servicios de ingeniería a medida (websites, automatización RPA, integraciones, IA personalizada) y la **estructura de planes y paquetes comerciales** (tanto de Frant ERP individual como paquetes combinados de ERP + Servicios Diaz Lab). |

---

## 2. Estructura Comercial y Modelo de Precios (3 Niveles)

Los precios fijos no deben quemarse en la portada de `frant.app` mientras se terminan de definir; en su lugar, la estructura comercial que se presentará en `diazlab.online` responde a la siguiente lógica modular:

1. **Nivel 1 — Acceso Base a Frant ERP:**
   - Costo base por el acceso a la plataforma SaaS (núcleo operativo, gestión básica, multi-tenant seguro).
2. **Nivel 2 — Módulos y Funciones Adicionales del ERP:**
   - Costos escalables según las funciones o capacidades activadas dentro del ERP (ej. Facturación Electrónica DIAN, Agente IA de WhatsApp 24/7, Hojas de ruta de domicilios, módulos especializados de Óptica/Laboratorio o Restaurante/KDS, sucursales adicionales).
3. **Nivel 3 — Paquetes Integrales (`Frant ERP + Servicios Diaz Lab Automation`):**
   - Paquetes corporativos o "llave en mano" que combinan el software Frant ERP con servicios de agencia de Diaz Lab (desarrollo de sitios web/e-commerce a medida, flujos RPA personalizados, analítica avanzada e implementación dedicada).

---

## 3. Especificaciones para la Landing de `frant.app` (Exclusiva del ERP)

### 3.1. Qué DEBE incluir `frant.app`
1. **Propuesta de Valor Exclusiva del ERP:**
   - Sistema ERP & POS en la nube para comercios y empresas.
   - **Facturación y Caja:** Punto de Venta (POS), Arqueo y Control de Caja Diario (con reloj en tiempo real sincronizado por país), Facturación Electrónica DIAN, Cotizaciones y Cartera (cuentas por cobrar y abonos).
   - **Despacho por Correo y WhatsApp (Clave para Google y Meta):** Explicación clara de cómo el comercio conecta su propia cuenta de Gmail (`gmail.send`) y WhatsApp Business para enviar facturas en PDF, recibos de caja y cotizaciones a sus clientes finales.
   - **Inventario y Logística:** Control de stock, variantes, alertas de stock mínimo, traslados entre sedes y hojas de ruta de domicilios.
   - **Verticales por Rubro:**
     - *Ópticas y Salud Visual:* Fórmulas refractivas, órdenes de laboratorio, historia clínica y recordatorios de citas.
     - *Restaurantes y Gastronomía:* Mapa de mesas, comandero, pantalla de cocina (KDS) y carta digital QR.
     - *Retail, Moda y Comercio General:* Código de barras, catálogo público digital y CRM.
2. **Sección de Planes / Precios en `frant.app`:**
   - **Sin precios fijos quemados por ahora.**
   - Debe mostrar un bloque limpio de *"Planes según las funciones de tu negocio"* con un llamado a la acción (CTA) que redirija a **`https://diazlab.online`** (donde se detallan los planes de Frant y los paquetes conjuntos con Diaz Lab) o al WhatsApp comercial.
3. **Acceso al Sistema:**
   - Botón destacado de **"Iniciar Sesión"** que lleva a la vista de Login (`https://frant.app/login`).

### 3.2. Qué NO debe incluir `frant.app`
- ❌ No incluir secciones de "Servicios de Ingeniería Diaz Lab", "Desarrollo de Websites a medida" o "Consultoría RPA externa".
- ❌ No incluir la barra flotante de selección de propuestas de diseño (`Propuesta 1 / Propuesta 2 / Propuesta 3`).
- ❌ No mostrar tablas con tarifas provisionales no aprobadas.

---

## 4. Especificaciones para la Landing de `diazlab.online` (Agencia + Planes)

1. **Identidad:** Portal oficial de **Diaz Lab Automation** (Barranquilla, Atlántico, Colombia).
2. **Catálogo de Soluciones:**
   - Presentación de **Frant ERP** como su producto estrella SaaS, explicando el esquema de costos:
     - Costo de acceso al ERP.
     - Costo por módulos/funciones adicionales del ERP.
   - **Paquetes Combinados (ERP + Agencia):** Planes donde el comercio adquiere Frant ERP + diseño de su Website + automatizaciones de procesos + agentes de IA.
   - **Servicios de Ingeniería y Automatización:** Desarrollo web, integraciones API/Webhooks, RPA y consultoría tecnológica.

---

## 5. Lineamientos de Diseño Visual

- **Estilo Definido:** **Wabi-Sabi Editorial** (fijado como tema único, sin selector flotante de temas).
- **Paleta de Colores:**
  - Fondo principal papel artesanal: `#F6F4EE` / `#FAF8F3`
  - Tarjetas y contenedores: `#FFFFFF` con bordes cálidos `#E2DFD7`
  - Texto principal tinta oscura: `#161616`
  - Texto secundario piedra: `#6B6862` / `#76746E`
  - Acento principal bermellón: `#D9381E` (hover `#B82B14`)
- **Tipografía:**
  - Títulos editoriales: `Instrument Serif` (Georgia serif)
  - Cuerpo de interfaz: `Plus Jakarta Sans`
  - Datos técnicos, precios y etiquetas: `JetBrains Mono`

---

## 6. Requisitos Técnicos de Cumplimiento (Google OAuth & Meta Review)

Para que Google Cloud (`Project ID: frant-bot` / `1066241650433`) y Meta for Developers mantengan aprobada la verificación:

1. **Homepage Pública sin Login Wall:**
   - La raíz `https://frant.app/` debe mostrar la Landing Page pública del ERP sin exigir login de entrada. El formulario de acceso vive en `https://frant.app/login` (o al hacer clic en *"Iniciar Sesión"*).
2. **Enlaces Legales Visibles en el Footer de Ambas Páginas:**
   - Política de Privacidad: `https://frant.app/privacy` (Servida por `src/services/privacyPolicy.ts` — ya incluye cláusulas de cifrado TLS 1.2/1.3, AES-256 en reposo, RBAC, purga inmediata 0 días y prohibición de entrenamiento de IA con datos de Google Workspace).
   - Términos y Condiciones: `https://frant.app/terms` (Servida por `src/services/termsOfService.ts`).
3. **Credenciales de Prueba Activas para Revisores de Google:**
   - **Login URL:** `https://frant.app/login`
   - **Usuario:** `google_reviewer`
   - **Contraseña:** `GoogleReview2026!`
   - **Permisos:** Rol `admin_tenant` sobre la tienda de prueba `client_test_optica` (*Hoshi Services*), **sin acceso a Super Admin** (`is_global_admin = false`) y sin bloqueos de 2FA.

---

## 7. Archivos Clave en el Repositorio

- [`dashboard/src/App.tsx`](file:///d:/Archivos/proyectos/Agencia%20Automatización/Bot%20multi-tenant-exp/dashboard/src/App.tsx): Enrutador principal que decide qué vista renderizar según el dominio (`frant.app` vs `diazlab.online`) y la ruta (`/`, `/login`, `/landing`).
- [`dashboard/src/components/LandingPage.tsx`](file:///d:/Archivos/proyectos/Agencia%20Automatización/Bot%20multi-tenant-exp/dashboard/src/components/LandingPage.tsx): Componente actual de la Landing Page que debe dividirse/adaptarse en las dos vistas (`FrantLandingPage` para `frant.app` y `DiazLabLandingPage` para `diazlab.online`).
- [`src/services/privacyPolicy.ts`](file:///d:/Archivos/proyectos/Agencia%20Automatización/Bot%20multi-tenant-exp/src/services/privacyPolicy.ts): Política de privacidad pública en `/privacy`.
- [`src/services/termsOfService.ts`](file:///d:/Archivos/proyectos/Agencia%20Automatización/Bot%20multi-tenant-exp/src/services/termsOfService.ts): Términos de servicio públicos en `/terms`.
