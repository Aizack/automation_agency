import 'dotenv/config';
import { AIAgent } from '../agents/base';
import { getClientById } from '../database/clientsCrud';
import { pool } from '../database/postgres';

async function test() {
    console.log("🧪 [TEST FUNCTION CALLING] Iniciando pruebas de Gemini Function Calling...");

    // ==============================================================
    // PRUEBA 1: Registro Automático de Cliente (Frant Vendedor - Admin)
    // ==============================================================
    console.log("\n🔄 [Prueba 1] Registrando un nuevo cliente a través del bot 'Admin'...");
    
    // Obtener configuración del bot de administración (Diaz Lab)
    const adminConfig = await getClientById('admin');
    if (!adminConfig) {
        console.error("❌ Error: No se encontró la configuración del cliente 'admin' en la base de datos.");
        return;
    }

    const adminAgent = new AIAgent(adminConfig);
    const testOnboardingMessage = "Hola, me interesa contratar sus servicios. Mi negocio se llama 'Clínica Dental Plus', mi nombre de contacto es Isac Gómez y mi número de WhatsApp es 573116718652.";

    console.log(`💬 Enviando mensaje a Frant: "${testOnboardingMessage}"`);
    const adminResponse = await adminAgent.processMessage(testOnboardingMessage, "573116718652");
    
    console.log("\n🤖 Respuesta de Frant:");
    console.log("----------------------------------------");
    console.log(adminResponse);
    console.log("----------------------------------------");

    // Verificar en la Base de Datos que se creó el cliente
    const dbClientCheck = await pool.query(
        `SELECT id, name, phone_number, username, password, drive_folder_id 
         FROM clients WHERE name = 'Clínica Dental Plus' LIMIT 1`
    );

    if (dbClientCheck.rows.length > 0) {
        const newClient = dbClientCheck.rows[0];
        console.log("✅ [Prueba 1 Éxito] Cliente creado en PostgreSQL:");
        console.log(`   - ID: ${newClient.id}`);
        console.log(`   - Teléfono: ${newClient.phone_number}`);
        console.log(`   - Usuario Dashboard: ${newClient.username}`);
        console.log(`   - Contraseña Dashboard: ${newClient.password}`);
        console.log(`   - ID Carpeta de Drive: ${newClient.drive_folder_id}`);
    } else {
        console.error("❌ [Prueba 1 Fallo] El cliente no fue registrado en la base de datos.");
    }

    // ==============================================================
    // PRUEBA 2: Cita Agendada de forma real (Client Bot)
    // ==============================================================
    console.log("\n🔄 [Prueba 2] Agendando una cita de forma real en la base de datos...");

    const client001Config = await getClientById('client_001');
    if (!client001Config) {
        console.error("❌ Error: No se encontró la configuración de 'client_001' en la base de datos.");
        return;
    }

    const clientAgent = new AIAgent(client001Config);
    const testAppointmentMessage = "Hola, quiero agendar una cita para Carlos Gómez el 2026-07-25 a las 15:30.";

    console.log(`💬 Enviando mensaje al bot de la Clínica: "${testAppointmentMessage}"`);
    const clientResponse = await clientAgent.processMessage(testAppointmentMessage, "3046247664");

    console.log("\n🤖 Respuesta del Bot de la Clínica:");
    console.log("----------------------------------------");
    console.log(clientResponse);
    console.log("----------------------------------------");

    // Verificar en la Base de Datos que se insertó la cita
    const dbApptCheck = await pool.query(
        `SELECT id, customer_name, appointment_date, status 
         FROM appointments 
         WHERE client_id = 'client_001' AND customer_name = 'Carlos Gómez' 
         ORDER BY created_at DESC LIMIT 1`
    );

    if (dbApptCheck.rows.length > 0) {
        const appt = dbApptCheck.rows[0];
        console.log("✅ [Prueba 2 Éxito] Cita registrada en PostgreSQL:");
        console.log(`   - ID: ${appt.id}`);
        console.log(`   - Nombre: ${appt.customer_name}`);
        console.log(`   - Fecha y Hora: ${appt.appointment_date}`);
        console.log(`   - Estado: ${appt.status}`);
    } else {
        console.error("❌ [Prueba 2 Fallo] La cita no fue registrada en la base de datos.");
    }

    process.exit(0);
}

test().catch(err => {
    console.error("❌ Error crítico en ejecución del test:", err);
    process.exit(1);
});
