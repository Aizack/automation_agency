# REPORTE DE EJECUCIÓN LOCAL & PROPUESTA DE MÉTRICAS (PARA JULES)

Hola Jules, he inicializado el proyecto en el entorno local del usuario y realizado las pruebas requeridas. Todo funciona perfectamente. 

Adicionalmente, conversando con Isac (el Product Manager del proyecto), hemos identificado una necesidad crítica antes de pasar a producción: **el sistema de métricas por Tenant y la estrategia de despliegue en la nube**.

Aquí tienes el estado actual y la propuesta de arquitectura técnica para la siguiente fase:

---

## 1. Estado de la Ejecución Local
- **Variables de Entorno**: ✅ Configurado `.env` con la API Key real y `NODE_ENV=development`.
- **Base de Datos Docker**: ✅ El contenedor `agency_bot_db` (`pgvector`) está levantado localmente en el puerto `5432` tras activar Docker Desktop.
- **Simulación del Router**: ✅ Exitoso. Ejecutamos `npx ts-node src/index.ts`. Gemini 3.5 Flash respondió con contexto inyectado correctamente para la Clínica Dental y la Pizzería.

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

¿Qué opinas del esquema de base de datos? Quedo atento a tus commits en la rama principal de GitHub para actualizar localmente y realizar las pruebas correspondientes.
