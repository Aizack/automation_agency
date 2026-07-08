import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { VectorDatabase } from '../database/vectorDb';
import { fetchLocalDocuments } from './localKnowledge';

// Ruta al archivo de credenciales de la Cuenta de Servicio (Fallback)
const KEY_FILE_PATH = path.join(process.cwd(), 'driveAccess', 'google-credentials.json');

/**
 * Inicializa y retorna el cliente de la API de Google Drive.
 * Si GOOGLE_REFRESH_TOKEN está configurado, usa OAuth 2.0 (User Auth) con tu cuenta de 5TB.
 * Si no está configurado, hace fallback a la Cuenta de Servicio (JWT).
 */
const getDriveClient = () => {
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
    const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

    if (CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN) {
        console.log("[Google Drive Service] 🔑 Inicializando cliente usando OAuth 2.0 (User Auth)...");
        const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
        return google.drive({ version: 'v3', auth: oauth2Client });
    }

    console.log("[Google Drive Service] 🤖 Inicializando cliente usando Cuenta de Servicio (JWT)...");
    if (!fs.existsSync(KEY_FILE_PATH)) {
        throw new Error('Archivo de credenciales google-credentials.json no encontrado.');
    }
    const auth = new google.auth.GoogleAuth({
        keyFile: KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    return google.drive({ version: 'v3', auth });
};

/**
 * Conecta a Google Drive (si está configurada), lee los archivos de la carpeta compartida,
 * y los combina con los archivos locales del cliente. Luego fragmenta todo y los guarda en pgvector.
 */
export const fetchDocumentsFromDrive = async (clientId: string, folderId: string | null): Promise<string[]> => {
    console.log(`[Sync Service] Iniciando sincronización híbrida para cliente: ${clientId}...`);
    const extractedTexts: string[] = [];

    // --- Fuente 1: Google Drive (Opcional) ---
    if (folderId && folderId.trim().length > 0) {
        console.log(`[Sync Service] Cargando documentos de Google Drive (Carpeta: ${folderId})...`);
        try {
            const drive = getDriveClient();

            // Listar archivos en la carpeta compartida
            const response = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'files(id, name, mimeType)',
            });

            const files = response.data.files || [];
            console.log(`[Sync Service] Se encontraron ${files.length} archivos en Google Drive.`);

            for (const file of files) {
                console.log(`[Sync Service] Procesando archivo de Drive: "${file.name}" (${file.mimeType})...`);
                
                try {
                    let fileText = '';

                    if (file.mimeType === 'text/plain') {
                        const res = await drive.files.get({
                            fileId: file.id!,
                            alt: 'media',
                        }, { responseType: 'text' });
                        fileText = res.data as string;
                    } else if (file.mimeType === 'application/vnd.google-apps.document') {
                        const res = await drive.files.export({
                            fileId: file.id!,
                            mimeType: 'text/plain',
                        }, { responseType: 'text' });
                        fileText = res.data as string;
                    } else {
                        console.log(`[Sync Service] ⚠️ Archivo de Drive "${file.name}" omitido: formato no soportado.`);
                        continue;
                    }

                    if (fileText && fileText.trim().length > 0) {
                        extractedTexts.push(`[Archivo Google Drive: ${file.name}]\n${fileText}`);
                    }
                } catch (fileErr) {
                    console.error(`[Sync Service] ❌ Error procesando archivo de Drive "${file.name}":`, fileErr);
                }
            }
        } catch (driveError) {
            console.error("[Sync Service] ⚠️ Error al conectar o leer de Google Drive:", driveError);
            // Seguimos adelante con los archivos locales si falla Google Drive
        }
    } else {
        console.log(`[Sync Service] Google Drive omitido (no se suministró ID de carpeta).`);
    }

    // --- Fuente 2: Almacenamiento Local (Subido por Panel/WhatsApp) ---
    console.log(`[Sync Service] Cargando documentos del almacenamiento local...`);
    try {
        const localTexts = await fetchLocalDocuments(clientId);
        console.log(`[Sync Service] Se encontraron ${localTexts.length} archivos locales.`);
        extractedTexts.push(...localTexts);
    } catch (localError) {
        console.error("[Sync Service] ❌ Error leyendo almacenamiento local:", localError);
    }

    if (extractedTexts.length === 0) {
        console.log(`[Sync Service] ⚠️ No se encontró información en ninguna de las dos fuentes.`);
        // Limpiamos los vectores anteriores para que no se queden datos obsoletos
        await VectorDatabase.storeDocumentVectors(clientId, []);
        return [];
    }

    // --- Algoritmo de fragmentación (Chunking) con solapamiento ---
    const chunks: string[] = [];
    const CHUNK_SIZE = 800; // tamaño promedio de caracteres por chunk
    const OVERLAP = 150;    // solapamiento entre chunks

    for (const fullText of extractedTexts) {
        let start = 0;
        while (start < fullText.length) {
            const end = Math.min(start + CHUNK_SIZE, fullText.length);
            let chunk = fullText.substring(start, end);
            
            // Intentar cortar en un espacio para no romper palabras si no es el final
            if (end < fullText.length) {
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastSpace > CHUNK_SIZE * 0.7) {
                    chunk = chunk.substring(0, lastSpace);
                }
            }
            
            const trimmedChunk = chunk.trim();
            if (trimmedChunk.length > 0) {
                chunks.push(trimmedChunk);
            }
            
            start += chunk.length - OVERLAP;
            if (chunk.length <= OVERLAP) break; // Salida segura de bucle
        }
    }

    console.log(`[Sync Service] Fragmentación completada: se generaron ${chunks.length} chunks en total.`);

    // Guardar vectores en la base de datos vectorial
    await VectorDatabase.storeDocumentVectors(clientId, chunks);

    return chunks;
};

