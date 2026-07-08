import { query, pool } from './connection';

export const initializeDatabase = async () => {
  console.log('[PostgreSQL] Inicializando base de datos y creando tablas si no existen...');

  try {
    // Activar extensión pgvector (aunque en este paso no guardaremos vectores, la dejamos lista)
    await query('CREATE EXTENSION IF NOT EXISTS vector;');

    // Tabla de Clientes (Tenants)
    await query(`
      CREATE TABLE IF NOT EXISTS clients (
          id VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          phone_number VARCHAR(20) UNIQUE NOT NULL,
          system_prompt TEXT NOT NULL,
          active_tools TEXT[] DEFAULT '{}',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabla de Interacciones (Métricas de consumo)
    await query(`
      CREATE TABLE IF NOT EXISTS interactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id VARCHAR(50) NOT NULL REFERENCES clients(id),
          sender_phone VARCHAR(20) NOT NULL,
          message_text TEXT NOT NULL,
          response_text TEXT NOT NULL,
          tokens_input INT DEFAULT 0,
          tokens_output INT DEFAULT 0,
          api_cost NUMERIC(10, 6) DEFAULT 0.0,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[PostgreSQL] ✅ Tablas creadas/verificadas exitosamente.');

    // Semilla de base de datos
    const res = await query('SELECT count(*) FROM clients');
    if (res.rows[0].count === '0') {
        console.log('[PostgreSQL] Tabla de clientes vacía. Insertando datos semilla...');
        await query(`
            INSERT INTO clients (id, name, phone_number, system_prompt, active_tools) VALUES
            ('client_001', 'Clínica Dental Sonrisas', '1234567890', 'Eres el asistente virtual de Clínica Sonrisas. Tu objetivo es agendar citas médicas con empatía y revisar horarios.', ARRAY['agendarCita', 'consultarHorarios']),
            ('client_002', 'Pizzería Napoli', '0987654321', 'Eres el asistente de Pizzería Napoli. Debes tomar pedidos, confirmar la dirección de envío y calcular el costo.', ARRAY['crearPedido', 'consultarMenu'])
        `);
        console.log('[PostgreSQL] ✅ Datos semilla insertados correctamente.');
    }

  } catch (error) {
    console.error('[PostgreSQL] ❌ Error inicializando la base de datos:', error);
    throw error;
  }
};

// Si este archivo se ejecuta directamente, corremos la inicialización y cerramos el pool.
if (require.main === module) {
  initializeDatabase().then(() => pool.end()).catch(() => process.exit(1));
}
