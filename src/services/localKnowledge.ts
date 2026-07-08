import fs from 'fs';
import path from 'path';

const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), 'knowledge_base');

// Asegurar que exista el directorio raíz de la base de conocimientos
if (!fs.existsSync(KNOWLEDGE_BASE_DIR)) {
    fs.mkdirSync(KNOWLEDGE_BASE_DIR, { recursive: true });
}

/**
 * Guarda un archivo cargado por el cliente en el almacenamiento local del servidor.
 */
export const saveLocalFile = async (clientId: string, fileName: string, fileBuffer: Buffer): Promise<void> => {
    const clientDir = path.join(KNOWLEDGE_BASE_DIR, clientId);
    if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
    }

    const filePath = path.join(clientDir, fileName);
    fs.writeFileSync(filePath, fileBuffer);
    console.log(`[Local Knowledge] ✅ Archivo '${fileName}' guardado localmente para cliente: ${clientId}`);
};

/**
 * Lista todos los archivos que el cliente ha cargado directamente (almacenamiento local).
 */
export const listLocalFiles = async (clientId: string): Promise<Array<{ id: string, name: string, mimeType: string }>> => {
    const clientDir = path.join(KNOWLEDGE_BASE_DIR, clientId);
    if (!fs.existsSync(clientDir)) {
        return [];
    }

    try {
        const files = fs.readdirSync(clientDir);
        return files.map((file, idx) => {
            const ext = path.extname(file).toLowerCase();
            let mimeType = 'text/plain';
            if (ext === '.pdf') mimeType = 'application/pdf';
            else if (ext === '.docx') mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            
            return {
                id: `local_${idx}`,
                name: file,
                mimeType
            };
        });
    } catch (error) {
        console.error(`[Local Knowledge] Error listando archivos para ${clientId}:`, error);
        return [];
    }
};

/**
 * Lee y extrae el texto de todos los archivos locales del cliente para el RAG.
 * Soporta archivos .txt directamente (los PDFs/Word se pueden expandir con parsers en el futuro).
 */
export const fetchLocalDocuments = async (clientId: string): Promise<string[]> => {
    const clientDir = path.join(KNOWLEDGE_BASE_DIR, clientId);
    if (!fs.existsSync(clientDir)) {
        return [];
    }

    const extractedTexts: string[] = [];
    try {
        const files = fs.readdirSync(clientDir);
        for (const file of files) {
            const filePath = path.join(clientDir, file);
            const ext = path.extname(file).toLowerCase();

            if (ext === '.txt') {
                const text = fs.readFileSync(filePath, 'utf-8');
                if (text && text.trim().length > 0) {
                    extractedTexts.push(`[Archivo Local: ${file}]\n${text}`);
                }
            } else {
                console.log(`[Local Knowledge] ⚠️ Archivo '${file}' omitido. El parser local actualmente soporta texto plano (.txt).`);
            }
        }
    } catch (error) {
        console.error(`[Local Knowledge] Error leyendo documentos de ${clientId}:`, error);
    }

    return extractedTexts;
};
