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
    if (isDbConnectionError(err)) {
        console.warn('[Postgres] ⚠️ Error de conexión en el cliente inactivo (PostgreSQL no disponible).');
    } else {
        console.error('[Postgres] ❌ Error inesperado en el cliente inactivo:', err);
    }
});

/**
 * Determina si un error es provocado por una desconexión o indisponibilidad temporal de PostgreSQL.
 * Previene volcados masivos de AggregateError o ECONNREFUSED en consola.
 */
export function isDbConnectionError(error: any): boolean {
    if (!error) return false;

    const code = error.code;
    const msg = String(error.message || error);

    if (
        code === 'ECONNREFUSED' ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'ENOTFOUND' ||
        code === '57P03' ||
        msg.includes('ECONNREFUSED') ||
        msg.includes('Connection terminated') ||
        msg.includes('connect ECONNREFUSED') ||
        msg.includes('connection refused')
    ) {
        return true;
    }

    if (error.name === 'AggregateError' || Array.isArray(error.errors)) {
        return error.errors?.some((err: any) => isDbConnectionError(err)) ?? false;
    }

    return false;
}