/**
 * Crea una subcarpeta en Google Drive con el nombre del cliente
 * dentro de la carpeta maestra configurada en las variables de entorno.
 */
export const createClientFolder = async (clientName: string): Promise<string> => {
    const MASTER_FOLDER_ID = process.env.MASTER_DRIVE_FOLDER_ID;
    if (!MASTER_FOLDER_ID) {
        console.error("[Google Drive Service] ❌ MASTER_DRIVE_FOLDER_ID no configurada en el archivo .env.");
        throw new Error("MASTER_DRIVE_FOLDER_ID no configurada en el servidor.");
    }

    try {
        const drive = getDriveClient();
        console.log(`[Google Drive Service] Creando subcarpeta '${clientName}' en Google Drive...`);

        const fileMetadata = {
            name: clientName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [MASTER_FOLDER_ID],
        };

        const folder = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
        });

        const folderId = folder.data.id;
        if (!folderId) {
            throw new Error("No se obtuvo un ID de la carpeta de Drive creada.");
        }

        console.log(`[Google Drive Service] ✅ Carpeta creada con éxito. ID: ${folderId}`);
        return folderId;
    } catch (error) {
        console.error("[Google Drive Service] ❌ Error creando carpeta en Drive:", error);
        throw error;
    }
};

/**
 * Sube un archivo directamente a una carpeta específica de Google Drive.
 */
export const uploadFileToFolder = async (
    folderId: string, 
    fileName: string, 
    mimeType: string, 
    fileStreamOrBuffer: any
): Promise<void> => {
    try {
        const drive = getDriveClient();
        console.log(`[Google Drive Service] Subiendo archivo '${fileName}' a la carpeta: ${folderId}...`);

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: mimeType,
            body: fileStreamOrBuffer,
        };

        await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id',
        });

        console.log(`[Google Drive Service] ✅ Archivo '${fileName}' subido con éxito.`);
    } catch (error) {
        console.error("[Google Drive Service] ❌ Error subiendo archivo a Drive:", error);
        throw error;
    }
};

/**
 * Lista todos los archivos contenidos en una carpeta de Google Drive.
 */
export const listFilesFromFolder = async (folderId: string): Promise<Array<{ id: string, name: string, mimeType: string }>> => {
    try {
        const drive = getDriveClient();
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
        });

        return (response.data.files || []) as Array<{ id: string, name: string, mimeType: string }>;
    } catch (error) {
        console.error("[Google Drive Service] ❌ Error listando archivos de Drive:", error);
        throw error;
    }
};
