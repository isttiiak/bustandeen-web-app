import {
  base32Decode,
  base32Encode,
  generateBackupCodes,
  generateTotpSecret,
  hashBackupCode,
  hotp,
  otpauthUri,
  totpStep,
  verifyTotp,
} from '../src/utils/totp.js';
import { checkMfaProof, issueMfaProof } from '../src/utils/adminMfaProof.js';

// RFC 6238 Appendix B, SHA-1 seed "12345678901234567890". The RFC lists 8-digit
// values; a 6-digit code is the same number's last 6 digits.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
const RFC_VECTORS = [
  [59, '287082'],
  [1111111109, '081804'],
  [1111111111, '050471'],
  [1234567890, '005924'],
  [2000000000, '279037'],
  [20000000000, '353130'],
];

describe('TOTP (RFC 6238)', () => {
  test.each(RFC_VECTORS)('at %i s the code is %s', (seconds, code) => {
    expect(hotp(base32Decode(RFC_SECRET), totpStep(seconds * 1000))).toBe(code);
    expect(verifyTotp(RFC_SECRET, code, { nowMs: seconds * 1000 })).toBe(totpStep(seconds * 1000));
  });

  test('base32 round-trips and ignores spaces, dashes, padding and case', () => {
    const buf = Buffer.from('any bytes ÿ\u0000', 'latin1');
    const text = base32Encode(buf);
    expect(base32Decode(text)).toEqual(buf);
    expect(base32Decode(text.toLowerCase().replace(/(.{4})/g, '$1 ') + '==')).toEqual(buf);
    expect(() => base32Decode('A1')).toThrow();
  });

  test('accepts one step of clock drift either way, not two', () => {
    const now = 1_700_000_000_000;
    const secret = generateTotpSecret();
    const key = base32Decode(secret);
    const step = totpStep(now);
    expect(verifyTotp(secret, hotp(key, step - 1), { nowMs: now })).toBe(step - 1);
    expect(verifyTotp(secret, hotp(key, step + 1), { nowMs: now })).toBe(step + 1);
    expect(verifyTotp(secret, hotp(key, step - 2), { nowMs: now })).toBeNull();
    expect(verifyTotp(secret, hotp(key, step + 2), { nowMs: now })).toBeNull();
  });

  test('a step at or before lastUsedStep is refused (single use)', () => {
    const now = 1_700_000_000_000;
    const secret = generateTotpSecret();
    const step = totpStep(now);
    const code = hotp(base32Decode(secret), step);
    expect(verifyTotp(secret, code, { nowMs: now, lastUsedStep: step })).toBeNull();
    expect(verifyTotp(secret, code, { nowMs: now, lastUsedStep: step - 1 })).toBe(step);
  });

  test('rejects anything that is not exactly 6 digits', () => {
    const secret = generateTotpSecret();
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 345']) {
      expect(verifyTotp(secret, bad)).toBeNull();
    }
  });

  test('a new secret is 160 bits', () => {
    expect(base32Decode(generateTotpSecret())).toHaveLength(20);
  });

  test('otpauth URI carries issuer, label and the default parameters', () => {
    const uri = otpauthUri('JBSWY3DPEHPK3PXP', 'servant@test.dev');
    expect(uri.startsWith('otpauth://totp/Bustandeen%20Admin%3Aservant%40test.dev?')).toBe(true);
    const params = new URL(uri).searchParams;
    expect(params.get('secret')).toBe('JBSWY3DPEHPK3PXP');
    expect(params.get('issuer')).toBe('Bustandeen Admin');
    expect(params.get('digits')).toBe('6');
    expect(params.get('period')).toBe('30');
  });

  test('backup codes: 8 distinct XXXXX-XXXXX codes, hash ignores case and dashes', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) expect(c).toMatch(/^[A-Z2-7]{5}-[A-Z2-7]{5}$/);
    expect(hashBackupCode(codes[0].toLowerCase().replace('-', ' '))).toBe(hashBackupCode(codes[0]));
  });
});

describe('admin MFA proof', () => {
  const now = Date.parse('2026-10-11T10:00:00Z');
  const expected = { uid: 'u1', mfaVersion: 2, maxAgeSeconds: 12 * 3600 };

  test('valid for its uid and version within 12 hours', () => {
    const proof = issueMfaProof('u1', 2, now);
    expect(checkMfaProof(proof, expected, now + 11 * 3600_000)).toBe(true);
    expect(checkMfaProof(proof, expected, now + 13 * 3600_000)).toBe(false);
  });

  test('another uid, an older version, tampering or junk never pass', () => {
    const proof = issueMfaProof('u1', 2, now);
    expect(checkMfaProof(proof, { ...expected, uid: 'u2' }, now)).toBe(false);
    expect(checkMfaProof(issueMfaProof('u1', 1, now), expected, now)).toBe(false);
    const [body, mac] = proof.split('.');
    const forged = Buffer.from(JSON.stringify({ u: 'u1', v: 2, iat: now / 1000 + 3600 })).toString(
      'base64url'
    );
    expect(checkMfaProof(`${forged}.${mac}`, expected, now)).toBe(false);
    expect(checkMfaProof(`${body}.`, expected, now)).toBe(false);
    expect(checkMfaProof('x', expected, now)).toBe(false);
    expect(checkMfaProof(undefined, expected, now)).toBe(false);
  });

  test('ending sessions (sessionsValidAfter) ends earlier proofs', () => {
    const proof = issueMfaProof('u1', 2, now);
    const notBefore = new Date(now + 60_000);
    expect(checkMfaProof(proof, { ...expected, notBefore }, now + 120_000)).toBe(false);
    const fresh = issueMfaProof('u1', 2, now + 90_000);
    expect(checkMfaProof(fresh, { ...expected, notBefore }, now + 120_000)).toBe(true);
  });
});
