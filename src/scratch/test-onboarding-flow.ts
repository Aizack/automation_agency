import 'dotenv/config';
import { AIAgent } from '../agents/base';
import { getClientById } from '../database/clientsCrud';
import { pool } from '../database/postgres';
import { routeIncomingMessage } from '../core/router';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function test() {
    console.log("🧪 [TEST ONBOARDING FLOW] Iniciando pruebas de Onboarding Conversacional, Memoria y Gancho de Conversión...");

    const testOwnerPhone = "573116718652";
    const testBusinessName = "Clínica Dental Test";

    // 0. Limpieza previa en la Base de Datos
    console.log("\n🧹 Limpiando registros anteriores de prueba...");
    const clientCheck = await pool.query(
        `SELECT id FROM clients WHERE name = $1 LIMIT 1`,
        [testBusinessName]
    );
    if (clientCheck.rows.length > 0) {
        const cid = clientCheck.rows[0].id;
        console.log(`   - Eliminando cliente anterior: ${cid}`);
        await pool.query(`DELETE FROM interactions WHERE client_id = $1`, [cid]);
        await pool.query(`DELETE FROM vector_store WHERE client_id = $1`, [cid]);
        await pool.query(`DELETE FROM clients WHERE id = $1`, [cid]);
    }
    
    // Limpiar interacciones anteriores del owner con el bot admin para iniciar historial limpio
    await pool.query(`DELETE FROM interactions WHERE client_id = 'admin' AND sender_phone = $1`, [testOwnerPhone]);
    
    // Eliminar cualquier cliente previo que tenga este número de teléfono registrado en el phone_number u owner_phone (excepto admin) para evitar Key Violation y colisiones de ruteo
    await pool.query(
        `DELETE FROM clients WHERE (RIGHT(phone_number, 10) = RIGHT($1, 10) OR RIGHT(owner_phone, 10) = RIGHT($1, 10)) AND id != 'admin'`,
        [testOwnerPhone]
    );
    console.log("✅ Limpieza completada.");

    // 1. Obtener configuración del bot de administración (Diaz Lab)
    const adminConfig = await getClientById('admin');
    if (!adminConfig) {
        console.error("❌ Error: No se encontró la configuración del cliente 'admin' en la base de datos.");
        return;
    }

    const adminAgent = new AIAgent(adminConfig);

    // ==============================================================
    // PASO A: Simular Onboarding Conversacional (Con memoria de chat)
    // ==============================================================
    console.log("\n💬 [Paso 1] Iniciando conversación de registro con el Administrador (Frant)...");
    
    const msg1 = `Hola Frant, me interesa iniciar la creación de mi flujo ahora para automatizar mi negocio ya. Mi empresa se llama '${testBusinessName}' y mi contacto es Isac Gómez.`;
    console.log(`👤 Owner: "${msg1}"`);
    let response = await adminAgent.processMessage(msg1, testOwnerPhone);
    console.log(`🤖 Frant:\n"${response.text}"\n(Tokens Input: ${response.inputTokens}, Output: ${response.outputTokens})\n`);

    // Guardar la interacción actual en la DB
    await pool.query(`
        INSERT INTO interactions (client_id, sender_phone, message_text, response_text, tokens_input, tokens_output)
        VALUES ('admin', $1, $2, $3, $4, $5)
    `, [testOwnerPhone, msg1, response.text, response.inputTokens, response.outputTokens]);

    // Buscar el clientId creado
    const dbClientCheck = await pool.query(
        `SELECT id, owner_phone, drive_folder_id FROM clients WHERE name = $1 LIMIT 1`,
        [testBusinessName]
    );
    if (dbClientCheck.rows.length === 0) {
        console.error("❌ Error: No se registró el cliente en la base de datos.");
        return;
    }
    const newClientId = dbClientCheck.rows[0].id;
    console.log(`✅ [DB Check] Cliente registrado exitosamente en DB: ID = ${newClientId}`);
    console.log(`   - owner_phone = ${dbClientCheck.rows[0].owner_phone}`);
    console.log(`   - drive_folder_id = ${dbClientCheck.rows[0].drive_folder_id}`);

    // Espaciado para evitar Rate Limits (Free tier limit: 15 RPM)
    console.log("⏱️ Esperando 7 segundos para evitar límites de cuota de Gemini...");
    await sleep(7000);

    // Continuamos la conversación respondiendo las preguntas (aprovechando la memoria de PostgreSQL)
    const msg2 = "Ofrecemos blanqueamientos dentales, ortodoncia invisible y resinas de alta estética.";
    console.log(`\n👤 Owner: "${msg2}"`);
    response = await adminAgent.processMessage(msg2, testOwnerPhone);
    console.log(`🤖 Frant:\n"${response.text}"\n(Tokens Input: ${response.inputTokens}, Output: ${response.outputTokens})\n`);

    await pool.query(`
        INSERT INTO interactions (client_id, sender_phone, message_text, response_text, tokens_input, tokens_output)
        VALUES ('admin', $1, $2, $3, $4, $5)
    `, [testOwnerPhone, msg2, response.text, response.inputTokens, response.outputTokens]);

    console.log("⏱️ Esperando 7 segundos para evitar límites de cuota de Gemini...");
    await sleep(7000);

    const msg3 = "Ubicación: Calle 100 #15-30, Bogotá. Horario: lunes a viernes de 8 AM a 5 PM.";
    console.log(`\n👤 Owner: "${msg3}"`);
    response = await adminAgent.processMessage(msg3, testOwnerPhone);
    console.log(`🤖 Frant:\n"${response.text}"\n(Tokens Input: ${response.inputTokens}, Output: ${response.outputTokens})\n`);

    await pool.query(`
        INSERT INTO interactions (client_id, sender_phone, message_text, response_text, tokens_input, tokens_output)
        VALUES ('admin', $1, $2, $3, $4, $5)
    `, [testOwnerPhone, msg3, response.text, response.inputTokens, response.outputTokens]);

    console.log("⏱️ Esperando 7 segundos para evitar límites de cuota de Gemini...");
    await sleep(7000);

    const msg4 = "FAQs: ¿Tienen parking? Sí, vigilado y gratuito por 1 hora. ¿Aceptan tarjeta? Sí, todas.";
    console.log(`\n👤 Owner: "${msg4}"`);
    response = await adminAgent.processMessage(msg4, testOwnerPhone);
    console.log(`🤖 Frant:\n"${response.text}"\n(Tokens Input: ${response.inputTokens}, Output: ${response.outputTokens})\n`);

    await pool.query(`
        INSERT INTO interactions (client_id, sender_phone, message_text, response_text, tokens_input, tokens_output)
        VALUES ('admin', $1, $2, $3, $4, $5)
    `, [testOwnerPhone, msg4, response.text, response.inputTokens, response.outputTokens]);

    console.log("⏱️ Esperando 7 segundos para evitar límites de cuota de Gemini...");
    await sleep(7000);

    const msg5 = "Listo, he terminado mis respuestas. Por favor guarda mi perfil y entrena mi bot.";
    console.log(`\n👤 Owner: "${msg5}"`);
    response = await adminAgent.processMessage(msg5, testOwnerPhone);
    console.log(`🤖 Frant:\n"${response.text}"\n(Tokens Input: ${response.inputTokens}, Output: ${response.outputTokens})\n`);

    await pool.query(`
        INSERT INTO interactions (client_id, sender_phone, message_text, response_text, tokens_input, tokens_output)
        VALUES ('admin', $1, $2, $3, $4, $5)
    `, [testOwnerPhone, msg5, response.text, response.inputTokens, response.outputTokens]);

    // Verificar que el perfil de negocio fue creado en el RAG vector_store para el nuevo cliente
    console.log("\n🔍 [Paso 2] Verificando RAG vector_store de la base de conocimientos del cliente...");
    const vectorCheck = await pool.query(
        `SELECT id, content FROM vector_store WHERE client_id = $1 LIMIT 5`,
        [newClientId]
    );
    if (vectorCheck.rows.length > 0) {
        console.log(`✅ ¡Éxito! Se encontraron ${vectorCheck.rows.length} fragmentos en el vector_store para ${newClientId}:`);
        vectorCheck.rows.forEach((r, idx) => {
            console.log(`   [Fragmento ${idx + 1}]: "${r.content.substring(0, 120)}..."`);
        });
    } else {
        console.error("❌ Error: No se indexaron documentos en la base de conocimientos RAG.");
    }

    console.log("⏱️ Esperando 10 segundos para evitar límites de cuota de Gemini antes de simular interacción...");
    await sleep(10000);

    // ==============================================================
    // PASO B: Simular primera interacción en vivo de un cliente real
    // ==============================================================
    console.log("\n🔄 [Paso 3] Simulando el primer mensaje de un paciente al bot de la Clínica...");

    const patientPhone = "573009998888";
    const patientMsg = "Hola buenas, ¿tienen parqueadero en el consultorio y qué tarjetas aceptan?";

    console.log(`👤 Paciente (+${patientPhone}) escribe al bot: "${patientMsg}"`);

    // Routeamos el mensaje entrante apuntando al bot recién vinculado (cuyo número es testOwnerPhone en este punto)
    let conversionMsgSent = false;
    const responseText = await routeIncomingMessage(
        testOwnerPhone, 
        patientPhone, 
        patientMsg,
        async (to, text) => {
            if (to === testOwnerPhone) {
                console.log(`\n📬 [Simulación WhatsApp] 🎯 MENSAJE ENVIADO AL DUEÑO (+${to}):`);
                console.log(`--------------------------------------------------------------------------------`);
                console.log(text);
                console.log(`--------------------------------------------------------------------------------\n`);
                conversionMsgSent = true;
            } else {
                console.log(`💬 [Simulación WhatsApp] Respuesta enviada al Paciente (+${to}): "${text}"`);
            }
        }
    );

    console.log(`🤖 Bot responde al paciente: "${responseText}"`);

    // Verificar en la Base de Datos el flag de primera notificación
    const finalClientCheck = await pool.query(
        `SELECT first_message_notified FROM clients WHERE id = $1 LIMIT 1`,
        [newClientId]
    );

    if (finalClientCheck.rows[0].first_message_notified) {
        console.log("\n✅ [Éxito Final] El flag 'first_message_notified' fue marcado como TRUE en PostgreSQL.");
    } else {
        console.error("\n❌ [Fallo Final] El flag 'first_message_notified' sigue siendo FALSE.");
    }

    // Esperar 4 segundos para asegurar que se procesó el setTimeout del gancho de conversión
    await new Promise(resolve => setTimeout(resolve, 4000));

    if (conversionMsgSent) {
        console.log("✅ [Prueba Completada] El Onboarding conversacional y el Gancho de Conversión funcionan a la perfección.");
    } else {
        console.error("❌ [Fallo] El mensaje de gancho de conversión no fue enviado al dueño.");
    }

    process.exit(0);
}

test().catch(err => {
    console.error("❌ Error crítico en ejecución del test:", err);
    process.exit(1);
});
