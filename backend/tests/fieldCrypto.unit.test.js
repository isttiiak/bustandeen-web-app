import crypto from 'crypto';
import {
  encryptJson,
  decryptJson,
  fieldContext,
  FieldDecryptError,
  keyIdOf,
} from '../src/utils/fieldCrypto.js';

// Audit 2026-11-16 P2-3: field encryption now carries a key id (so a key can be
// rotated), binds each value to its owner and field (so a ciphertext copied to
// another row does not open), and a failed decrypt throws instead of returning
// null (null looked like "no data yet", and the next save wrote over the
// notes that could not be read).

const b64key = () => crypto.randomBytes(32).toString('base64');

/** The pre-P2-3 writer, kept here so old values stay readable: iv + tag + ciphertext, no id, no AAD. */
const legacyEncrypt = (value, keyB64) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyB64, 'base64'), iv);
  const ct = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(value), 'utf8')),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
};

const ORIGINAL = process.env.FIELD_ENCRYPTION_KEY;
const ORIGINAL_PREV = process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
afterEach(() => {
  process.env.FIELD_ENCRYPTION_KEY = ORIGINAL;
  if (ORIGINAL_PREV === undefined) delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
  else process.env.FIELD_ENCRYPTION_KEY_PREVIOUS = ORIGINAL_PREV;
});

const ctx = fieldContext('cycleDay', 'u1', '2026-03-01');

describe('fieldCrypto', () => {
  test('round trip, and the stored string names the key but never contains it', () => {
    const enc = encryptJson({ flow: 'light' }, ctx);
    expect(enc.startsWith('v2.')).toBe(true);
    expect(enc.split('.')[1]).toBe(keyIdOf(process.env.FIELD_ENCRYPTION_KEY));
    expect(enc).not.toContain(process.env.FIELD_ENCRYPTION_KEY);
    expect(decryptJson(enc, ctx)).toEqual({ flow: 'light' });
  });

  test('a value does not open under another owner, another day or another field', () => {
    const enc = encryptJson({ flow: 'light' }, ctx);
    expect(() => decryptJson(enc, fieldContext('cycleDay', 'u2', '2026-03-01'))).toThrow(
      FieldDecryptError
    );
    expect(() => decryptJson(enc, fieldContext('cycleDay', 'u1', '2026-03-02'))).toThrow(
      FieldDecryptError
    );
    expect(() => decryptJson(enc, fieldContext('bodyStats', 'u1'))).toThrow(FieldDecryptError);
  });

  test('values written before this change still open, with any context', () => {
    const old = legacyEncrypt({ flow: 'heavy' }, process.env.FIELD_ENCRYPTION_KEY);
    expect(decryptJson(old, ctx)).toEqual({ flow: 'heavy' });
  });

  test('empty input is "no data"; anything else that fails is an error, never null', () => {
    expect(decryptJson(null, ctx)).toBeNull();
    expect(decryptJson(undefined, ctx)).toBeNull();
    expect(decryptJson('', ctx)).toBeNull();
    expect(() => decryptJson('not-an-encrypted-value', ctx)).toThrow(FieldDecryptError);
    const enc = encryptJson({ a: 1 }, ctx);
    const tampered = enc.slice(0, -4) + (enc.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    expect(() => decryptJson(tampered, ctx)).toThrow(FieldDecryptError);
  });

  test('the wrong key throws and says so without printing the value', () => {
    const enc = encryptJson({ secret: 'x' }, ctx);
    process.env.FIELD_ENCRYPTION_KEY = b64key();
    delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
    let error;
    try {
      decryptJson(enc, ctx);
    } catch (e) {
      error = e;
    }
    expect(error).toBeInstanceOf(FieldDecryptError);
    expect(error.message).not.toContain('secret');
    expect(error.message).not.toContain(enc);
  });

  test('rotation: a retired key still opens old values, new values use the new key', () => {
    const oldKey = process.env.FIELD_ENCRYPTION_KEY;
    const newV2 = encryptJson({ n: 1 }, ctx);
    const legacy = legacyEncrypt({ n: 2 }, oldKey);

    const newKey = b64key();
    process.env.FIELD_ENCRYPTION_KEY = newKey;
    process.env.FIELD_ENCRYPTION_KEY_PREVIOUS = oldKey;

    expect(decryptJson(newV2, ctx)).toEqual({ n: 1 });
    expect(decryptJson(legacy, ctx)).toEqual({ n: 2 });
    const fresh = encryptJson({ n: 3 }, ctx);
    expect(fresh.split('.')[1]).toBe(keyIdOf(newKey));

    // Once the retired key is dropped, only values re-saved under the new key remain readable.
    delete process.env.FIELD_ENCRYPTION_KEY_PREVIOUS;
    expect(decryptJson(fresh, ctx)).toEqual({ n: 3 });
    expect(() => decryptJson(newV2, ctx)).toThrow(FieldDecryptError);
  });
});
