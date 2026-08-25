/**
 * Formatea y traduce los mensajes de error técnicos del servidor o de PostgreSQL
 * a mensajes claros en español.
 */
export function translateErrorMessage(error: string | null | undefined, defaultMsg: string = 'Ocurrió un error inesperado'): string {
    if (!error) return defaultMsg;
    const str = String(error).trim();

    // Errores conocidos de PostgreSQL o base de datos
    if (str.includes('value too long for type character varying')) {
        const match = str.match(/varying\((\d+)\)/);
        const maxLen = match ? match[1] : '';
        return `El valor ingresado es demasiado largo ${maxLen ? `(máximo ${maxLen} caracteres)` : ''}. Por favor verifica los campos.`;
    }
    if (str.includes('duplicate key value violates unique constraint')) {
        return 'Ya existe un registro con estos mismos datos (teléfono, usuario o identificador duplicado).';
    }
    if (str.includes('foreign key constraint')) {
        return 'No se puede realizar la acción porque este elemento tiene registros asociados.';
    }
    if (str.includes('violates not-null constraint')) {
        return 'Por favor completa todos los campos requeridos.';
    }
    if (str.includes('invalid input syntax for type')) {
        return 'Formato de datos no válido. Revisa los valores ingresados.';
    }
    if (str.includes('Failed to fetch') || str.includes('NetworkError') || str.includes('Network Error')) {
        return 'Error de conexión a internet o con el servidor. Revisa tu conexión.';
    }
    if (str.includes('jwt expired') || str.includes('Token expired') || str.includes('Token inválido')) {
        return 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
    }

    return str;
}
