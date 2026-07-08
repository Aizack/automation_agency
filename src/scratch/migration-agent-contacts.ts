import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log("⚙️ Iniciando migración de base de datos para Escalamiento de Agentes...");

    // 1. Crear tabla agent_contacts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id VARCHAR(50) NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        priority INT NOT NULL,
        status VARCHAR(20) DEFAULT 'online', -- 'online', 'offline'
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id, phone)
      );
    `);
    console.log("✅ Tabla 'agent_contacts' creada o verificada.");

    // 2. Alterar tabla takeover_sessions para añadir columnas de escalamiento
    await pool.query(`
      ALTER TABLE takeover_sessions 
      ADD COLUMN IF NOT EXISTS current_agent_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS escalation_index INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS interacted_with_agent BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100) DEFAULT 'Cliente';
    `);
    console.log("✅ Columnas añadidas a 'takeover_sessions'.");

    console.log("🎉 ¡Migración completada con éxito!");
  } catch (error) {
    console.error("❌ Error en la migración:", error);
  } finally {
    await pool.end();
  }
}

run();
