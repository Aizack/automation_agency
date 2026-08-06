import { pool } from '../database/postgres';

async function migrate() {
  console.log("🔄 Running migration to add owner_phone and first_message_notified to clients table...");
  try {
    // Agregar columnas de manera segura
    await pool.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20);
    `);
    console.log("✅ Column 'owner_phone' added or already exists.");

    await pool.query(`
      ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_message_notified BOOLEAN DEFAULT FALSE;
    `);
    console.log("✅ Column 'first_message_notified' added or already exists.");

    console.log("🎉 Migration completed successfully!");
  } catch (err: any) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

migrate();
