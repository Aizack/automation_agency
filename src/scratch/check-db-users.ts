import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log("🔍 Consultando usuarios registrados en la base de datos...");
    const result = await pool.query(`SELECT id, name, username, password, email, status FROM clients`);
    console.log(`📋 Se encontraron ${result.rows.length} registros:`);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error("❌ Error consultando la base de datos:", error);
  } finally {
    await pool.end();
  }
}

run();
