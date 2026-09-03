import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../database/postgres';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key_123';

// Extender la interfaz Request de Express para incluir los datos del usuario autenticado
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    employeeId?: string;
    username: string;
    role: 'superadmin' | 'admin' | 'client' | 'tenant_admin' | 'employee';
    clientId?: string;
    permissions?: string[];
    sessionId?: string;
  };
}

/**
 * Middleware para validar que la petición incluye un token JWT válido
 * y que la sesión no ha sido sobreescrita desde otro dispositivo.
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (!token) {
    console.warn("[Auth Middleware] Petición rechazada: Token no proporcionado.");
    return res.status(401).json({ success: false, error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
    req.user = decoded;

    // Validación de Sesión Única por Dispositivo en PostgreSQL
    if (decoded?.sessionId) {
      const userType = decoded.userId ? 'user' : decoded.employeeId ? 'employee' : 'client';
      const userLookupId = decoded.userId || decoded.employeeId || decoded.id;

      try {
        const sessionRes = await pool.query(
          `SELECT session_id FROM active_user_sessions WHERE user_type = $1 AND user_id = $2 LIMIT 1`,
          [userType, userLookupId]
        );

        if (sessionRes.rows.length > 0) {
          const activeSessionId = sessionRes.rows[0].session_id;
          if (activeSessionId !== decoded.sessionId) {
            console.warn(`[Auth Security] Sesión cerrada para ${decoded.username}: Iniciada en otro dispositivo.`);
            return res.status(401).json({ 
              success: false, 
              code: 'SESSION_OVERRIDDEN', 
              error: 'Tu sesión ha sido iniciada en otro dispositivo. Por seguridad se ha cerrado esta sesión.' 
            });
          }
        }
      } catch (dbErr) {
        console.warn("[Auth Security] Advertencia comprobando active_user_sessions:", dbErr);
      }
    }

    next();
  } catch (error) {
    console.warn("[Auth Middleware] Petición rechazada: Token inválido o expirado.");
    return res.status(403).json({ success: false, error: 'Token inválido o expirado.' });
  }
};

/**
 * Middleware para restringir accesos según el rol de la cuenta
 */
export const requireRole = (allowedRoles: Array<'superadmin' | 'admin' | 'client' | 'tenant_admin' | 'employee'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'No autorizado. Sesión no iniciada.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn(`[Auth Middleware] Permisos insuficientes. Usuario: ${req.user.username} (Rol: ${req.user.role}) intentó acceder a ruta protegida.`);
      return res.status(403).json({ success: false, error: 'Acceso denegado. Permisos insuficientes.' });
    }

    next();
  };
};

/**
 * Middleware para asegurar que el cliente que accede sea el dueño de los datos o el SuperAdmin global
 */
export const authorizeClientAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'No autorizado. Sesión no iniciada.' });
  }

  // Priorizar clientId de la ruta (evitando que req.params.id tome el ID del recurso individual)
  const targetClientId = req.params.clientId || req.params.id;

  // Si es SuperAdministrador Global de la plataforma, tiene acceso completo
  if (req.user.role === 'superadmin') {
    return next();
  }

  // Si es admin o usuario del tenant, verificar que su clientId o id coincida exactamente con targetClientId
  const userTenantId = req.user.clientId || req.user.id;
  if (targetClientId && userTenantId && userTenantId === targetClientId) {
    return next();
  }

  // Si es un empleado y pertenece a este cliente inquilino, permitir
  if (targetClientId && req.user.role === 'employee' && req.user.clientId === targetClientId) {
    return next();
  }

  console.warn(`[Auth Middleware] Acceso denegado: El usuario ${req.user.username} (Tenant User ID: ${req.user.id}) intentó acceder a recursos del cliente (${targetClientId}).`);
  return res.status(403).json({ success: false, error: 'Acceso denegado. No tienes permisos para gestionar este negocio o tienda.' });
};

