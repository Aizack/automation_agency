import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger';
import { StructuredLogger } from '../utils/structuredLogger';

/**
 * Interfaz extendida de Error con statusCode
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware global de manejo de errores
 * DEBE ser el último middleware registrado en Express
 */
export const errorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const correlationId = (req as any).correlationId || 'UNKNOWN';
  const endpoint = `${req.method} ${req.path}`;
  
  // Determinar statusCode y mensaje
  const statusCode = err.statusCode || (err instanceof AppError ? err.statusCode : 500);
  const message = err.message || 'Error interno del servidor';

  // Log estructurado
  StructuredLogger.error(
    `[UNHANDLED] ${endpoint}`,
    {
      correlationId,
      endpoint,
      method: req.method,
      statusCode,
      path: req.path,
      ...(req.user && { userId: (req.user as any).id })
    },
    err
  );

  // Si es un error crítico (5xx), registrar en system_alerts
  if (statusCode >= 500 && err.isOperational !== false) {
    const alertKey = `express_error_${req.method.toLowerCase()}_${req.path.split('/')[1]}`;
    await logger.raiseAlert(
      alertKey,
      'red',
      `Error en ${endpoint}: ${message}`,
      `Stack: ${err.stack}`,
      (req.user as any)?.id
    ).catch(alertErr => {
      console.error('Error registrando alerta:', alertErr);
    });
  }

  // Enviar respuesta de error
  res.status(statusCode).json({
    success: false,
    error: message,
    correlationId,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

/**
 * Wrapper para rutas async que automáticamente captura errores
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Pasar error al middleware de manejo de errores
      next(err);
    });
  };
};
