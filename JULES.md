# ESPECIFICACIONES TÉCNICAS Y REPORTE DE EJECUCIÓN - PARA JULES

¡Hola Jules! He estado trabajando localmente con Isac para sentar las bases de la base de datos multi-tenant y las métricas. A continuación te detallo las decisiones de arquitectura que hemos tomado, la estructura de base de datos actual y el plan de fases de desarrollo.

---

## 1. Conexión de Base de Datos y Docker

Hemos levantado con éxito la base de datos de PostgreSQL utilizando el contenedor configurado en el proyecto.
* **Imagen**: `ankane/pgvector:latest` (para soportar búsquedas de similitud RAG en el futuro).
* **Puerto Local**: `5432` mapeado de forma estándar.
* **Estado**: El contenedor corre estable de fondo (`docker-compose up -d db`).

He configurado la conexión utilizando el paquete `pg` (node-postgres). Las credenciales locales se manejan en el archivo `.env` (el cual está correctamente listado en `.gitignore` para no subir datos sensibles al repositorio remoto).

---

## 2. Estructura de la Base de Datos

Hemos migrado las configuraciones estáticas de clientes a la base de datos PostgreSQL. Las tablas se crearon y semillaron ejecutando el script `src/database/initDb.ts`:

### Tabla: `clients` (Para la gestión de inquilinos/tenants)
Esta tabla reemplaza las configuraciones hardcodeadas. Añadimos un campo de estado (`status`) para permitir suspensiones automáticas por impago y un campo `agent_phone` para el número de traspaso a humanos.
```sql
CREATE TABLE clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,      -- El número de WhatsApp asignado al bot de este inquilino
    system_prompt TEXT NOT NULL,
    active_tools TEXT[] DEFAULT '{}',              -- Herramientas activas (agendar, menús, etc.)
    status VARCHAR(20) DEFAULT 'active',           -- Control de pagos (active, suspended, inactive)
    agent_phone VARCHAR(20),                       -- Teléfono del agente humano asignado para traspaso
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Tabla: `interactions` (Métricas de consumo de API y volumen de chats)
Cada mensaje procesado por el bot registrará una entrada en esta tabla. Esto te proporcionará los datos necesarios para renderizar el Dashboard del cliente y las métricas de ROI.
```sql
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    sender_phone VARCHAR(20) NOT NULL,            -- Teléfono del cliente final
    message_text TEXT NOT NULL,                    -- Texto enviado por el usuario
    response_text TEXT NOT NULL,                   -- Respuesta del bot (Gemini)
    tokens_input INT DEFAULT 0,                    -- Estimación de tokens de entrada
    tokens_output INT DEFAULT 0,                   -- Estimación de tokens de salida
    api_cost NUMERIC(10, 6) DEFAULT 0.000000,      -- Costo calculado para Gemini 1.5/3.5 Flash
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Arquitectura de Despliegue en la Nube

Para ofrecer esto como un servicio SaaS robusto, la estrategia recomendada es:
1. **Subir los Contenedores**: Desplegaremos el `docker-compose.yml` en un VPS (ej. DigitalOcean, AWS LightSail, Linode). 
2. **Capa Webhook**: El servidor Node.js expondrá una ruta pública segura (usando Nginx y Let's Encrypt para HTTPS).
3. **Capa WhatsApp**: El backend de Node.js administrará múltiples sesiones de WhatsApp de forma paralela.
4. **Dashboard**: Crearemos una aplicación web frontend (Next.js con Tailwind CSS y Shadcn/ui) que consuma los endpoints de Express del backend.

---

## 4. Definición del Modelo de Negocio e Integración de WhatsApp

El servicio se ofrecerá con un esquema híbrido de conexión:
1. **WhatsApp Web (QR - whatsapp-web.js)**: Opción estándar y de bajo costo para pequeños negocios.
   - **Mitigación antiban (YA IMPLEMENTADA EN EL CÓDIGO)**: He programado en `src/services/whatsapp.ts` un filtro de timestamp para ignorar mensajes previos al arranque, exclusión de chats de grupo (`@g.us`), retardo aleatorio de respuesta (2 a 4 segundos) y simulación del estado de "escribiendo..." (`chat.sendStateTyping()`). Este método se limitará estrictamente a flujos *inbound*.
2. **WhatsApp Business API (Meta)**: Lógica modularizada. Los clientes premium con difusiones de marketing masivas utilizarán la API oficial de Meta para garantizar un riesgo del 0% de bloqueos.
3. **Módulo de Campañas Masivas (Broadcasts)**:
   - Toda campaña masiva saliente (Broadcast) se procesará por la **API oficial de Meta**. No se deben usar números QR para enviar mensajes masivos a gran escala para evitar baneos inmediatos.

---

## 5. Agenda de Desarrollo por Fases 📅

Por acuerdo con Isac, el roadmap de desarrollo técnico y pruebas está estructurado de la siguiente forma. **Por favor, sigue esta secuencia:**

1. **Fase 1: Backend, Base de Datos y CRUD (Fase Actual)**
   * **Objetivo**: Crear los controladores de base de datos para la gestión CRUD de inquilinos (creación, edición, suspensión, borrado) y el servidor Express con los endpoints correspondientes.
   * **Pruebas**: Se realizarán mediante simulaciones locales (webhooks mockeados). **No iniciaremos ni enlazaremos sesiones reales de WhatsApp en esta fase** para evitar bloqueos innecesarios.
2. **Fase 2: APIs del Dashboard y Prototipado Visual (Google Stitch)**
   * **Objetivo**: Diseñar la interfaz del Dashboard (lista de clientes, switch de estado activo/suspendido, gráficos de métricas y costos de API) utilizando **Google Stitch**. Programar las conexiones HTTP en el frontend para consumir las APIs de Express del backend.
3. **Fase 3: Vinculación de WhatsApp y Pruebas en Vivo**
   * **Objetivo**: Una vez que la base de datos, el backend CRUD y el Dashboard de administración estén conectados y funcionales, iniciaremos la vinculación del chip físico real por código QR y haremos las pruebas en vivo.
4. **Fase 4: Módulos de CRM (Recordatorios) y Campañas Masivas (Meta API)**
   * **Objetivo**: Configuración del cron de recordatorios automatizados de citas y el envío de campañas de difusión masiva (Broadcasts) oficiales de Meta.
