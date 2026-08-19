import { randomUUID } from 'crypto';

/**
 * Genera un ID único para correlacionar requests a través del sistema
 */
export const generateCorrelationId = (): string => {
  return randomUUID().substring(0, 8).toUpperCase();
};

/**
 * Contexto de ejecución para llevar el correlationId a través del flujo
 */
export interface LogContext {
  correlationId: string;
  clientId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: any;
  [key: string]: any;
}

/**
 * Crear un contexto con valores por defecto
 */
export const createLogContext = (correlationId: string, overrides?: Partial<LogContext>): LogContext => {
  return {
    correlationId,
    ...overrides
  };
};
