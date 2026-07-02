import { pool } from './postgres';

const initDatabase = async () => {
    console.log("[DB Init] 🔄 Inicializando base de datos en PostgreSQL...");

    try {
        // 1. Crear extensión UUID en caso de que no exista
        await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
        console.log("[DB Init] ✅ Extensión uuid-ossp lista.");

        // 2. Crear tabla clients
        await pool.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                phone_number VARCHAR(20) UNIQUE NOT NULL,
                system_prompt TEXT NOT NULL,
                active_tools TEXT[] DEFAULT '{}',
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("[DB Init] ✅ Tabla 'clients' creada o ya existente.");

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

        // 4. Semillar/Insertar Clientes Iniciales (Seed Data)
        const clientsToSeed = [
            {
                id: "client_001",
                name: "Clínica Dental Sonrisas",
                phone_number: "1234567890",
                system_prompt: "Eres el asistente virtual de Clínica Sonrisas. Tu objetivo es agendar citas médicas con empatía y revisar horarios.",
                active_tools: ["agendarCita", "consultarHorarios"]
            },
            {
                id: "client_002",
                name: "Pizzería Napoli",
                phone_number: "0987654321",
                system_prompt: "Eres el asistente de Pizzería Napoli. Debes tomar pedidos, confirmar la dirección de envío y calcular el costo.",
                active_tools: ["crearPedido", "consultarMenu"]
            }
        ];

        for (const client of clientsToSeed) {
            await pool.query(`
                INSERT INTO clients (id, name, phone_number, system_prompt, active_tools, status)
                VALUES ($1, $2, $3, $4, $5, 'active')
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    phone_number = EXCLUDED.phone_number,
                    system_prompt = EXCLUDED.system_prompt,
                    active_tools = EXCLUDED.active_tools;
            `, [client.id, client.name, client.phone_number, client.system_prompt, client.active_tools]);
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
