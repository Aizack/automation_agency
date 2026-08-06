import fs from 'fs';
import path from 'path';
import { activeWaSessions } from '../services/whatsapp';
import { gracefulShutdown, restoreSystemState } from '../services/shutdownManager';

const STATE_FILE_PATH = path.join(process.cwd(), 'shutdown_state.json');

async function runTest() {
  console.log("🧪 [TEST SHUTDOWN] Iniciando prueba de Apagado Gracioso y Restauración...");

  // Asegurar que el archivo de estado previo no exista
  if (fs.existsSync(STATE_FILE_PATH)) {
    fs.unlinkSync(STATE_FILE_PATH);
  }

  // 1. Simular una sesión activa de carga de archivos (con vencimiento dentro de 5 minutos)
  const phone = '573112223333';
  const clientId = 'client_test_graceful';
  const expiresAt = Date.now() + 5 * 60 * 1000;
  
  activeWaSessions.set(phone, {
    clientId,
    expiresAt
  });
  console.log(`[TEST SHUTDOWN] 1. Sesión de prueba configurada: Teléfono ${phone}, Cliente: ${clientId}`);

  // 2. Modificar la función process.exit para interceptar y validar en lugar de cerrar el proceso
  const originalExit = process.exit;
  let exitCodeCalled: number | null = null;
  
  // @ts-ignore
  process.exit = (code?: number) => {
    exitCodeCalled = code !== undefined ? code : 0;
    console.log(`[TEST SHUTDOWN] process.exit llamado con código: ${exitCodeCalled}`);
    return undefined as never;
  };

  // 3. Ejecutar gracefulShutdown
  console.log("[TEST SHUTDOWN] 2. Disparando gracefulShutdown('SIGINT')...");
  await gracefulShutdown('SIGINT');

  // Restaurar process.exit original
  process.exit = originalExit;

  // 4. Validaciones del apagado
  console.log("[TEST SHUTDOWN] 3. Validando creación de shutdown_state.json...");
  if (!fs.existsSync(STATE_FILE_PATH)) {
    throw new Error("❌ FALLO: El archivo shutdown_state.json no fue creado.");
  }
  console.log("✅ Éxito: El archivo shutdown_state.json fue creado.");

  const fileContent = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
  const state = JSON.parse(fileContent);
  console.log("Contenido de shutdown_state.json:", JSON.stringify(state, null, 2));

  if (state.activeUploadSessions[0].phone !== phone || state.activeUploadSessions[0].clientId !== clientId) {
    throw new Error("❌ FALLO: Los datos guardados en el archivo no coinciden con la sesión activa.");
  }
  console.log("✅ Éxito: Los datos guardados en el archivo coinciden.");

  // Limpiar mapa en memoria para testear restauración
  activeWaSessions.clear();
  console.log("[TEST SHUTDOWN] 4. Mapa en memoria activeWaSessions limpiado.");

  // 5. Probar restauración
  console.log("[TEST SHUTDOWN] 5. Disparando restoreSystemState()...");
  restoreSystemState();

  // Validaciones de la restauración
  console.log("[TEST SHUTDOWN] 6. Validando restauración de sesiones en memoria...");
  const restoredSession = activeWaSessions.get(phone);
  if (!restoredSession || restoredSession.clientId !== clientId) {
    throw new Error("❌ FALLO: La sesión activa no fue restaurada en memoria.");
  }
  console.log("✅ Éxito: La sesión activa fue restaurada correctamente en activeWaSessions.");

  console.log("[TEST SHUTDOWN] 7. Validando eliminación física del archivo temporal...");
  if (fs.existsSync(STATE_FILE_PATH)) {
    throw new Error("❌ FALLO: El archivo shutdown_state.json sigue existiendo tras la restauración.");
  }
  console.log("✅ Éxito: El archivo shutdown_state.json fue eliminado del disco.");

  console.log("\n🎉 [TEST SHUTDOWN] ¡TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO! El gestor de apagado y restauración funciona a la perfección.");
}

runTest().catch((err) => {
  console.error("❌ Error en la prueba:", err);
  process.exit(1);
});
