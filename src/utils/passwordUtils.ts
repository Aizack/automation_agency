/**
 * Utilidades para hashing y verificación de contraseñas con bcrypt.
 * Incluye fallback de texto plano para retrocompatibilidad con
 * contraseñas antiguas almacenadas sin hash.
 */

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

/**
 * Genera un hash bcrypt de una contraseña en texto plano.
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Verifica una contraseña contra un hash almacenado.
 * Si el hash no empieza con '$2b$' o '$2a$', compara como texto plano
 * para mantener compatibilidad con contraseñas antiguas.
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  const isBcryptHash = storedHash.startsWith('$2b$') || storedHash.startsWith('$2a$');

  if (isBcryptHash) {
    return bcrypt.compare(plainPassword, storedHash);
  }

  // Fallback: comparación en texto plano (contraseñas legadas)
  return plainPassword === storedHash;
}

/**
 * Indica si una contraseña almacenada ya está hasheada con bcrypt.
 * Útil para decidir si migrar la contraseña al siguiente login.
 */
export function isHashedPassword(storedValue: string): boolean {
  return storedValue.startsWith('$2b$') || storedValue.startsWith('$2a$');
}
