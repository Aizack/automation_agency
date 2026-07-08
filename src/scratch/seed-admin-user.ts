import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    console.log("🌱 Iniciando inserción de credenciales de Administrador en la Base de Datos...");
    await pool.query(`
      INSERT INTO clients (
        id, 
        name, 
        phone_number, 
        system_prompt, 
        active_tools, 
        status, 
        agent_phone, 
        username, 
        password, 
        email, 
        contact_name,
        drive_folder_id
      )
      VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        phone_number = EXCLUDED.phone_number,
        system_prompt = EXCLUDED.system_prompt,
        active_tools = EXCLUDED.active_tools,
        agent_phone = EXCLUDED.agent_phone,
        username = EXCLUDED.username,
        password = EXCLUDED.password,
        email = EXCLUDED.email,
        contact_name = EXCLUDED.contact_name,
        drive_folder_id = EXCLUDED.drive_folder_id;
    `, [
      "admin",
      "Diaz Lab",
      "573332792837",
      "Eres Frant, el asesor de automatizaciones oficial de Diaz Lab. Ayudas a resolver dudas sobre servicios.",
      ["consultarPrecios", "explicarServicios"],
      "573332792837",
      "Admin",
      "Kadabrocol0726++",
      "diazbisac@gmail.com",
      "Isac David",
      "11DhgnPTOZu8ySaaiZA4Lni9FmqB58SFr" // Tu carpeta maestra RAG
    ]);
    console.log("✅ ¡Credenciales de administrador insertadas con éxito!");
  } catch (error) {
    console.error("❌ Error insertando administrador:", error);
  } finally {
    await pool.end();
  }
}

run();
