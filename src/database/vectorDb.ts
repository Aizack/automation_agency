import { pool } from './postgres';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar el SDK de Gemini usando la variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "API_KEY_MISSING");

export class VectorDatabase {

    /**
     * Genera el vector numérico (embedding) para un bloque de texto dado.
     * Utiliza el modelo 'text-embedding-004' que produce vectores de 768 dimensiones.
     */
    static async getEmbedding(text: string): Promise<number[]> {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "API_KEY_MISSING") {
            throw new Error("GEMINI_API_KEY no configurada. Por favor, añádela a tu archivo .env.");
        }
        
        try {
            const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error("[Vector DB] Error al generar embedding con Gemini:", error);
            throw error;
        }
    }

    /**
     * Guarda los fragmentos de texto (chunks) indexando sus vectores correspondientes.
     * Borra los registros anteriores del cliente para evitar duplicidades al re-sincronizar.
     */
    static async storeDocumentVectors(clientId: string, documents: string[]): Promise<void> {
        console.log(`[Vector DB] Iniciando guardado de vectores en PostgreSQL para cliente: ${clientId}...`);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Eliminar vectores antiguos de este cliente para evitar mezcla de información
            await client.query('DELETE FROM vector_store WHERE client_id = $1', [clientId]);
            console.log(`[Vector DB] Registros vectoriales previos limpiados para ${clientId}.`);

            // 2. Generar vectores e insertar cada fragmento
            for (const doc of documents) {
                const embedding = await this.getEmbedding(doc);
                // Convertir el array numérico en el formato string que pgvector espera: [val1, val2, val3, ...]
                const vectorStr = `[${embedding.join(',')}]`;

                await client.query(
                    `INSERT INTO vector_store (client_id, content, embedding) VALUES ($1, $2, $3::vector)`,
                    [clientId, doc, vectorStr]
                );
            }

            await client.query('COMMIT');
            console.log(`[Vector DB] ✅ Sincronización finalizada con éxito. ${documents.length} chunks almacenados.`);
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[Vector DB] ❌ Error en la transacción de guardado de vectores:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Realiza una búsqueda semántica de similitud de coseno para encontrar
     * los 3 fragmentos de texto más relevantes asociados a un cliente específico.
     */
    static async searchRelevantContext(clientId: string, userQuery: string): Promise<string> {
        console.log(`[Vector DB] Búsqueda semántica RAG para: "${userQuery}" (Cliente: ${clientId})...`);

        try {
            if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "API_KEY_MISSING") {
                console.warn("[Vector DB] GEMINI_API_KEY no configurada. Saltando consulta vectorial.");
                return "";
            }

            // 1. Vectorizar la consulta del usuario
            const queryEmbedding = await this.getEmbedding(userQuery);
            const vectorStr = `[${queryEmbedding.join(',')}]`;

            // 2. Buscar en PostgreSQL ordenando por distancia de coseno (<=>)
            const res = await pool.query(
                `SELECT content FROM vector_store
                 WHERE client_id = $1
                 ORDER BY embedding <=> $2::vector
                 LIMIT 3`,
                [clientId, vectorStr]
            );

            if (res.rows.length === 0) {
                console.log("[Vector DB] No se encontró contexto relevante en la base de datos.");
                return "";
            }

            // Unir los fragmentos relevantes encontrados
            const context = res.rows.map(row => row.content).join("\n\n");
            console.log(`[Vector DB] Contexto RAG recuperado (${res.rows.length} fragmentos).`);
            return context;
        } catch (error) {
            console.error(`[Vector DB] ❌ Error en la búsqueda semántica:`, error);
            return "";
        }
    }
}