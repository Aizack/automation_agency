import { Request, Response, NextFunction } from 'express';
import { generateCorrelationId } from '../utils/correlationId';
import { StructuredLogger } from '../utils/structuredLogger';

/**
 * Middleware que inyecta correlationId en cada request
 * Permite rastrear requests a través de todo el sistema
 */
export const correlationIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Buscar correlationId en headers, o generar uno nuevo
  const correlationId = 
    (req.headers['x-correlation-id'] as string) || 
    (req.headers['correlation-id'] as string) ||
    generateCorrelationId();

  // Inyectar en el objeto request para acceso posterior
  (req as any).correlationId = correlationId;

  // Inyectar en headers de response
  res.setHeader('x-correlation-id', correlationId);

  // Registrar inicio del request
  const startTime = Date.now();
  const endpoint = `${req.method} ${req.path}`;

  // Interceptar el envío de response para loguear
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // No loguear health checks para evitar spam
    if (!req.path.includes('/health')) {
      const userInfo = (req as any).user ? { userId: (req as any).user.id } : {};
      StructuredLogger.info(`${endpoint} completed`, {
        correlationId,
        endpoint,
        method: req.method,
        statusCode,
        duration,
        ...userInfo
      });
    }

    return originalSend.call(this, data);
  };

  next();
};

/**
 * Extender la interfaz Request de Express para incluir correlationId
 */
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: {
        id: string;
        username?: string;
        role?: string;
      };
    }
  }
}
