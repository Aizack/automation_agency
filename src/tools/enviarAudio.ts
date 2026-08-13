import fs from 'fs';
import path from 'path';

export const enviarAudioTool = {
    name: "reproducir_audio",
    description: "Envía una nota de voz pregrabada del dueño del negocio al usuario. Utilízalo para contestar de manera más humana o cercana.",
    parameters: {
        type: "object",
        properties: {
            etiqueta: { 
                type: "string", 
                description: "La etiqueta o nombre del audio a reproducir (ej. 'bienvenida', 'horarios', 'traspaso')" 
            }
        },
        required: ["etiqueta"]
    },
    execute: async (
        args: { etiqueta: string }, 
        clientId?: string, 
        customerPhone?: string,
        sendVoiceFn?: (to: string, filePath: string) => Promise<any>
    ) => {
        const targetClientId = clientId || 'unknown';
        const targetPhone = customerPhone || 'unknown';
        const cleanTag = args.etiqueta.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        
        console.log(`[Tool Reproducir Audio] 🎙️ Buscando audio '${cleanTag}' para el cliente '${targetClientId}'...`);
        
        const clientMediaDir = path.join(process.cwd(), 'media', 'clients', targetClientId, 'audios');
        if (!fs.existsSync(clientMediaDir)) {
            throw new Error(`La carpeta de audios para el cliente ${targetClientId} no existe.`);
        }

        // Buscar archivo de audio que coincida con la etiqueta
        const files = fs.readdirSync(clientMediaDir);
        const matchingFile = files.find(file => {
            const ext = path.extname(file);
            return path.basename(file, ext) === cleanTag;
        });

        if (!matchingFile) {
            throw new Error(`No se encontró ningún audio con la etiqueta '${cleanTag}'.`);
        }

        const filePath = path.join(clientMediaDir, matchingFile);
        console.log(`[Tool Reproducir Audio] Archivo encontrado: ${filePath}`);

        if (sendVoiceFn) {
            await sendVoiceFn(targetPhone, filePath);
            console.log(`[Tool Reproducir Audio] ✅ Audio enviado como nota de voz a +${targetPhone}`);
            return `Éxito: Nota de voz '${cleanTag}' enviada correctamente al cliente.`;
        } else {
            console.warn("[Tool Reproducir Audio] No se pasó sendVoiceFn callback (Modo simulación).");
            return `Simulación: Nota de voz '${cleanTag}' reproducida con éxito.`;
        }
    }
};
