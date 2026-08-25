import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
    [ip: string]: {
        count: number;
        resetTime: number;
    };
}

export const createRateLimiter = (options: { windowMs: number; max: number; message?: string }) => {
    const store: RateLimitStore = {};

    // Limpieza periódica de memoria cada 2 minutos
    setInterval(() => {
        const now = Date.now();
        for (const ip in store) {
            if (store[ip].resetTime < now) {
                delete store[ip];
            }
        }
    }, 120000);

    return (req: Request, res: Response, next: NextFunction) => {
        const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown_ip';
        const now = Date.now();

        if (!store[ip] || store[ip].resetTime < now) {
            store[ip] = {
                count: 1,
                resetTime: now + options.windowMs
            };
            return next();
        }

        store[ip].count += 1;

        if (store[ip].count > options.max) {
            const retryAfterSecs = Math.ceil((store[ip].resetTime - now) / 1000);
            res.setHeader('Retry-After', retryAfterSecs.toString());
            return res.status(429).json({
                success: false,
                error: options.message || 'Demasiadas peticiones. Por seguridad, espera un momento antes de reintentar.',
                retryAfterSeconds: retryAfterSecs
            });
        }

        next();
    };
};

// Limiter 1: Sensible - Autenticación y Verificación de PIN (Máximo 10 intentos por minuto)
export const authRateLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: '🛡️ Demasiados intentos de acceso o verificación de PIN. Por seguridad se ha pausado temporalmente tu IP.'
});

// Limiter 2: Endpoints de generación / Pruebas (Máximo 5 peticiones por 5 minutos)
export const seedRateLimiter = createRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: '⚠️ Límite de generación de datos de prueba alcanzado. Espera un momento.'
});

// Limiter 3: API General (Máximo 150 peticiones por minuto)
export const generalApiLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 150,
    message: 'Límite general de peticiones a la API superado.'
});
