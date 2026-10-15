import { pool } from './postgres';
import { GoogleGenAI } from '@google/genai';

export class VectorDatabase {

    private static getAIClient(): GoogleGenAI {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === "API_KEY_MISSING") {
            throw new Error("GEMINI_API_KEY no configurada. Por favor, añádela a tu archivo .env.");
        }
        return new GoogleGenAI({ apiKey });
    }

    /**
     * Genera el vector numérico (embedding) para un bloque de texto dado.
     * Utiliza el modelo 'text-embedding-004' que produce vectores de 768 dimensiones.
     */
    static async getEmbedding(text: string): Promise<number[]> {
        try {
            const ai = this.getAIClient();
            let result: any;
            try {
                result = await ai.models.embedContent({
                    model: "text-embedding-004",
                    contents: text
                });
            } catch {
                result = await ai.models.embedContent({
                    model: "text-embedding-004",
                    contents: text
                });
            }

            const values = result.embedding?.values || result.embeddings?.[0]?.values;
            if (!values) {
                throw new Error("No se obtuvieron valores de embedding.");
            }
            return values;
        } catch (error: any) {
            console.warn("[Vector DB] Notificación RAG: Búsqueda vectorial no disponible en esta llamada.");
            return [];
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

            // 2. Generar vectores concurrentemente por lotes controlados (lotes de 5 para respetar límites de API)
            const BATCH_SIZE = 5;
            const items: { doc: string; vectorStr: string }[] = [];

            for (let i = 0; i < documents.length; i += BATCH_SIZE) {
                const batch = documents.slice(i, i + BATCH_SIZE);
                const embeddings = await Promise.all(batch.map(doc => this.getEmbedding(doc)));
                batch.forEach((doc, idx) => {
                    const emb = embeddings[idx];
                    if (emb && emb.length > 0) {
                        items.push({
                            doc,
                            vectorStr: `[${emb.join(',')}]`
                        });
                    }
                });
            }

            // 3. Inserción masiva en PostgreSQL en lugar de consultas individuales
            if (items.length > 0) {
                const CHUNK_INSERT_SIZE = 50;
                for (let i = 0; i < items.length; i += CHUNK_INSERT_SIZE) {
                    const chunk = items.slice(i, i + CHUNK_INSERT_SIZE);
                    const values: any[] = [];
                    const rowParams: string[] = [];
                    let pIdx = 1;

                    chunk.forEach(item => {
                        rowParams.push(`($${pIdx}, $${pIdx + 1}, $${pIdx + 2}::vector)`);
                        values.push(clientId, item.doc, item.vectorStr);
                        pIdx += 3;
                    });

                    const insertSql = `INSERT INTO vector_store (client_id, content, embedding) VALUES ${rowParams.join(', ')}`;
                    await client.query(insertSql, values);
                }
            }

            await client.query('COMMIT');
            console.log(`[Vector DB] ✅ Sincronización finalizada con éxito. ${items.length} chunks almacenados en lote.`);
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