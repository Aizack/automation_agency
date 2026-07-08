import { Pool } from 'pg';
import 'dotenv/config';

// The db service name from docker-compose is "db", but locally we map 5432 to localhost:5432.
// Usually DATABASE_URL handles this. But let's build the pool directly.
const connectionString = process.env.DATABASE_URL || 'postgres://agency_user:agency_pass@localhost:5432/agency_db';

export const pool = new Pool({
  connectionString: connectionString,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected error on idle client', err);
  process.exit(-1);
});

/**
 * Executes a query with error handling.
 */
export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log(`[PostgreSQL] Executed query in ${duration}ms:`, { text, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error(`[PostgreSQL] Error executing query: ${text}`, error);
    throw error;
  }
};
