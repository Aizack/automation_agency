# Guía Oficial de Integración: Meta Tech Provider & WhatsApp Business Cloud API

Esta documentación sirve como guía técnica y de arquitectura para la plataforma **Frant Bot / Diaz Lab**, detallando la configuración oficial como **Proveedor de Tecnología (Tech Provider / Business Solution Provider)** en la infraestructura de Meta.

---

## 1. Visión General de Arquitectura Dual

La plataforma admite una arquitectura híbrida de conexión por cada inquilino (Multi-tenant):

```mermaid
flowchart TD
    subgraph Canales de Entrada de WhatsApp
        QR[Vinculación por Código QR (whatsapp-web.js)]
        META[API Oficial Meta Cloud (Graph API)]
    end

    subgraph Frant Bot Backend Service
        Webhook[GET/POST /api/v1/meta/webhook]
        Router[Message Router & Tenant Isolator]
        AI[Agente de IA - Gemini 3.7 Flash]
        ERP[ERPBridgeService & Database PostgreSQL]
    end

    QR --> Router
    META --> Webhook
    Webhook --> Router
    Router --> AI
    AI --> ERP
```

1. **Canal QR (LocalAuth / Puppeteer)**: Ideal para comercios pequeños que desean vincular su número actual en 30 segundos sin trámites en Meta.
2. **Canal Oficial Meta Cloud API (Tech Provider)**: Para cuentas corporativas verificadas con soporte multi-tenant vía *Embedded Signup* (Botón "Conectar con Facebook").

---

## 2. Variables de Entorno Requeridas (`.env`)

Para habilitar la integración oficial con Meta, debes incluir las siguientes variables en tu archivo `.env`:

```env
# Configuración Global de la App de Meta
META_APP_ID=1534078441779001
META_APP_SECRET=tu_app_secret_de_meta
META_WA_TOKEN=EAAG... (Token permanente de usuario de sistema)
META_WEBHOOK_VERIFY_TOKEN=frant_verify_token_2026
```

---

## 3. Endpoints Implementados en el Servidor

| Método | Ruta | Descripción | Público / Autenticado |
| :--- | :--- | :--- | :--- |
| `GET` | `/privacy` | Muestra la Política de Privacidad HTML oficial para el formulario de App Review de Meta. | **Público** |
| `GET` | `/api/v1/meta/webhook` | Responde al reto de verificación de seguridad de Meta (`hub.challenge`). | **Público** |
| `POST` | `/api/v1/meta/webhook` | Recibe eventos de chat en tiempo real de Meta y responde automáticamente con Gemini 3.7 Flash. | **Público** |
| `POST` | `/api/v1/meta/oauth/callback` | Intercambia el código de autorización de *Embedded Signup* por un token permanente para el cliente. | **Autenticado (JWT)** |

---

## 4. Flujo de Embedded Signup para Clientes (Tech Provider Flow)

Basado en la [documentación oficial de Meta para Tech Providers](https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/get-started-for-tech-providers):

1. **Cliente en el Dashboard**: El comercio hace clic en **"Conectar cuenta de WhatsApp con Facebook"**.
2. **Ventana Emergente de Meta (Facebook SDK)**:
   ```javascript
   FB.login(function(response) {
     if (response.authResponse) {
       const code = response.authResponse.code;
       // Enviar el código de autorización a tu backend
       fetch('/api/v1/meta/oauth/callback', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
         body: JSON.stringify({ clientId: 'client_123', code: code })
       });
     }
   }, {
     config_id: 'TU_CONFIG_ID_DE_EMBEDDED_SIGNUP',
     response_type: 'code',
     override_default_response_type: true
   });
   ```
3. **Backend Exchange**: El servidor recibe el `code`, solicita a Meta el token permanente de usuario de sistema para esa WABA y guarda el `meta_wa_token` en la base de datos de la tienda.

---

## 5. Guía de Aprobación de la App (Meta App Review)

Dado que la empresa en Meta ya se encuentra **Verificada** (Paso 3 aprobado):

### Permisos a Solicitar en Meta Developers:
- `whatsapp_business_messaging`: Permiso para enviar/recibir mensajes.
- `whatsapp_business_management`: Permiso para administrar la cuenta WABA del cliente.

### Requisitos Obligatorios para la Solicitud:
1. **URL de Política de Privacidad**: `https://tu-dominio.com/privacy` (Ya construida en la plataforma).
2. **Video de Demostración (2-3 minutos)**: Graba tu pantalla mostrando el Dashboard, el inicio de sesión con Facebook y la respuesta automática de la IA.
3. **Credenciales de Prueba**: Un usuario y contraseña para que el equipo de revisión de Meta pruebe tu Dashboard si lo desea.

---

## 6. Mantenimiento y Control del Repositorio

* **Rama de Desarrollo**: `feature/ia-separada`
* **Punto de Restauración (Git Checkpoint)**:
  `git commit -m "checkpoint: refactor IA separada gemini-3.7/3.8 y erpBridgeService completo"`
