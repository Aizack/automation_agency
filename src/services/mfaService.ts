import crypto from 'crypto';
import { pool } from '../database/postgres';

// In-memory cache for active OTPs (code -> { code, expiresAt, userId, clientId, method })
const otpStore = new Map<string, { code: string; expiresAt: number; userId: string; clientId: string; method: string }>();

// Clean up expired OTPs every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

export function storeOtp(userId: string, clientId: string, method: string, code: string): void {
  const key = `${clientId}:${userId}:${method}`;
  otpStore.set(key, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    userId,
    clientId,
    method
  });
}

export function verifyOtp(userId: string, clientId: string, method: string, inputCode: string): boolean {
  const key = `${clientId}:${userId}:${method}`;
  const record = otpStore.get(key);
  if (!record) return false;
  if (record.expiresAt < Date.now()) {
    otpStore.delete(key);
    return false;
  }
  if (record.code === inputCode.trim()) {
    otpStore.delete(key);
    return true;
  }
  return false;
}

// Base32 helper for TOTP secrets
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 20): string {
  let secret = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

// RFC 6238 TOTP Verification
export function verifyTotp(secret: string, token: string, window = 1): boolean {
  if (!secret || !token || token.trim().length !== 6) return false;
  const key = base32Decode(secret);
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(currentTime / timeStep);

  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const counter = currentCounter + errorWindow;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(counter), 0);

    const hmac = crypto.createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code =
      ((hmac[offset] & 0x7f) << 24 |
        (hmac[offset + 1] & 0xff) << 16 |
        (hmac[offset + 2] & 0xff) << 8 |
        (hmac[offset + 3] & 0xff)) %
      1000000;

    const formattedCode = code.toString().padStart(6, '0');
    if (formattedCode === token.trim()) {
      return true;
    }
  }
  return false;
}

// Generate OTPauth QR URL for Google Authenticator / Authy
export function getTotpUri(label: string, issuer: string, secret: string): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

// Trusted Devices (30-day Remember Device)
export async function createTrustedDevice(clientId: string, userId: string, userAgent?: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await pool.query(
    `INSERT INTO trusted_devices (client_id, user_id, device_token, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [clientId, userId, token, userAgent || null, expiresAt]
  );
  return token;
}

export async function isTrustedDevice(clientId: string, userId: string, token: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;
  const res = await pool.query(
    `SELECT id FROM trusted_devices 
     WHERE client_id = $1 AND user_id = $2 AND device_token = $3 AND expires_at > NOW()`,
    [clientId, userId, token]
  );
  return res.rows.length > 0;
}
