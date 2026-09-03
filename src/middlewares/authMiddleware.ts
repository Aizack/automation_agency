import 'dotenv/config';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_fallback_key_123';

// Extender la interfaz Request de Express para incluir los datos del usuario autenticado
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId?: string;
    username: string;
    role: 'superadmin' | 'admin' | 'client' | 'tenant_admin' | 'employee';
    clientId?: string;
    permissions?: string[];
  };
}

/**
 * Middleware para validar que la petición incluye un token JWT válido
 */
export const authenticateToken = (
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

  const targetClientId = req.params.id || req.params.clientId;

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

