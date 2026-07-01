# REPORTE DE EJECUCIÓN LOCAL & PROPUESTA DE MÉTRICAS (PARA JULES)

Hola Jules, he inicializado el proyecto en el entorno local del usuario y realizado las pruebas requeridas. Todo funciona perfectamente. 

Adicionalmente, conversando con Isac (el Product Manager del proyecto), hemos identificado una necesidad crítica antes de pasar a producción: **el sistema de métricas por Tenant y la estrategia de despliegue en la nube**.

Aquí tienes el estado actual, el resultado de las pruebas locales y la propuesta de arquitectura técnica para la siguiente fase:

---

## 1. Estado de la Ejecución Local
- **Variables de Entorno**: ✅ Configurado `.env` con la API Key real y `NODE_ENV=development`.
- **Base de Datos Docker**: ✅ El contenedor `agency_bot_db` (`pgvector`) está levantado localmente en el puerto `5432` tras activar Docker Desktop.
- **Simulación del Router**: ✅ Exitoso. Ejecutamos `npx ts-node src/index.ts`. Gemini 3.5 Flash respondió con contexto inyectado correctamente para la Clínica Dental y la Pizzería.

### Output Obtenido en las Pruebas:
```text
🚀 Agency AI Bot inicializando...

--- Simulando mensaje a la Clínica Dental ---
[Router] Nuevo mensaje recibido en la línea: 1234567890
[Router] Mensaje ruteado al cliente: Clínica Dental Sonrisas (ID: client_001)
[Agente AI] Ejecutando Gemini para cliente: Clínica Dental Sonrisas
[Vector DB] Buscando contexto RAG para la query "Hola, necesito una cita para el martes" aislando con client_id="client_001"...
[Agente AI] Inyectando contexto RAG: Sin contexto adicional.
[Router] Respuesta generada: ¡Hola! Claro que sí, con gusto te ayudo a agendar tu cita para este martes. 

Voy a revisar los horarios que tenemos disponibles para ese día. ¿Prefieres asistir por la mañana o por la tarde?

--- Simulando mensaje a la Pizzería ---
[Router] Nuevo mensaje recibido en la línea: 0987654321
[Router] Mensaje ruteado al cliente: Pizzería Napoli (ID: client_002)
[Agente AI] Ejecutando Gemini para cliente: Pizzería Napoli
[Vector DB] Buscando contexto RAG para la query "Quiero pedir una pizza familiar" aislando con client_id="client_002"...
[Agente AI] Inyectando contexto RAG: Contexto de Drive encontrado: Pizza familiar $15.
[Router] Respuesta generada: ¡Excelente! Procederé a crear tu pedido de una pizza familiar por $15. 🍕

¿De qué especialidad la prefieres (pepperoni, jamón, queso, etc.) y a qué dirección la enviamos?
```

---

## 2. Propuesta Arquitectónica: Base de Datos de Métricas (Multi-Tenant)
Para poder cobrar a los clientes y permitirles ver sus estadísticas, necesitamos llevar un registro detallado de las interacciones. Propongo diseñar e implementar el siguiente esquema relacional en PostgreSQL:

### Nueva Tabla: `interactions` (Registro de Consumos)
```sql
CREATE TABLE interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(50) NOT NULL REFERENCES clients(id),
    sender_phone VARCHAR(20) NOT NULL,          -- Teléfono del usuario final
    message_text TEXT NOT NULL,                  -- Lo que escribió el usuario
    response_text TEXT NOT NULL,                 -- Respuesta de Gemini
    tokens_input INT DEFAULT 0,                  -- Tokens consumidos en entrada
    tokens_output INT DEFAULT 0,                 -- Tokens consumidos en salida
    api_cost NUMERIC(10, 6) DEFAULT 0.0,         -- Costo estimado de la consulta
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Nueva Tabla: `clients` (Para migrar del archivo config.ts a DB)
```sql
CREATE TABLE clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,    -- Teléfono del Bot asignado
    system_prompt TEXT NOT NULL,
    active_tools TEXT[] DEFAULT '{}',            -- Array de herramientas activas
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Arquitectura de Despliegue en la Nube
Para ofrecer esto como un servicio SaaS robusto, la estrategia recomendada es:

1. **Subir los Contenedores**: Desplegaremos el `docker-compose.yml` en un VPS (ej. DigitalOcean, AWS LightSail, Linode). 
2. **Capa Webhook**: El servidor Node.js expondrá una ruta pública segura (usando Nginx y Let's Encrypt para HTTPS).
3. **Capa WhatsApp**: El backend de Node.js administrará múltiples sesiones de WhatsApp (usando librerías que soporten multi-sesiones como Baileys o almacenando los tokens de conexión de `whatsapp-web.js` en la base de datos).
4. **Dashboard**: Crearemos una pequeña aplicación web (Frontend) en un puerto independiente que consuma la base de datos de PostgreSQL para mostrar las métricas a Isac (Admin) y a cada cliente mediante su `client_id`.

---

## 4. Definición del Modelo de Negocio e Integración de WhatsApp
Tras debatirlo con Isac, el servicio se ofrecerá con un esquema híbrido de conexión:

1. **WhatsApp Web (QR - whatsapp-web.js)**: Será la opción estándar y de bajo costo para pequeños negocios. 
   - **Mitigación antiban obligatoria**: Debemos añadir al servicio de WhatsApp un delay de respuesta aleatorio (2 a 4 segundos) y activar el estado de "escribiendo..." (`sendState('typing')`) para emular el comportamiento humano. Este método se limitará estrictamente a flujos *inbound* (respuesta a mensajes recibidos).
2. **WhatsApp Business API (Meta)**: Deberemos estructurar el código de manera modular para permitir que clientes con un SLA corporativo alto puedan conectar sus webhooks oficiales de Meta Cloud API, eliminando así riesgos de inestabilidad y bloqueos.
