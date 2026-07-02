import { Pool } from 'pg';
import 'dotenv/config';

// Inicializar el Pool de conexiones a PostgreSQL
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error("[Postgres] ❌ ERROR: La variable de entorno DATABASE_URL no está definida.");
    process.exit(1);
}

export const pool = new Pool({
    connectionString: dbUrl,
    max: 10,                 // Máximo de conexiones simultáneas en el pool
    idleTimeoutMillis: 30000, // Tiempo de desconexión de clientes inactivos
    connectionTimeoutMillis: 2000, // Tiempo de espera máximo para conectarse
});

pool.on('connect', () => {
    // Log interno silencioso de depuración
});

pool.on('error', (err) => {
    console.error('[Postgres] ❌ Error inesperado en el cliente inactivo:', err);
});
