import crypto from 'crypto';

/**
 * The admin panel's "second factor passed" proof, sent by the browser as
 * X-Admin-MFA next to the Firebase token (X-Admin-Token). Issued once a valid
 * TOTP or backup code is entered; stateless (nothing stored per device), so an
 * admin can be signed in on two devices, each with its own proof.
 *
 * Payload: admin uid, the account's mfaVersion (a TOTP reset or a new
 * enrolment bumps it, which voids every proof issued before) and the issue
 * time. It is checked against the Firebase identity on every request, so a
 * proof is worthless without that admin's own Firebase sign-in, and it lives
 * at most ADMIN_SESSION_MAX_SECONDS, like the sign-in itself.
 *
 * Signed with HMAC-SHA256 under a key derived (HKDF) from FIELD_ENCRYPTION_KEY,
 * so no new secret has to be configured; the derivation label keeps it
 * separate from the encryption use of that key.
 */

let cachedKey: Buffer | null = null;

function proofKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error('FIELD_ENCRYPTION_KEY is not set (needed to sign admin MFA proofs).');
  cachedKey = Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(raw, 'base64'), Buffer.alloc(0), 'admin-mfa-proof', 32)
  );
  return cachedKey;
}

interface ProofPayload {
  u: string;
  v: number;
  iat: number;
}

const sign = (body: string) => crypto.createHmac('sha256', proofKey()).update(body).digest();

export function issueMfaProof(uid: string, mfaVersion: number, nowMs: number = Date.now()): string {
  const payload: ProofPayload = { u: uid, v: mfaVersion, iat: Math.floor(nowMs / 1000) };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body).toString('base64url')}`;
}

/**
 * True when `proof` was issued by this server for this uid and mfaVersion,
 * within `maxAgeSeconds`, and not before `notBefore` (the account's
 * sessionsValidAfter: ending an admin's sessions also ends their proofs).
 */
export function checkMfaProof(
  proof: string | undefined,
  expected: { uid: string; mfaVersion: number; maxAgeSeconds: number; notBefore?: Date | null },
  nowMs: number = Date.now()
): boolean {
  if (!proof) return false;
  const [body, mac] = proof.split('.');
  if (!body || !mac) return false;
  const want = sign(body);
  const got = Buffer.from(mac, 'base64url');
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return false;
  let payload: ProofPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ProofPayload;
  } catch {
    return false;
  }
  if (payload.u !== expected.uid || payload.v !== expected.mfaVersion) return false;
  if (typeof payload.iat !== 'number') return false;
  const ageSeconds = nowMs / 1000 - payload.iat;
  if (ageSeconds > expected.maxAgeSeconds || ageSeconds < -60) return false;
  if (expected.notBefore && payload.iat * 1000 < expected.notBefore.getTime() - 1000) return false;
  return true;
}
