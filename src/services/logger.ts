import fs from 'fs';
import path from 'path';
import { pool } from '../database/postgres';

const LOGS_DIR = path.join(process.cwd(), 'logs');
const ALERT_THROTTLE_MS = 300000; // 5 minutos - evita alertas duplicadas

// Mapear cuándo fue la última alerta de cada tipo
const alertThrottleMap = new Map<string, number>();

// Asegurar que exista la carpeta de logs
if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Verificar si una alerta debe ser throttled (silenciada temporalmente)
 */
const isAlertThrottled = (alertKey: string, clientId?: string): boolean => {
    const throttleKey = `${alertKey}:${clientId || 'system'}`;
    const lastAlertTime = alertThrottleMap.get(throttleKey);
    const now = Date.now();

    if (!lastAlertTime) {
        // Primera vez que se dispara esta alerta
        alertThrottleMap.set(throttleKey, now);
        return false;
    }

    const timeSinceLastAlert = now - lastAlertTime;
    if (timeSinceLastAlert < ALERT_THROTTLE_MS) {
        // Alerta está siendo throttled
        return true;
    }

    // Suficiente tiempo ha pasado, actualizar timestamp
    alertThrottleMap.set(throttleKey, now);
    return false;
};

/**
 * Helper to write logs to files locally
 */
const writeToFile = (fileName: string, message: string) => {
    const filePath = path.join(LOGS_DIR, fileName);
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(filePath, logLine);
};

/**
 * Sends a structured, rich webhook alert to Discord
 */
const sendDiscordAlert = async (alertKey: string, severity: string, message: string, detail?: string) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const emoji = severity === 'red' ? '🔴' : severity === 'orange' ? '🟠' : '🟡';
    const title = `${emoji} **[SISTEMA - ALERTA DE INCIDENCIA]**`;
    const embed = {
        title: title,
        color: severity === 'red' ? 15158332 : severity === 'orange' ? 15105536 : 16776960, // HSL Hex equivalents
        fields: [
            { name: 'Tipo de Error', value: `\`${alertKey}\``, inline: true },
            { name: 'Gravedad', value: severity.toUpperCase(), inline: true },
            { name: 'Mensaje', value: message },
            { name: 'Hora', value: new Date().toLocaleString('es-CO'), inline: true }
        ],
        timestamp: new Date().toISOString()
    };

    if (detail) {
        embed.fields.push({ name: 'Detalle Técnico', value: `\`\`\`javascript\n${detail.substring(0, 1000)}\n\`\`\`` });
    }

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
    } catch (err: any) {
        console.error("[Logger Discord Alert] No se pudo enviar alerta a Discord:", err.message);
    }
};

/**
 * Sends a recovery message to Discord when an issue is resolved
 */
const sendDiscordRecovery = async (alertKey: string, message: string) => {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    const embed = {
        title: `🟢 **[SISTEMA - INCIDENCIA RESUELTA]**`,
        color: 3066993, // Green
        fields: [
            { name: 'Tipo de Error', value: `\`${alertKey}\``, inline: true },
            { name: 'Resolución', value: message },
            { name: 'Hora', value: new Date().toLocaleString('es-CO'), inline: true }
        ],
        timestamp: new Date().toISOString()
    };

    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [embed] })
        });
    } catch (err: any) {
        console.error("[Logger Discord Alert] No se pudo enviar recuperación a Discord:", err.message);
    }
};

