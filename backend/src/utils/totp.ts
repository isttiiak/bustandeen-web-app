import crypto from 'crypto';

/**
 * Time-based one-time passwords (RFC 6238 over RFC 4226 HOTP) for the admin
 * second factor, on Node's own crypto: HMAC-SHA1, 30-second steps, 6 digits,
 * the parameters every authenticator app (Google Authenticator, Aegis,
 * 1Password, Microsoft Authenticator) uses by default.
 */

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Steps accepted either side of now, for a phone clock that is a little off. */
const DRIFT_STEPS = 1;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx === -1) throw new Error('invalid base32');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new 160-bit secret (RFC 4226's recommended length), base32. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = crypto.createHmac('sha1', secret).update(msg).digest();
  // Dynamic truncation (RFC 4226 5.3): 31 bits from the offset in the last nibble.
  const offset = mac.readUInt8(mac.length - 1) & 0x0f;
  const code = mac.readUInt32BE(offset) & 0x7fffffff;
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

export function totpStep(nowMs: number = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_STEP_SECONDS);
}

/**
 * Checks a 6-digit code against the secret. Returns the matched step (so the
 * caller can refuse it a second time: a code is single-use) or null. Steps at
 * or before `lastUsedStep` never match.
 */
export function verifyTotp(
  secretBase32: string,
  code: string,
  opts: { nowMs?: number; lastUsedStep?: number | null } = {}
): number | null {
  if (!new RegExp(`^\\d{${TOTP_DIGITS}}$`).test(code)) return null;
  const secret = base32Decode(secretBase32);
  const now = totpStep(opts.nowMs);
  const want = Buffer.from(code);
  for (let step = now - DRIFT_STEPS; step <= now + DRIFT_STEPS; step++) {
    if (opts.lastUsedStep != null && step <= opts.lastUsedStep) continue;
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, step)), want)) return step;
  }
  return null;
}

/** The otpauth:// URI authenticator apps read from a QR code. */
export function otpauthUri(secretBase32: string, accountEmail: string): string {
  const issuer = 'Bustandeen Admin';
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── Backup codes ────────────────────────────────────────────────────────────
// Ten random base32 characters (50 bits) each: far too many to guess under
// the verify rate limit, so a plain SHA-256 of the normalised code is enough
// to store (unlike a password, there is no small space to brute-force).

export const BACKUP_CODE_COUNT = 8;

export function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () => {
    const raw = base32Encode(crypto.randomBytes(7)).slice(0, 10);
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export function normaliseBackupCode(code: string): string {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(normaliseBackupCode(code)).digest('hex');
}
