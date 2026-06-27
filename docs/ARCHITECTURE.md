# Arquitectura del Sistema: Agencia de Automatización con IA

Este documento describe la arquitectura técnica del sistema Multi-tenant para la agencia de automatización de WhatsApp basada en agentes IA.

## 1. Diseño General (Multi-tenant)

El sistema está diseñado para atender a múltiples clientes desde una sola instancia (base de código).
Esto se logra mediante un enrutador inteligente:

1. **Ingreso del Mensaje:** Llega un mensaje de WhatsApp (ej. a través de Baileys / WWebJS en la versión no oficial).
2. **Resolución de Contexto:** El sistema identifica el número receptor y busca a qué "Cliente de la Agencia" pertenece.
3. **Carga Dinámica:**
   - Se carga el **System Prompt** específico del cliente (su personalidad, reglas, tono).
   - Se inyectan las **Tools** específicas del cliente (ej. si es un restaurante, herramienta de `reservar_mesa`; si es consultorio, `agendar_cita_medica`).
   - Se filtra el acceso al contexto vectorial (RAG) para que solo consulte los documentos del cliente específico.

## 2. Estructura de Directorios Modular

El código fuente está altamente desacoplado:

- `src/core/`: Lógica central, inicialización del servidor, resolución multi-tenant.
- `src/agents/`: Lógica del agente LLM (conexión a OpenAI/Anthropic), ejecución de prompts.
- `src/tools/`: Herramientas individuales exportadas como módulos independientes. El Agente decide cuándo llamarlas.
- `src/services/`: Integraciones externas (WhatsApp, Google Drive API).
- `src/database/`: Conexiones y consultas a la base de datos (PostgreSQL + pgvector).

## 3. Base de Conocimiento (Data Lake / RAG)

Utilizaremos Google Drive (los 5TB de almacenamiento) como repositorio central de archivos.
- **Estructura en Drive:** `/Agencia_Data/Cliente_A/`, `/Agencia_Data/Cliente_B/`.
- Un servicio leerá estos PDFs/Docs.
- Se extraerá el texto, se pasará por un modelo de *Embeddings* (ej. `text-embedding-3-small`).
- Los vectores se guardarán en `PostgreSQL` usando la extensión `pgvector`, siempre etiquetados con el `client_id` para garantizar el aislamiento de datos.

## 4. Infraestructura y Despliegue (Hosting)

El sistema completo está contenerizado con Docker.

### Entorno de Desarrollo (Local)
Se utiliza `docker-compose.yml` para levantar:
- La aplicación (Node.js/TypeScript).
- La base de datos (PostgreSQL con pgvector).
Esto permite probar y desarrollar de forma gratuita en la máquina local.

### Entorno de Producción (Servidor en la Nube / VPS)
Para soportar el proceso persistente de conexión a WhatsApp y ejecución de agentes, se requiere un **VPS** (Virtual Private Server).
- **Ejemplos de proveedores:** Hetzner, DigitalOcean, Linode.
- **Costo estimado:** ~$5 a $10 USD mensuales para soportar múltiples clientes iniciales.
- **Despliegue:** Consiste en clonar este repositorio en el VPS y ejecutar `docker-compose up -d`. Se recomienda colocar un proxy reverso (ej. Nginx Proxy Manager o Traefik) si se exponen Webhooks para APIs oficiales en el futuro.