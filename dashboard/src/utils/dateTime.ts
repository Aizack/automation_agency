/**
 * Utilidades de formato de Fechas y Horas Multi-Tenant respetando la Zona Horaria del Cliente
 */

export const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  'colombia': 'America/Bogota',
  'mexico': 'America/Mexico_City',
  'méxico': 'America/Mexico_City',
  'peru': 'America/Lima',
  'perú': 'America/Lima',
  'ecuador': 'America/Guayaquil',
  'chile': 'America/Santiago',
  'argentina': 'America/Argentina/Buenos_Aires',
  'espana': 'Europe/Madrid',
  'españa': 'Europe/Madrid',
  'venezuela': 'America/Caracas',
  'estados unidos': 'America/New_York',
  'usa': 'America/New_York',
  'panama': 'America/Panama',
  'panamá': 'America/Panama',
  'costa rica': 'America/Costa_Rica',
  'guatemala': 'America/Guatemala',
  'bolivia': 'America/La_Paz',
  'uruguay': 'America/Montevideo',
  'paraguay': 'America/Asuncion'
};

export const getClientTimeZone = (countryName?: string, explicitTimeZone?: string): string => {
  if (explicitTimeZone && explicitTimeZone.trim()) return explicitTimeZone.trim();
  const c = (countryName || localStorage.getItem('client_country') || 'Colombia').toLowerCase().trim();
  return COUNTRY_TIMEZONE_MAP[c] || 'America/Bogota';
};

/**
 * Normaliza cualquier fecha o timestamp recibido de Postgres o JSON (UTC sin Z, ISO con Z o YYYY-MM-DD)
 * para que JavaScript lo procese fielmente en la zona horaria destino.
 */
export const parseDateTime = (raw: string | Date | null | undefined): Date | null => {
  if (!raw) return null;
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  const str = String(raw).trim();
  if (!str) return null;

  // Si es una fecha pura YYYY-MM-DD, descomponerla para no sufrir desfases de medianoche UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  // Si es una fecha con medianoche exacta (ej: "2026-10-21 00:00:00" o "2026-10-21T00:00:00.000Z"),
  // proviene de un campo de fecha pura almacenado en columna timestamp. Usar mediodía local para evitar retroceso al día anterior.
  if (/^\d{4}-\d{2}-\d{2}[ T]00:00:00(\.0+)?(Z|[+-]\d{2}:\d{2})?$/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  // Si es un timestamp sin indicador de zona horaria (ej: "2026-08-30 01:06:08.026545" o "2026-08-30T01:06:08")
  // proveniente de Postgres (que almacena en UTC), añadirle la Z para que JS lo entienda como UTC
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(str) && !str.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str.replace(' ', 'T') + 'Z');
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
};

/**
 * Formatea una fecha de forma legible: ej. "13 oct. 2026"
 */
export const formatLocalDate = (
  raw: string | Date | null | undefined,
  timeZone: string = getClientTimeZone(),
  locale: string = 'es-CO'
): string => {
  const d = parseDateTime(raw);
  if (!d) return '';
  return d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone
  });
};

/**
 * Formatea una hora en formato am/pm: ej. "08:06 p. m."
 */
export const formatLocalTime = (
  raw: string | Date | null | undefined,
  timeZone: string = getClientTimeZone(),
  locale: string = 'es-CO'
): string => {
  const d = parseDateTime(raw);
  if (!d) return '';
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone
  });
};

/**
 * Formatea fecha y hora completa: ej. "13 oct. 2026, 08:06 p. m."
 */
export const formatLocalDateTime = (
  raw: string | Date | null | undefined,
  timeZone: string = getClientTimeZone(),
  locale: string = 'es-CO'
): string => {
  const d = parseDateTime(raw);
  if (!d) return '';
  return `${formatLocalDate(d, timeZone, locale)}, ${formatLocalTime(d, timeZone, locale)}`;
};
