import { Request, Response, NextFunction } from 'express';
import { pool } from '../database/postgres';
export interface ExtendedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: 'admin' | 'client' | 'employee';
    clientId?: string; // Solo presente si el rol es 'employee'
  };
}

/**
 * Middleware para requerir que un módulo específico esté habilitado para el inquilino (tenant)
 */
export const requireModule = (moduleName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as ExtendedRequest;
      
      // Obtener el ID del cliente (inquilino)
      // Puede venir de los params (e.g. /api/clients/:clientId/...) 
      // o del token JWT si es un cliente (/api/me) o de un empleado (clientId)
      let clientId = req.params.clientId;
      
      if (!clientId && authReq.user) {
        if (authReq.user.role === 'client') {
          clientId = authReq.user.id;
        } else if (authReq.user.role === 'employee' && authReq.user.clientId) {
          clientId = authReq.user.clientId;
        }
      }

      // Si es un administrador global, omitir la validación (tiene todos los accesos)
      if (authReq.user && authReq.user.role === 'admin') {
        return next();
      }

      if (!clientId) {
        return res.status(400).json({ success: false, error: 'Identificador del cliente no proporcionado.' });
      }

      // Consultar enabled_modules del cliente
      const result = await pool.query(
        `SELECT enabled_modules FROM clients WHERE id = $1 LIMIT 1`,
        [clientId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Cliente no encontrado.' });
      }

      const enabledModules = result.rows[0].enabled_modules;
      
      // Validar si el módulo está explícitamente en false
      if (enabledModules && enabledModules[moduleName] === false) {
        console.warn(`[Module Middleware] Acceso denegado: El módulo '${moduleName}' está desactivado para el cliente '${clientId}'.`);
        return res.status(403).json({ 
          success: false, 
          error: `El módulo '${moduleName}' no está habilitado para esta cuenta. Por favor contáctanos para activarlo.` 
        });
      }

      next();
    } catch (error: any) {
      console.error(`[Module Middleware] Error en validación de módulo '${moduleName}':`, error);
      res.status(500).json({ success: false, error: 'Error interno al validar el módulo.' });
    }
  };
};
