import { uploadFileToFolder, fetchDocumentsFromDrive } from '../services/drive';
import { getClientById } from '../database/clientsCrud';
import { pool } from '../database/postgres';
import { Readable } from 'stream';

export const guardarPerfilNegocioTool = {
    name: "guardar_perfil_negocio",
    description: "Guarda el resumen de la información del negocio (perfil, horarios, FAQs, etc.) recolectada durante el onboarding en un archivo de Drive y lo indexa en la base de conocimientos RAG del bot.",
    parameters: {
        type: "object",
        properties: {
            clientId: { 
                type: "string", 
                description: "El ID único del cliente/negocio generado durante el registro (ej. client_clinica_dental_plus_1234)" 
            },
            perfilTexto: { 
                type: "string", 
                description: "El resumen estructurado de las respuestas del onboarding (productos/servicios, horarios, ubicación, preguntas frecuentes)" 
            }
        },
        required: ["clientId", "perfilTexto"]
    },
    execute: async (args: { clientId?: string, perfilTexto: string }, senderPhone?: string) => {
        console.log(`[Tool Guardar Perfil] 🚀 Guardando base de conocimientos para cliente: ${args.clientId || 'no_id'} (Sender: ${senderPhone})`);

        let clientData = null;

        // 1. Intentar buscar por clientId si se proporciona
        if (args.clientId) {
            clientData = await getClientById(args.clientId);
        }

        // 2. Fallback: Buscar por el número de teléfono del dueño (owner_phone o phone_number)
        if (!clientData && senderPhone) {
            console.log(`[Tool Guardar Perfil] 🔍 Buscando cliente por owner_phone/phone_number = ${senderPhone}...`);
            const res = await pool.query(
                `SELECT 
                    id, 
                    name, 
                    phone_number AS "phoneNumber", 
                    system_prompt AS "systemPrompt", 
                    active_tools AS "activeTools", 
                    status, 
                    agent_phone AS "agentPhone",
                    drive_folder_id AS "driveFolderId",
                    owner_phone AS "ownerPhone"
                 FROM clients 
                 WHERE RIGHT(owner_phone, 10) = RIGHT($1, 10) OR RIGHT(phone_number, 10) = RIGHT($1, 10) 
                 LIMIT 1`,
                [senderPhone]
            );
            if (res.rows.length > 0) {
                clientData = res.rows[0];
                console.log(`[Tool Guardar Perfil] ✅ Cliente encontrado por teléfono: ${clientData.name} (ID: ${clientData.id})`);
            }
        }

        if (!clientData) {
            throw new Error(`No se encontró cliente con ID '${args.clientId}' ni con teléfono '${senderPhone}'.`);
        }

        const resolvedClientId = clientData.id;
        const folderId = clientData.driveFolderId;
        if (!folderId) {
            throw new Error(`El cliente '${clientData.name}' no tiene una carpeta de Google Drive configurada.`);
        }

        // 3. Crear stream a partir del texto del perfil
        const stream = new Readable();
        stream.push(args.perfilTexto);
        stream.push(null);

        // 4. Subir el archivo 'perfil_negocio.txt' a Google Drive (sobrescribe si ya existe)
        const fileName = "perfil_negocio.txt";
        await uploadFileToFolder(folderId, fileName, "text/plain", stream);
        console.log(`[Tool Guardar Perfil] ✅ Archivo '${fileName}' subido exitosamente a la carpeta ${folderId}`);

        // 5. Sincronizar RAG híbrido
        console.log(`[Tool Guardar Perfil] 🔄 Sincronizando fragmentos RAG en la base de datos...`);
        const chunks = await fetchDocumentsFromDrive(resolvedClientId, folderId);
        console.log(`[Tool Guardar Perfil] ✅ Sincronización RAG completada. ${chunks.length} fragmentos creados.`);

        return JSON.stringify({
            success: true,
            clientId: resolvedClientId,
            fileName,
            chunksCreated: chunks.length,
            message: "Perfil de negocio guardado e indexado en el bot con éxito."
        });
    }
};
