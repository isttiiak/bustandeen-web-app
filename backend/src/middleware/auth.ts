import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  verifyFirebaseToken,
  isFirebaseInitialized,
  decodeUnverifiedJwt,
} from '../config/firebaseAdmin.js';

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ ok: false, error: 'Missing Bearer token' });
      return;
    }

    if (isFirebaseInitialized()) {
      const decoded = await verifyFirebaseToken(token);
      req.user = { ...(decoded as Record<string, unknown>), uid: decoded.uid };
      return next();
    }

    // Dev bypass: only in non-production environments
    const isProd = process.env.NODE_ENV === 'production';
    if (!isProd && process.env.DEV_AUTH_BYPASS === '1') {
      const payload = decodeUnverifiedJwt(token);
      if (!payload?.['uid']) {
        res.status(401).json({ ok: false, error: 'Invalid token' });
        return;
      }
      req.user = { uid: payload['uid'] as string, ...payload };
      return next();
    }

    res.status(500).json({ ok: false, error: 'Auth not configured' });
  } catch {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
};

const REAUTH_MAX_AGE_SECONDS = 5 * 60;

/**
 * Admin allowlist check — a comma-separated ADMIN_EMAILS env var rather than
 * a DB role field, since this app's user model has no role/permission
 * concept yet and there's only ever a couple of admin accounts. Used by the
 * admin panel's own login (adminAuth.controller.ts) and, separately, to set
 * `isAdmin` on a normal Firebase user's profile response purely so the
 * frontend can show a convenience nav link — that flag grants no API access
 * on its own.
 */
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (typeof email !== 'string' || !email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

/**
 * Owner allowlist — a subset of ADMIN_EMAILS (see role note on
 * requireOwnerAdmin below). Same comma-separated-env-var shape as
 * isAdminEmail, deliberately not derived FROM ADMIN_EMAILS so an owner who
 * isn't (yet) a general admin, or vice versa, is representable.
 */
export const isOwnerAdmin = (email: string | null | undefined): boolean => {
  if (typeof email !== 'string' || !email) return false;
  const ownerEmails = (process.env.ADMIN_OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return ownerEmails.includes(email.toLowerCase());
};

export const verifyAdminPassword = (password: string): boolean => {
  const expected = process.env.ADMIN_PANEL_PASSWORD ?? '';
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  // Different lengths never match — comparing anyway would throw inside
  // timingSafeEqual, which requires equal-length buffers.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h — re-enter the password after that

/**
 * The admin panel's ENTIRE auth: a direct email+password login
 * (POST /api/admin/auth/login, adminAuth.controller.ts) completely separate
 * from the app's own Firebase user accounts — an admin never needs to sign
 * in as a normal user first. This mints the resulting session token.
 *
 * Deliberately throws when ADMIN_SESSION_SECRET is unset rather than signing
 * with a fallback empty-string key: a previous version did that, which let
 * login "succeed" with a token that verifyAdminSessionToken (below) would
 * then always reject as soon as the FIRST admin API call was made — a
 * confusing "briefly see the dashboard, then get kicked back to the login
 * screen" bug. Failing loudly here surfaces the real misconfiguration
 * immediately instead.
 */
export const signAdminSessionToken = (
  email: string
): { token: string; expiresIn: number; isOwner: boolean } => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured');
  const isOwner = isOwnerAdmin(email);
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ email, isOwner, exp })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, expiresIn: ADMIN_SESSION_TTL_SECONDS, isOwner };
};

interface AdminSessionPayload {
  email: string;
  isOwner: boolean;
  exp: number;
}

const verifyAdminSessionToken = (token: string): AdminSessionPayload | null => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as
      AdminSessionPayload | Record<string, unknown>;
    if (
      typeof data.email !== 'string' ||
      typeof data.exp !== 'number' ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return data as AdminSessionPayload;
  } catch {
    return null;
  }
};

/**
 * The ONLY gate on every /api/admin/* route — no Firebase requireAuth
 * involved. Re-uses req.user's shape (uid/email) purely so existing
 * controller code that reads req.user.email for reviewedBy/verifiedBy needs
 * no changes; `uid` here is the admin's email, not a Firebase uid.
 */
export const requireAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers['x-admin-token'];
  const token = Array.isArray(header) ? header[0] : header;
  const data = token ? verifyAdminSessionToken(token) : null;
  if (!data) {
    res.status(401).json({ ok: false, error: 'admin_session_required' });
    return;
  }
  req.user = { uid: data.email, email: data.email, isOwner: data.isOwner };
  next();
};

/**
 * Second role tier, for the owner (istiak@bustandeen.com) only — delete,
 * financial-record edits, and bulk/override operations. The day-to-day
 * review workflow (verify/reject a donation, approve/reject a zikr request)
 * stays open to every admin, since that's the actual job the non-owner admin
 * (ansar@bustandeen.com) does; this only covers actions explicitly requested
 * to be owner-restricted. Must run after requireAdminAuth.
 */
export const requireOwnerAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isOwner) {
    res.status(403).json({ ok: false, error: 'Owner-only action' });
    return;
  }
  next();
};

/**
 * Gate for irreversible operations (account deletion): rejects unless the
 * caller's Firebase ID token was minted from an authentication within the
 * last few minutes, via the token's `auth_time` claim. This is the
 * server-side half of the client's re-auth prompt (Settings.tsx) — it stops
 * a stolen/replayed bearer token from performing the action even if it's
 * still otherwise valid, since a long-lived session token's `auth_time`
 * reflects the ORIGINAL sign-in, not when it was last refreshed.
 *
 * `auth_time` is only present on tokens Firebase Admin actually verified —
 * dev-bypass tokens (no Firebase project configured) don't carry it, so this
 * is a no-op there, matching the rest of the dev-bypass auth path.
 */
export const requireRecentAuth = (req: Request, res: Response, next: NextFunction): void => {
  const authTime = req.user?.['auth_time'];
  if (typeof authTime === 'number') {
    const ageSeconds = Date.now() / 1000 - authTime;
    if (ageSeconds > REAUTH_MAX_AGE_SECONDS) {
      res.status(401).json({
        ok: false,
        error: 'reauth_required',
        message: 'Please re-authenticate to continue.',
      });
      return;
    }
  }
  next();
};
