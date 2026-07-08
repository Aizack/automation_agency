import 'dotenv/config';
import { createClientFolder, uploadFileToFolder, fetchDocumentsFromDrive } from '../services/drive';
import { createClient, getClientById } from '../database/clientsCrud';
import { pool } from '../database/postgres';

async function testDriveWriter() {
    console.log("🧪 [TEST DRIVE WRITER] Iniciando prueba de escritura en Google Drive...");

    const testClientId = 'client_test_auto_drive';
    const testClientName = 'Clínica Test Auto Drive';

    try {
        // 1. Crear la carpeta en Google Drive usando la API
        console.log("\n🔄 [Paso 1] Creando subcarpeta en Google Drive...");
        const folderId = await createClientFolder(testClientName);
        console.log(`✅ [Paso 1 Completado] Carpeta creada con ID: ${folderId}`);

        // 2. Registrar el cliente en la base de datos local
        console.log("\n🔄 [Paso 2] Registrando cliente con credenciales en PostgreSQL...");
        
        // Limpiar si existía
        await pool.query(`DELETE FROM clients WHERE id = $1`, [testClientId]);

        await createClient({
            id: testClientId,
            name: testClientName,
            phone_number: '573007654321',
            system_prompt: 'Eres un bot odontológico de prueba.',
            drive_folder_id: folderId,
            username: 'clinicatest',
            password: '123', // clave simple para pruebas
            email: 'test@clinicadiaz.com',
            contact_name: 'Isac Barros'
        });
        console.log("✅ [Paso 2 Completado] Cliente registrado.");

        // 3. Subir un archivo de prueba a la subcarpeta recién creada
        console.log("\n🔄 [Paso 3] Subiendo archivo 'servicios.txt' a la subcarpeta de Drive...");
        const fileContent = "Precios de la Clínica Test Auto:\n- Limpieza Dental: $45 USD\n- Ortodoncia Integral: $450 USD\n- Blanqueamiento Láser: $110 USD\nHorario de atención: Lunes a viernes de 8 AM a 6 PM.";
        
        const { Readable } = require('stream');
        const readableStream = new Readable();
        readableStream.push(fileContent);
        readableStream.push(null);

        await uploadFileToFolder(folderId, 'servicios.txt', 'text/plain', readableStream);
        console.log("✅ [Paso 3 Completado] Archivo subido con éxito.");

        // 4. Correr la sincronización para verificar que pgvector indexa el nuevo archivo
        console.log("\n🔄 [Paso 4] Sincronizando RAG para verificar indexación en pgvector...");
        const chunks = await fetchDocumentsFromDrive(testClientId, folderId);
        console.log(`✅ [Paso 4 Completado] Se indexaron ${chunks.length} fragmentos en la base de datos.`);

        // 5. Verificar lectura de la DB
        console.log("\n🔄 [Paso 5] Verificando lectura de credenciales de cliente...");
        const client = await getClientById(testClientId);
        console.log("Datos del cliente recuperados de la DB:", {
            id: client?.id,
            name: client?.name,
            username: client?.username,
            password: client?.password,
            contactName: client?.contactName,
            driveFolderId: client?.driveFolderId
        });

        console.log("\n🎉 [TEST] ¡Prueba de escritura y registro completada exitosamente!");
    } catch (error) {
        console.error("\n❌ [TEST] La prueba falló con el siguiente error:", error);
    } finally {
        await pool.end();
        console.log("🔌 Conexiones de base de datos cerradas.");
    }
}

testDriveWriter();
