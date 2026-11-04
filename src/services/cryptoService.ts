import crypto from 'crypto';

// Clave de cifrado simétrica derivada del entorno (o JWT_SECRET)
const getEncryptionKey = (): Buffer => {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'frant-secure-default-key-production-2026';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Cifra un texto plano usando AES-256-GCM (Requisito CASA Tier 2 / OWASP ASVS v4.0.3)
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `enc_v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descifra un payload cifrado con AES-256-GCM.
 * Si el texto no está cifrado (legacy), lo devuelve tal cual para retrocompatibilidad transparente.
 */
export function decryptToken(cipherPayload: string): string {
  if (!cipherPayload) return '';
  if (!cipherPayload.startsWith('enc_v1:')) {
    return cipherPayload; // Retrocompatibilidad para tokens existentes no cifrados
  }
  try {
    const parts = cipherPayload.split(':');
    if (parts.length !== 4) return cipherPayload;
    const iv = Buffer.from(parts[1], 'hex');
    const authTag = Buffer.from(parts[2], 'hex');
    const encryptedHex = parts[3];
    const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('[CryptoService] Error descifrando token:', err);
    return cipherPayload;
  }
}

/**
 * Firma un estado OAuth con HMAC-SHA256 y expiración para mitigar ataques CSRF (RFC 6749 / CASA)
 */
export function signOAuthState(data: { type: string; clientId: string }): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const exp = Date.now() + 15 * 60 * 1000; // 15 minutos de vigencia
  const payload = JSON.stringify({ ...data, nonce, exp });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const hmac = crypto.createHmac('sha256', getEncryptionKey()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${hmac}`;
}

/**
 * Valida la firma HMAC y la expiración del estado OAuth
 */
export function verifyOAuthState(stateToken: string): { type: string; clientId: string } | null {
  if (!stateToken || typeof stateToken !== 'string') return null;
  const parts = stateToken.split('.');
  if (parts.length !== 2) {
    // Si viene en formato simple antiguo (legacy fallback)
    try {
      const decoded = Buffer.from(stateToken, 'base64url').toString('utf8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  const [payloadB64, signature] = parts;
  const expectedHmac = crypto.createHmac('sha256', getEncryptionKey()).update(payloadB64).digest('base64url');
  if (expectedHmac !== signature) {
    console.warn('[CryptoService] Firma HMAC de OAuth state inválida');
    return null;
  }
  try {
    const decoded = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const data = JSON.parse(decoded);
    if (data.exp && Date.now() > data.exp) {
      console.warn('[CryptoService] OAuth state expirado');
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
