import { LogContext } from './correlationId';

/**
 * Logging estructurado con contexto de correlationId
 * Se integra con el logger.ts existente
 */
export class StructuredLogger {
  /**
   * Log de información
   */
  static info(message: string, context?: Partial<LogContext>) {
    const log = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...context
    };
    console.log(JSON.stringify(log));
  }

  /**
   * Log de advertencia
   */
  static warn(message: string, context?: Partial<LogContext>) {
    const log = {
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...context
    };
    console.warn(JSON.stringify(log));
  }

  /**
   * Log de error
   */
  static error(message: string, context?: Partial<LogContext>, error?: any) {
    const log = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      errorMessage: error?.message,
      errorStack: error?.stack,
      ...context
    };
    console.error(JSON.stringify(log));
  }

  /**
   * Log de debug
   */
  static debug(message: string, context?: Partial<LogContext>) {
    if (process.env.NODE_ENV === 'development') {
      const log = {
        level: 'DEBUG',
        timestamp: new Date().toISOString(),
        message,
        ...context
      };
      console.debug(JSON.stringify(log));
    }
  }

  /**
   * Registra inicio y fin de operación
   */
  static operation(operationName: string, context?: Partial<LogContext>) {
    return {
      start: () => {
        StructuredLogger.info(`[START] ${operationName}`, context);
      },
      end: (duration: number, success = true, error?: any) => {
        const status = success ? 'SUCCESS' : 'FAILED';
        StructuredLogger[success ? 'info' : 'error'](
          `[END] ${operationName} - ${status}`,
          { ...context, duration, success },
          error
        );
      }
    };
  }
}
