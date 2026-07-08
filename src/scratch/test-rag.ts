import 'dotenv/config';
import { fetchDocumentsFromDrive } from '../services/drive';
import { VectorDatabase } from '../database/vectorDb';
import { getClientById, createClient } from '../database/clientsCrud';
import { pool } from '../database/postgres';

const TEST_CLIENT_ID = "client_test_rag";
const TEST_FOLDER_ID = "11DhgnPTOZu8ySaaiZA4Lni9FmqB58SFr"; // Tu carpeta compartida Biblioteca RAG

const runTest = async () => {
    console.log("🧪 [RAG TEST] Iniciando prueba de fuego del sistema RAG...");
    
    try {
        // Verificar si el cliente de pruebas existe en la BD, si no, crearlo
        let client = await getClientById(TEST_CLIENT_ID);
        if (!client) {
            console.log(`[RAG TEST] Creando cliente de prueba '${TEST_CLIENT_ID}' en la base de datos...`);
            await createClient({
                id: TEST_CLIENT_ID,
                name: "Diaz Lab Test Agency",
                phone_number: "9999999999",
                system_prompt: "Eres un bot de prueba para verificar el sistema RAG.",
                drive_folder_id: TEST_FOLDER_ID
            });
        } else {
            console.log("[RAG TEST] Cliente de prueba ya existente en la base de datos.");
            // Actualizar su ID de carpeta por si acaso
            await pool.query('UPDATE clients SET drive_folder_id = $1 WHERE id = $2', [TEST_FOLDER_ID, TEST_CLIENT_ID]);
        }

        // 1. Sincronizar Google Drive y guardar vectores en pgvector
        console.log("\n🔄 [Paso 1] Ejecutando sincronización de archivos de Google Drive...");
        const chunks = await fetchDocumentsFromDrive(TEST_CLIENT_ID, TEST_FOLDER_ID);
        console.log(`✅ [Paso 1 Completado] Se generaron e indexaron exitosamente ${chunks.length} fragmentos (chunks).`);

        // 2. Realizar consulta semántica en pgvector
        const query = "¿Cuánto cuestan los servicios de automatización de Diaz Lab?";
        console.log(`\n🔍 [Paso 2] Realizando consulta semántica en pgvector: "${query}"`);
        const context = await VectorDatabase.searchRelevantContext(TEST_CLIENT_ID, query);
        
        console.log("\n📋 [RESULTADO CONTEXTO RECUPERADO DE PGVECTOR]:");
        if (context) {
            console.log("--------------------------------------------------------------------------------");
            console.log(context);
            console.log("--------------------------------------------------------------------------------");
        } else {
            console.log("⚠️ No se recuperó ningún contexto relevante. Revisa los archivos de tu Drive.");
        }

        console.log("\n🎉 [RAG TEST] ¡Prueba completada con éxito!");
    } catch (err) {
        console.error("\n❌ [RAG TEST] La prueba de integración falló:", err);
    } finally {
        await pool.end();
        console.log("🔌 Conexiones a la base de datos cerradas.");
    }
};

runTest();
