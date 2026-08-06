import fs from 'fs';
import path from 'path';
import { pool } from '../database/postgres';
import { client, whatsappState, activeWaSessions } from './whatsapp';
import { stopEscalationService } from './escalation';

const STATE_FILE_PATH = path.join(process.cwd(), 'shutdown_state.json');

/**
 * Recopila el estado de los procesos y variables activas en el sistema
 */
async function captureSystemState() {
  const activeTakeovers: any[] = [];
  try {
    const res = await pool.query(`
      SELECT id, client_id, customer_phone, current_agent_phone, assigned_at 
      FROM takeover_sessions 
      WHERE status = 'active'
    `);
    activeTakeovers.push(...res.rows);
  } catch (err) {
    console.error("[Shutdown Manager] Error consultando sesiones activas en DB:", err);
  }

  const activeUploadSessions: any[] = [];
  activeWaSessions.forEach((value, key) => {
    activeUploadSessions.push({
      phone: key,
      clientId: value.clientId,
      expiresAt: value.expiresAt
    });
  });

  return {
    timestamp: new Date().toISOString(),
    whatsapp: {
      status: whatsappState.status,
      phone: whatsappState.phone,
      hasClientInstance: client !== null
    },
    activeUploadSessions,
    activeTakeovers,
    process: {
      pid: process.pid,
      uptime: process.uptime()
    }
  };
}

/**
 * Detiene los servicios de forma limpia y desescalada
 */
export async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 [Shutdown Manager] Señal de apagado recibida (${signal}). Iniciando desescalamiento de procesos...`);

  try {
    // 1. Guardar estado del sistema en archivo JSON
    const systemState = await captureSystemState();
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(systemState, null, 2), 'utf-8');
    console.log(`[Shutdown Manager] ✅ Estado del sistema guardado en: ${STATE_FILE_PATH}`);

    // 2. Detener el servicio de escalamiento en cascada
    console.log("[Shutdown Manager] Deteniendo Escalation Service...");
    stopEscalationService();

    // 3. Cerrar el servidor Express (dinámico)
    try {
      const { server } = require('../server');
      if (server) {
        console.log("[Shutdown Manager] Cerrando servidor HTTP...");
        await new Promise<void>((resolve) => {
          server.close((err: any) => {
            if (err) console.error("[Shutdown Manager] Error al cerrar servidor HTTP:", err);
            else console.log("[Shutdown Manager] ✅ Servidor HTTP cerrado.");
            resolve();
          });
        });
      }
    } catch (serverErr) {
      console.error("[Shutdown Manager] Error al intentar cerrar el servidor HTTP:", serverErr);
    }

    // 4. Cerrar el cliente de WhatsApp Web (crucial para cerrar el Puppeteer/Chrome en segundo plano)
    if (client) {
      console.log("[Shutdown Manager] Destruyendo cliente de WhatsApp Puppeteer...");
      try {
        await client.destroy();
        console.log("[Shutdown Manager] ✅ Cliente de WhatsApp destruido limpiamente.");
      } catch (err) {
        console.error("[Shutdown Manager] Error destruyendo cliente de WhatsApp:", err);
      }
    }

    // 5. Cerrar el pool de base de datos PostgreSQL
    console.log("[Shutdown Manager] Cerrando conexiones de base de datos...");
    await pool.end();
    console.log("[Shutdown Manager] ✅ Conexiones de base de datos terminadas.");

    console.log("[Shutdown Manager] 👋 Apagado limpio completado. Saliendo del proceso.");
    process.exit(0);
  } catch (error) {
    console.error("[Shutdown Manager] ❌ Error crítico durante el apagado:", error);
    process.exit(1);
  }
}

/**
 * Restaura el estado de subidas activas guardadas y borra el archivo temporal
 */
export function restoreSystemState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      console.log(`\n🔄 [Shutdown Manager] Detectado archivo de estado temporal: ${STATE_FILE_PATH}`);
      const fileContent = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
      const state = JSON.parse(fileContent);

      // Restaurar sesiones de carga de archivos (omitiendo las que ya expiraron)
      if (Array.isArray(state.activeUploadSessions)) {
        let restoredCount = 0;
        const now = Date.now();
        state.activeUploadSessions.forEach((sess: any) => {
          if (sess.expiresAt > now) {
            activeWaSessions.set(sess.phone, {
              clientId: sess.clientId,
              expiresAt: sess.expiresAt
            });
            restoredCount++;
          }
        });
        console.log(`[Shutdown Manager] ✅ Restauradas ${restoredCount} de ${state.activeUploadSessions.length} sesiones de carga de archivos activas.`);
      }

      // Eliminar el archivo del disco para que sea temporal
      fs.unlinkSync(STATE_FILE_PATH);
      console.log("[Shutdown Manager] 🧹 Archivo temporal shutdown_state.json eliminado del disco con éxito.");
    }
  } catch (err) {
    console.error("[Shutdown Manager] ❌ Error restaurando el estado del sistema:", err);
  }
}

// Registrar manejadores de señales del sistema operativo
export function registerShutdownHandlers() {
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGQUIT'];
  
  signals.forEach((signal) => {
    process.on(signal, () => {
      gracefulShutdown(signal);
    });
  });

  console.log("[Shutdown Manager] 🛡️ Manejadores de apagado registrados con éxito.");
}
