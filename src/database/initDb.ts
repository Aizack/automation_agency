import { pool } from './postgres';

const initDatabase = async () => {
    console.log("[DB Init] 🔄 Inicializando base de datos en PostgreSQL...");

    try {
        // 1. Crear extensión UUID en caso de que no exista
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        console.log("[DB Init] ✅ Extensión uuid-ossp lista.");

        // 2. Crear tabla clients (con agent_phone)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                system_prompt TEXT NOT NULL,
                active_tools TEXT[] DEFAULT '{}',
                status VARCHAR(20) DEFAULT 'active',
                agent_phone VARCHAR(20),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Ejecutar alter table por si la tabla ya existía sin la columna agent_phone
        await pool.query(`
            ALTER TABLE clients ADD COLUMN IF NOT EXISTS agent_phone VARCHAR(20);
        `);
        console.log("[DB Init] ✅ Tabla 'clients' creada y alterada con 'agent_phone'.");

        // 3. Crear tabla interactions (Métricas)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS interactions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                sender_phone VARCHAR(20) NOT NULL,
                message_text TEXT NOT NULL,
                response_text TEXT NOT NULL,
                tokens_input INT DEFAULT 0,
                tokens_output INT DEFAULT 0,
                api_cost NUMERIC(10, 6) DEFAULT 0.000000,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'interactions' creada o ya existente.");

        // 4. Crear tabla takeover_sessions (Traspaso Humano)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS takeover_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                customer_phone VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'active', -- 'active' (IA pausada), 'closed' (IA activa)
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'takeover_sessions' creada o ya existente.");

        // 5. Crear tabla appointments (Agenda de citas interna)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
                customer_phone VARCHAR(20) NOT NULL,
                customer_name VARCHAR(100) NOT NULL,
                appointment_date TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'rescheduled'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'appointments' creada o ya existente.");

        // 6. Semillar/Insertar Clientes Iniciales (Seed Data)
        const clientsToSeed = [
            {
                id: "client_001",
                name: "Clínica Dental Sonrisas",
                phone_number: "1234567890",
                system_prompt: "Eres el asistente virtual de Clínica Sonrisas. Tu objetivo es agendar citas médicas con empatía y revisar horarios.",
                active_tools: ["agendarCita", "consultarHorarios"],
                agent_phone: "573001112222" // Número del dentista humano
            },
            {
                id: "client_002",
                name: "Pizzería Napoli",
                phone_number: "0987654321",
                system_prompt: "Eres el asistente de Pizzería Napoli. Debes tomar pedidos, confirmar la dirección de envío y calcular el costo.",
                active_tools: ["crearPedido", "consultarMenu"],
                agent_phone: "573003334444" // Número del pizzero humano
            }
        ];

        for (const client of clientsToSeed) {
            await pool.query(`
                INSERT INTO clients (id, name, phone_number, system_prompt, active_tools, status, agent_phone)
                VALUES ($1, $2, $3, $4, $5, 'active', $6)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    phone_number = EXCLUDED.phone_number,
                    system_prompt = EXCLUDED.system_prompt,
                    active_tools = EXCLUDED.active_tools,
                    agent_phone = EXCLUDED.agent_phone;
            `, [client.id, client.name, client.phone_number, client.system_prompt, client.active_tools, client.agent_phone]);
        }

        console.log("[DB Init] ✅ Datos iniciales de clientes semillados correctamente.");
        console.log("[DB Init] 🎉 ¡Inicialización completada con éxito!");

    } catch (error) {
        console.error("[DB Init] ❌ Error inicializando base de datos:", error);
    } finally {
        // Cerrar el pool para que el script termine de ejecutarse en terminal
        await pool.end();
        console.log("[DB Init] 🔌 Conexiones de inicialización cerradas.");
    }
};

initDatabase();
