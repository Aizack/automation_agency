import fs from 'fs';
import path from 'path';
import { enviarAudioTool } from '../tools/enviarAudio';

async function run() {
    console.log("🧪 [TEST AUDIOS PREGRABADOS] Iniciando prueba de herramienta de audio...");

    const tempClientId = 'client_test_voice_notes';
    const tempMediaDir = path.join(process.cwd(), 'media', 'clients', tempClientId);

    try {
        // 1. Asegurar directorio temporal
        if (!fs.existsSync(tempMediaDir)) {
            fs.mkdirSync(tempMediaDir, { recursive: true });
        }

        // 2. Escribir un archivo dummy de audio (.mp3)
        const dummyFilePath = path.join(tempMediaDir, 'bienvenida.mp3');
        fs.writeFileSync(dummyFilePath, 'MOCK AUDIO BUFFER CONTENT');
        console.log(`✅ [Paso 1] Archivo de prueba creado en: ${dummyFilePath}`);

        // 3. Ejecutar la herramienta `reproducir_audio` con callback mockeado
        console.log("\n🔄 [Paso 2] Ejecutando enviarAudioTool...");
        const result = await enviarAudioTool.execute(
            { etiqueta: 'bienvenida' }, 
            tempClientId, 
            '573046247664',
            async (to, filePath) => {
                console.log(`➡️ [WhatsApp Callback Triggered] Enviando nota de voz a +${to}`);
                console.log(`   - Ruta física: ${filePath}`);
                // Verificar que el archivo existe
                if (fs.existsSync(filePath)) {
                    console.log("   - Verificación de archivo física: Existe y es accesible.");
                } else {
                    throw new Error("El archivo no existe en la ruta.");
                }
            }
        );

        console.log("\n🤖 Respuesta de la herramienta:");
        console.log("----------------------------------------");
        console.log(result);
        console.log("----------------------------------------");
        console.log("🎉 [TEST] ¡Prueba de audios pregrabados completada exitosamente!");

    } catch (err: any) {
        console.error("❌ Error en ejecución del test:", err.message);
    } finally {
        // Limpieza de archivos temporales
        try {
            if (fs.existsSync(tempMediaDir)) {
                const files = fs.readdirSync(tempMediaDir);
                for (const file of files) {
                    fs.unlinkSync(path.join(tempMediaDir, file));
                }
                fs.rmdirSync(tempMediaDir);
                console.log("\n🧹 Limpieza completada.");
            }
        } catch (e) {
            console.error("Error en limpieza:", e);
        }
    }
}

run();
