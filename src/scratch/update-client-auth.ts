import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log("🔄 Actualizando credenciales de 'Diaz Lab Test Agency'...");
    
    const result = await pool.query(
      `UPDATE clients 
       SET username = $1, password = $2 
       WHERE id = 'client_test_rag' 
       RETURNING id, name, username, password`,
      ['Test user 1', '123456']
    );

    if (result.rows.length > 0) {
      console.log("✅ Credenciales actualizadas con éxito:");
      console.log(result.rows[0]);
    } else {
      console.log("❌ No se encontró el cliente con ID 'client_test_rag' para actualizar.");
    }
  } catch (error) {
    console.error("❌ Error en la actualización:", error);
  } finally {
    await pool.end();
  }
}

run();
