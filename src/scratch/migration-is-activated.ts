import { pool } from '../database/postgres';

async function migrate() {
  console.log("🔄 Running migration to add is_activated column to clients table...");
  try {
    // Agregar columna de activación segura
    await pool.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_activated BOOLEAN DEFAULT FALSE;
    `);
    console.log("✅ Column 'is_activated' added or already exists.");

    console.log("🎉 Migration completed successfully!");
  } catch (err: any) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
