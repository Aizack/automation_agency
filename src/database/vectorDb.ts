/**
 * Base de Datos Vectorial (Simulación de PostgreSQL + pgvector)
 * Se encarga de aislar la información por Tenant (cliente).
 */

export class VectorDatabase {

    /**
     * Guarda documentos vectorizados en la BD aislando por cliente
     */
    static async storeDocumentVectors(clientId: string, documents: string[]) {
        console.log(`[Vector DB] Guardando vectores (RAG) en PostgreSQL (pgvector) para cliente: ${clientId}`);
        // En producción:
        // 1. Llamar a OpenAI text-embedding-3-small
        // 2. INSERT INTO vector_store (client_id, content, embedding) VALUES (...)
        console.log(`[Vector DB] ✅ ${documents.length} documentos indexados con éxito.`);
    }

    /**
     * Busca la información relevante basándose en la pregunta del usuario
     * aislando siempre la búsqueda por el clientId (para que un cliente no vea datos de otro)
     */
    static async searchRelevantContext(clientId: string, userQuery: string): Promise<string> {
        console.log(`[Vector DB] Buscando contexto RAG para la query "${userQuery}" aislando con client_id="${clientId}"...`);

        // Simulación del motor de similitud del coseno:
        // SELECT content FROM vector_store WHERE client_id = $1 ORDER BY embedding <-> $2 LIMIT 1;

        if (clientId === "client_001" && userQuery.includes("limpieza")) {
            return "Contexto de Drive encontrado: La limpieza dental cuesta $50.";
        }

        if (clientId === "client_002" && userQuery.includes("pizza familiar")) {
            return "Contexto de Drive encontrado: Pizza familiar $15.";
        }

        return "Sin contexto adicional.";
    }
}