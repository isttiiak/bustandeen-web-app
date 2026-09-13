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
 * concept yet and there's only ever a couple of admin accounts. Exported
 * standalone (not just as the requireAdminEmail middleware below) so
 * controllers can also expose `isAdmin` on user-profile responses for the
 * frontend to gate its own UI, without duplicating the parsing logic.
 */
export const isAdminEmail = (email: string | null | undefined): boolean => {
  if (typeof email !== 'string' || !email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
};

/** Must run after requireAuth (needs req.user populated). */
export const requireAdminEmail = (req: Request, res: Response, next: NextFunction): void => {
  if (!isAdminEmail(req.user?.email)) {
    res.status(403).json({ ok: false, error: 'Forbidden' });
    return;
  }
  next();
};

const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h — re-enter the password after that

/**
 * Second factor for the admin panel: a Firebase-authenticated admin-allowlist
 * user (requireAdminEmail) still can't act on any /api/admin/* route until
 * they've separately entered ADMIN_PANEL_PASSWORD via POST
 * /api/admin/auth/verify-password. That endpoint mints this token; every
 * other admin route requires it via requireAdminSession below. Stateless
 * (HMAC-signed uid+expiry, no server-side session store) so it works the same
 * way across Vercel's serverless invocations.
 */
export const signAdminSessionToken = (uid: string): { token: string; expiresIn: number } => {
  const secret = process.env.ADMIN_SESSION_SECRET ?? '';
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ uid, exp })).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, expiresIn: ADMIN_SESSION_TTL_SECONDS };
};

const verifyAdminSessionToken = (token: string, uid: string): boolean => {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      uid: string;
      exp: number;
    };
    return data.uid === uid && data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
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

/** Must run after requireAuth + requireAdminEmail on every /api/admin/* route. */
export const requireAdminSession = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers['x-admin-token'];
  const token = Array.isArray(header) ? header[0] : header;
  if (!token || !verifyAdminSessionToken(token, req.user?.uid ?? '')) {
    res.status(401).json({ ok: false, error: 'admin_session_required' });
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
