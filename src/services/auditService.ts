import { pool } from '../database/postgres';
import { Request } from 'express';

export interface AuditLogOptions {
  clientId: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  module: 'Seguridad' | 'Facturación' | 'Inventario' | 'CRM' | 'Domicilios' | 'IA & WhatsApp' | 'Laboratorio' | 'Configuración';
  description: string;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Registra una acción en la bitácora unificada de auditoría (system_audit_logs).
 */
export const logAudit = async (options: AuditLogOptions): Promise<void> => {
  try {
    const {
      clientId,
      userId = null,
      userName = 'Sistema / IA',
      userEmail = null,
      userRole = 'operador',
      action,
      module,
      description,
      details = null,
      ipAddress = null,
      userAgent = null,
    } = options;

    await pool.query(
      `INSERT INTO system_audit_logs 
        (client_id, user_id, user_name, user_email, user_role, action, module, description, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        clientId,
        userId,
        userName,
        userEmail,
        userRole,
        action,
        module,
        description,
        details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
      ]
    );

    console.log(`[Audit Trail 📜] [${module}] [${action}] por '${userName}' (Tenant: ${clientId}): ${description}`);
  } catch (error) {
    console.error('[Audit Trail ❌] Error al registrar evento de auditoría:', error);
  }
};

/**
 * Helper para extraer datos de usuario y request de Express y registrar la auditoría.
 */
export const logReqAudit = async (
  req: Request & { user?: any },
  clientId: string,
  action: string,
  module: 'Seguridad' | 'Facturación' | 'Inventario' | 'CRM' | 'Domicilios' | 'IA & WhatsApp' | 'Laboratorio' | 'Configuración',
  description: string,
  details?: any
): Promise<void> => {
  const user = req.user;
  const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;

  await logAudit({
    clientId: clientId,
    userId: user?.id || user?.userId || null,
    userName: user?.name || user?.username || user?.email || 'Usuario Panel',
    userEmail: user?.email || null,
    userRole: user?.role || 'operador',
    action,
    module,
    description,
    details,
    ipAddress,
    userAgent,
  });
};
