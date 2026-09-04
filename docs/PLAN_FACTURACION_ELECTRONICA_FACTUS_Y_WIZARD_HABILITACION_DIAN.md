# 📄 DOCUMENTO OFICIAL DE ARQUITECTURA Y UX: INTEGRACIÓN FACTUS API Y WIZARD DE HABILITACIÓN DIAN (ESTILO ALEGRA)

> **Fecha:** 3 de Septiembre, 2026  
> **Sistema:** ERP Multi-Tenant Multi-Sede (Aizack / Automation Agency)  
> **Estado:** Documento Oficial de Diseño, Arquitectura y UX  
> **Proveedor Tecnológico:** Factus API (`developers.factus.com.co`)  
> **Filosofía UX:** **Zero-Barreras (Single-Flow Onboarding)**. *Reducir fricción eliminando trámites de certificados individuales y guiando al usuario paso a paso.*

---

## 1. 🔍 DIAGNÓSTICO Y DECISIÓN DE PROVEEDOR TECNOLÓGICO

### Por qué elegimos **Factus API** sobre otros integradores:
1. **Factus es Proveedor Tecnológico (PT) Oficial:** Cuenta con la resolución y acreditación de la DIAN.
2. **Firma Digital Incluida (Costo $0 para el cliente):** Al operar como PT, Factus firma legalmente las facturas usando su propio **Certificado Digital Maestro de Proveedor**.
3. **Cero Fricción para el Negocio Final:** El cliente final (las ópticas o cualquier tienda) **NO tiene que tramitar, pagar ni realizar pruebas biométricas de certificados digitales**.
4. **API REST Moderna (OAuth2):** Autenticación mediante `POST /oauth/token` y llamadas en formato JSON limpio para emisión de Facturas Electrónicas, Notas Crédito, Débito y Documentos POS.

---

## 2. 🎨 ARQUITECTURA DE EXPERIENCIA DE USUARIO (WIZARD ESTILO ALEGRA)

El proceso de habilitación tributaria se integrará en nuestro ERP mediante un **Wizard Stepper de 5 Pasos** accesible desde el menú de la tienda:

```
┌──────────────────────────────────────────────────────────────────────────┐
│              WIZARD DE HABILITACIÓN DIAN & FACTURACIÓN (ERP)             │
├───────────┬───────────┬───────────────┬────────────────┬─────────────────┤
│ PASO 1    │ PASO 2    │ PASO 3        │ PASO 4         │ PASO 5          │
│ Datos     │ Registro  │ Modos de      │ Set de Pruebas │ Numeraciones &  │
│ Empresa   │ DIAN      │ Operación     │ (TestSetID)    │ Prefijos        │
└───────────┴───────────┴───────────────┴────────────────┴─────────────────┘
```

### Detalle de cada Paso del Wizard:

#### 📌 PASO 1: Datos de tu Empresa
* **Campos:** Persona Jurídica / Persona Natural, NIT + Dígito de Verificación, Razón Social / Nombres, Responsabilidad Tributaria (IVA / No IVA), Municipio DANE, Dirección, Correo de Notificaciones y Teléfono.
* **Acción:** Guarda en la base de datos de nuestro ERP y crea/actualiza la empresa cliente en la API de Factus (`POST /v1/organisations`).

#### 📌 PASO 2: Guía de Registro en la DIAN
* **Guía Visual e Interactiva:** Texto claro y botón directo a `www.dian.gov.co` (Sección Habilitación).
* Muestra las instrucciones exactas para iniciar sesión con token de correo y seleccionar "Documentos Electrónicos".

#### 📌 PASO 3: Modos de Operación (Seleccionar Factus)
* Muestra los pasos ilustrados para seleccionar el tipo de operación: **Software de un Proveedor Tecnológico**.
* Nombre de Proveedor: **FACTUS S.A.S.** / **LOPEZSOFT S.A.S.**

#### 📌 PASO 4: Envío del Set de Pruebas (`TestSetID`)
* **Input Prominente:** El usuario pega el código `TestSetID` otorgado por la DIAN.
* **Procesamiento Automatizado:** Al presionar **"Iniciar Prueba"**, nuestro ERP realiza la emisión desatendida de las 20 facturas de prueba en el Sandbox de Factus.
* **Confirmación Visual:** Barra de progreso en tiempo real (`1/20` ... `20/20`) hasta mostrar el badge **¡Habilitado en Verde!**.

#### 📌 PASO 5: Numeraciones y Prefijos
* Asociación automática de los rangos de numeración oficial (Resolución de la DIAN) y asignación del prefijo de venta para el Punto de Venta (POS).

---

## 3. 🛠️ COMPONENTES A IMPLEMENTAR EN EL CÓDIGO

### A. Backend (`src/services/factusService.ts` & `src/server.ts`):
1. **Servicio OAuth2 Factus:** Manejo seguro de `client_id` y `client_secret` con caché de token de acceso.
2. **Registro de Organización:** `registerFactusOrganization(clientData)`
3. **Ejecutor de Set de Pruebas:** `runFactusTestSet(clientId, testSetId)`
4. **Timbrado POS / Factura:** `emitFactusInvoice(clientId, invoiceData)`
5. **Descargador de PDF / XML:** `getFactusInvoicePdf(number)` y `getFactusInvoiceXml(number)`

### B. Frontend (`dashboard/src/components/SaaSErpHabilitacionDian.tsx`):
1. **Componente Stepper UI:** Encabezado dinámico con estado activo/completado por paso.
2. **Formularios Adaptativos:** Diseño limpio con palette de colores corporativa y validaciones DANE.
3. **Feedback en Tiempo Real:** Modales de estado y animaciones de progreso.

---

## 4. 🎯 CONCLUSIÓN

Este diseño garantiza una **experiencia de nivel profesional (SaaS Enterprise)**, eliminando las barreras técnicas para los clientes de nuestro ERP y permitiéndoles habilitarse ante la DIAN en menos de 5 minutos.