export const logger = {
    info: (message: string) => {
        console.log(`[INFO] ${message}`);
        writeToFile('combined.log', `[INFO] ${message}`);
    },

    warn: (message: string) => {
        console.warn(`[WARN] ⚠️ ${message}`);
        writeToFile('combined.log', `[WARN] ${message}`);
    },

    error: (message: string, error?: any) => {
        const errorMsg = error ? `${message} | Error: ${error.message || error}` : message;
        const stack = error?.stack || '';
        
        console.error(`[ERROR] ❌ ${errorMsg}`);
        writeToFile('combined.log', `[ERROR] ${errorMsg}`);
        writeToFile('error.log', `[ERROR] ${errorMsg}\nStack: ${stack}`);
    },

    /**
     * Raises a state-based system alert, writing to DB and alerting Discord (throttled).
     */
    raiseAlert: async (alertKey: string, severity: 'red' | 'orange' | 'yellow', message: string, detail?: string, clientId?: string): Promise<void> => {
        try {
            // Verificar si esta alerta está siendo throttled
            if (isAlertThrottled(alertKey, clientId)) {
                console.warn(`[ALERT THROTTLED] Key: ${alertKey} (silenciada por ${ALERT_THROTTLE_MS / 1000}s)`);
                return;
            }

            // Write local log first
            logger.error(`[ALERT RAISED] Key: ${alertKey} | ${message}${clientId ? ` | Tenant: ${clientId}` : ''}`, detail);

            // Importar dinámicamente para evitar dependencia circular
            const { client: waClient, whatsappState } = await import('./whatsapp');

            // Verificar si ya existe una alerta activa con el mismo alertKey
            const existingAlert = clientId 
                ? await pool.query(
                    `SELECT id, created_at FROM system_alerts WHERE alert_key = $1 AND client_id = $2 AND status = 'active' LIMIT 1`,
                    [alertKey, clientId]
                  )
                : await pool.query(
                    `SELECT id, created_at FROM system_alerts WHERE alert_key = $1 AND client_id IS NULL AND status = 'active' LIMIT 1`,
                    [alertKey]
                  );

            if (existingAlert.rows.length > 0) {
                // Throttled: Ya existe y está activa. Solo actualizamos el timestamp, no mandamos a Discord para evitar spam.
                await pool.query(
                    `UPDATE system_alerts SET created_at = NOW() WHERE id = $1`,
                    [existingAlert.rows[0].id]
                );
                return;
            }

            // Registrar en base de datos
            await pool.query(
                `INSERT INTO system_alerts (alert_key, severity, message, status, client_id, severity_level) 
                 VALUES ($1, $2, $3, 'active', $4, $5)`,
                [alertKey, severity, message, clientId || null, severity === 'red' ? 1 : severity === 'orange' ? 2 : 3]
            );

            // Enviar alerta a Discord
            await sendDiscordAlert(alertKey, severity, `${message}${clientId ? ` (Negocio: ${clientId})` : ''}`, detail);

            // Enviar alerta por WhatsApp si está conectado (fallback)
            const adminPhone = process.env.ADMIN_ALERT_PHONE;
            if (adminPhone && waClient && whatsappState.status === 'CONNECTED' && alertKey !== 'whatsapp_disconnected') {
                const target = adminPhone.includes('@c.us') ? adminPhone : `${adminPhone}@c.us`;
                const whatsappAlertMsg = `⚠️ *[ALERTA CRÍTICA DIAZLAB]*\n\n*Tipo:* ${alertKey}\n*Gravedad:* ${severity.toUpperCase()}\n*Mensaje:* ${message}${clientId ? `\n*Negocio:* ${clientId}` : ''}`;
                await waClient.sendMessage(target, whatsappAlertMsg).catch(err => 
                    console.error("[Logger WhatsApp Alert] Falló envío:", err.message)
                );
            }

        } catch (dbErr) {
            console.error("[Logger raiseAlert] Error al guardar alerta en DB:", dbErr);
        }
    },

    /**
     * Resolves a state-based system alert in the DB and posts a recovery message to Discord.
     */
    resolveAlert: async (alertKey: string, resolutionMessage: string = 'El sistema se ha recuperado automáticamente.', clientId?: string): Promise<void> => {
        try {
            // Verificar si hay alertas activas de este tipo
            const activeAlerts = clientId
                ? await pool.query(
                    `SELECT id FROM system_alerts WHERE alert_key = $1 AND client_id = $2 AND status = 'active'`,
                    [alertKey, clientId]
                  )
                : await pool.query(
                    `SELECT id FROM system_alerts WHERE alert_key = $1 AND client_id IS NULL AND status = 'active'`,
                    [alertKey]
                  );

            if (activeAlerts.rows.length === 0) return; // No hay nada que resolver

            // Importar dinámicamente para evitar dependencia circular
            const { client: waClient, whatsappState } = await import('./whatsapp');

            // Actualizar a resuelto en DB
            if (clientId) {
                await pool.query(
                    `UPDATE system_alerts 
                     SET status = 'resolved', resolved_at = NOW() 
                     WHERE alert_key = $1 AND client_id = $2 AND status = 'active'`,
                    [alertKey, clientId]
                );
            } else {
                await pool.query(
                    `UPDATE system_alerts 
                     SET status = 'resolved', resolved_at = NOW() 
                     WHERE alert_key = $1 AND client_id IS NULL AND status = 'active'`,
                    [alertKey]
                );
            }

            logger.info(`[ALERT RESOLVED] Key: ${alertKey} | ${resolutionMessage}${clientId ? ` | Tenant: ${clientId}` : ''}`);

            // Enviar mensaje de recuperación a Discord
            await sendDiscordRecovery(alertKey, `${resolutionMessage}${clientId ? ` (Negocio: ${clientId})` : ''}`);

            // Enviar recuperación por WhatsApp (si aplica)
            const adminPhone = process.env.ADMIN_ALERT_PHONE;
            if (adminPhone && waClient && whatsappState.status === 'CONNECTED' && alertKey !== 'whatsapp_disconnected') {
                const target = adminPhone.includes('@c.us') ? adminPhone : `${adminPhone}@c.us`;
                const whatsappRecoveryMsg = `🟢 *[INCIDENCIA RESUELTA DIAZLAB]*\n\n*Tipo:* ${alertKey}\n*Estado:* Resuelto\n*Detalle:* ${resolutionMessage}${clientId ? `\n*Negocio:* ${clientId}` : ''}`;
                await waClient.sendMessage(target, whatsappRecoveryMsg).catch(err => 
                    console.error("[Logger WhatsApp Recovery] Falló envío:", err.message)
                );
            }

        } catch (dbErr) {
            console.error("[Logger resolveAlert] Error al resolver alerta en DB:", dbErr);
        }
    }
};
