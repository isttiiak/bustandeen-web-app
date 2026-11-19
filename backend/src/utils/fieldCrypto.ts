import crypto from 'crypto';

/**
 * Application-level field encryption for data that must stay unreadable even
 * to someone with raw DB/Atlas access (Rayhanah wellness notes, a user's own
 * Groq API key, admin TOTP secrets). AES-256-GCM, one random IV per value.
 *
 * Stored format (audit P2-3):
 *   v2.<keyId>.<base64( iv(12) + authTag(16) + ciphertext )>
 * - keyId names which key sealed the value (first 8 hex of a SHA-256 of the
 *   key; it reveals nothing usable), so a key can be rotated: put the new key
 *   in FIELD_ENCRYPTION_KEY and the retired one(s) in
 *   FIELD_ENCRYPTION_KEY_PREVIOUS (comma separated) until every value has been
 *   re-saved under the new key.
 * - Every value is bound (GCM additional authenticated data) to its owner and
 *   field through `fieldContext(...)`, so a ciphertext copied onto another row
 *   or field does not open.
 * Values written before v2 (iv + tag + ciphertext, no prefix, no binding) are
 * still read, with any configured key; they are rewritten as v2 on the next save.
 *
 * NOT for fields that need to be queried, sorted, or indexed — those stay
 * plaintext (see CycleLog dates/type, which the app's own logic already
 * treats as non-social, server-only data).
 */

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const AUTH_TAG_LEN = 16;
const V2_PREFIX = 'v2.';

/** A value that exists but cannot be opened (wrong or retired key, wrong owner or field, damaged). Never carries the value. */
export class FieldDecryptError extends Error {
  constructor(reason: string) {
    super(`Encrypted field could not be read (${reason})`);
    this.name = 'FieldDecryptError';
  }
}

const parseKey = (raw: string, name: string): Buffer => {
  const key = Buffer.from(raw.trim(), 'base64');
  if (key.length !== 32) {
    throw new Error(`${name} must be a base64-encoded 32-byte (256-bit) key.`);
  }
  return key;
};

/** Short, public name of a key (base64 or Buffer), stored beside every value. */
export function keyIdOf(key: string | Buffer): string {
  const buf = typeof key === 'string' ? Buffer.from(key.trim(), 'base64') : key;
  return crypto
    .createHash('sha256')
    .update('bustandeen:field-key-id:v1')
    .update(buf)
    .digest('hex')
    .slice(0, 8);
}

interface KeyRing {
  current: { id: string; key: Buffer };
  all: { id: string; key: Buffer }[];
}

let cachedRing: { signature: string; ring: KeyRing } | null = null;

function getRing(): KeyRing {
  const rawCurrent = process.env.FIELD_ENCRYPTION_KEY;
  if (!rawCurrent) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY is not set — required to read/write encrypted fields (see backend/.env.example).'
    );
  }
  const rawPrevious = process.env.FIELD_ENCRYPTION_KEY_PREVIOUS ?? '';
  const signature = `${rawCurrent}|${rawPrevious}`;
  if (cachedRing?.signature === signature) return cachedRing.ring;

  const current = parseKey(rawCurrent, 'FIELD_ENCRYPTION_KEY');
  const previous = rawPrevious
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseKey(s, 'FIELD_ENCRYPTION_KEY_PREVIOUS'));
  const all = [current, ...previous].map((key) => ({ id: keyIdOf(key), key }));
  const ring: KeyRing = { current: all[0], all };
  cachedRing = { signature, ring };
  return ring;
}

/**
 * What a value is bound to: its field and the row it belongs to, e.g.
 * fieldContext('cycleDay', userId, '2026-03-01'). The same call must be made
 * when reading and writing.
 */
export function fieldContext(field: string, ...owner: string[]): string {
  return ['bustandeen:field:v2', field, ...owner].join('|');
}

/** The one definition of what each encrypted field is bound to (read and write must agree). */
export const fieldContexts = {
  cycleDay: (userId: string, date: string): string => fieldContext('cycleDay', userId, date),
  bodyStats: (userId: string): string => fieldContext('bodyStats', userId),
  groqKey: (userId: string): string => fieldContext('groqKey', userId),
  adminTotp: (accountId: string): string => fieldContext('adminTotp', accountId),
  adminTotpPending: (accountId: string): string => fieldContext('adminTotpPending', accountId),
};

/** Encrypt any JSON-serializable value into a single opaque string, under the current key. */
export function encryptJson(value: unknown, context: string): string {
  const { current } = getRing();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, current.key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${V2_PREFIX}${current.id}.${Buffer.concat([iv, authTag, ciphertext]).toString('base64')}`;
}

function open(body: Buffer, key: Buffer, aad: Buffer | null): Buffer {
  const iv = body.subarray(0, IV_LEN);
  const authTag = body.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN);
  const ciphertext = body.subarray(IV_LEN + AUTH_TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  if (aad) decipher.setAAD(aad);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Decrypt a value produced by encryptJson (or by the pre-v2 writer).
 * Returns null ONLY for empty input ("no data yet"). A value that exists but
 * cannot be opened throws FieldDecryptError: callers must not treat that as
 * an empty value, because the next save would write over what is there.
 * Display-only callers may use decryptJsonForDisplay.
 */
export function decryptJson<T>(payload: string | null | undefined, context: string): T | null {
  if (!payload) return null;
  const { all } = getRing();
  const aad = Buffer.from(context, 'utf8');
  let plaintext: Buffer | null;

  if (payload.startsWith(V2_PREFIX)) {
    const [, keyId, b64] = payload.split('.');
    if (!keyId || !b64) throw new FieldDecryptError('malformed');
    const candidates = all.filter((k) => k.id === keyId);
    if (candidates.length === 0) throw new FieldDecryptError('key not available');
    plaintext = tryOpen(Buffer.from(b64, 'base64'), candidates, aad);
  } else {
    // Written before v2: no key id, no binding. Try every configured key.
    plaintext = tryOpen(Buffer.from(payload, 'base64'), all, null);
  }
  if (!plaintext) throw new FieldDecryptError('wrong key or owner, or damaged');
  try {
    return JSON.parse(plaintext.toString('utf8')) as T;
  } catch {
    throw new FieldDecryptError('not valid JSON');
  }
}

function tryOpen(
  body: Buffer,
  candidates: { id: string; key: Buffer }[],
  aad: Buffer | null
): Buffer | null {
  if (body.length < IV_LEN + AUTH_TAG_LEN) return null;
  for (const { key } of candidates) {
    try {
      return open(body, key, aad);
    } catch {
      // try the next key
    }
  }
  return null;
}

/**
 * For screens that only show a value: logs (never the value) and returns null
 * when it cannot be opened. Never use it on a path that then saves.
 */
export function decryptJsonForDisplay<T>(
  payload: string | null | undefined,
  context: string
): T | null {
  try {
    return decryptJson<T>(payload, context);
  } catch (e) {
    console.warn('[fieldCrypto] decrypt failed', (e as Error).message);
    return null;
  }
}
