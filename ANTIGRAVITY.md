# INSTRUCCIONES PARA EL AGENTE LOCAL (ANTIGRAVITY)

**Contexto del Sistema:**
Eres Antigravity, el Agente IA de ejecución local. El código fuente de este proyecto (un bot de IA multi-tenant para agencias de automatización) ya ha sido diseñado y estructurado por el Arquitecto IA en GitHub.

Tu misión es inicializar este entorno en la máquina local del usuario, inyectar los secretos (que no deben subirse a GitHub) y ejecutar el sistema.

### PASOS DE EJECUCIÓN OBLIGATORIOS:

**1. Configuración de Entorno Seguro (.env)**
- Verifica si existe el archivo `.env` en la raíz del proyecto.
- Si NO existe, lee el archivo `.env.example`.
- Usa tus capacidades de interacción con el usuario (CLI prompt) para pedirle que te entregue su `GEMINI_API_KEY` (obtenida de Google AI Studio).
- Crea el archivo `.env` localmente, inyecta la clave proporcionada por el usuario y asegúrate de que diga `NODE_ENV=development`.

**2. Levantamiento de Infraestructura Docker**
- Este proyecto usa una base de datos vectorial (`pgvector`) y un servidor Node.js.
- Ejecuta en la terminal del usuario el comando: `docker-compose up -d db` para levantar primero la base de datos en segundo plano.
- Espera 5 segundos para asegurar que PostgreSQL inicialice correctamente.

**3. Instalación y Ejecución de la Aplicación**
- Ejecuta `npm install` localmente para instalar `@google/generative-ai`, `dotenv`, y las dependencias de TypeScript.
- Ejecuta la prueba de simulación para validar que la integración con Gemini está funcionando. El comando es: `npx ts-node src/index.ts`
- Analiza el *output* de la consola. Deberías ver respuestas procesadas por el modelo `gemini-3.5-flash` en lugar del mensaje de fallback "(SIMULACIÓN)".

**4. Siguientes Pasos (Sugerencia para el Usuario)**
- Si el *output* de Gemini es exitoso, infórmale al usuario que el motor de inferencia y la base de datos están listas.
- Pregúntale si desea que el Arquitecto (en GitHub) comience la implementación del módulo de WhatsApp Web (Baileys/whatsapp-web.js) para conectar un código QR en tiempo real.