import { Request, Response, NextFunction } from 'express';
import {
  verifyFirebaseToken,
  isFirebaseInitialized,
  decodeUnverifiedJwt,
} from '../config/firebaseAdmin.js';
import AdminAccount from '../models/AdminAccount.js';

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
 * Comma-separated ADMIN_EMAILS allowlist — used ONLY to set `isAdmin` on a
 * normal Firebase user's own profile response, purely so the main app's
 * Navbar can show a convenience "Admin" link. Grants no API access on its
 * own and has nothing to do with the admin panel's real gate: that's
 * requireAdminAuth/AdminAccount below, a completely separate identity and
 * role system from a user's regular app account.
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
 * The ONLY gate on every /api/admin/* route. Verifies a real Firebase ID
 * token (sent via X-Admin-Token — a separate header from the app's own
 * Authorization header, since a signed-in regular user browsing into /admin
 * must not have their normal-account token silently treated as an admin
 * credential, and vice versa) and then requires a matching, active row in
 * AdminAccount. Firebase alone only proves WHO signed in; AdminAccount is
 * the sole source of truth for WHETHER that identity is an admin and WHICH
 * role it holds — deactivating a row here revokes access immediately, even
 * though the person's Firebase ID token itself stays valid until it expires.
 *
 * Same dev-bypass shape as requireAuth above (only reachable when Firebase
 * Admin isn't configured AND DEV_AUTH_BYPASS=1 outside production) so tests
 * can exercise the admin panel without a real Firebase project — the
 * AdminAccount lookup still has to succeed either way, so a bypass token
 * alone is never sufficient.
 *
 * Sets both req.admin (the real shape) and req.user (uid/email only, so
 * existing controller code that reads req.user.email for reviewedBy/
 * verifiedBy needs no changes).
 */
export const requireAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const header = req.headers['x-admin-token'];
    const token = Array.isArray(header) ? header[0] : header;
    if (!token) {
      res.status(401).json({ ok: false, error: 'admin_session_required' });
      return;
    }

    let uid: string;
    let verifiedEmail: string | undefined;
    if (isFirebaseInitialized()) {
      const decoded = await verifyFirebaseToken(token);
      uid = decoded.uid;
      if (decoded.email && decoded.email_verified) verifiedEmail = decoded.email.toLowerCase();
    } else if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === '1') {
      const payload = decodeUnverifiedJwt(token);
      if (typeof payload?.['uid'] !== 'string') {
        res.status(401).json({ ok: false, error: 'admin_session_required' });
        return;
      }
      uid = payload['uid'];
    } else {
      res.status(500).json({ ok: false, error: 'Auth not configured' });
      return;
    }

    let account = await AdminAccount.findOne({ firebaseUid: uid, active: true });

    // Self-heal a stale link: someone deleted and recreated an admin's
    // Firebase account (same email, new uid under the hood — Firebase never
    // reuses uids). The OLD uid then matches nothing here even though the
    // email is still a legitimate, verified admin identity. Re-point the
    // existing (still-active) row at the new uid instead of locking the
    // Servant/Ansar out until someone manually fixes the database — this is
    // safe because `verifiedEmail` only comes from a Firebase-verified,
    // email_verified token, never from the unverified dev-bypass path.
    if (!account && verifiedEmail) {
      const staleMatch = await AdminAccount.findOne({ email: verifiedEmail, active: true });
      if (staleMatch) {
        staleMatch.firebaseUid = uid;
        await staleMatch.save();
        account = staleMatch;
      }
    }

    if (!account) {
      res.status(401).json({ ok: false, error: 'admin_session_required' });
      return;
    }
    req.admin = { uid, email: account.email, role: account.role };
    req.user = { uid, email: account.email, isOwner: account.role === 'servant' };
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'admin_session_required' });
  }
};

/**
 * Servant-only tier — delete, financial-record edits, bulk/override
 * operations, user-list access, and managing AdminAccount itself (adding or
 * deactivating an Ansar). The day-to-day review workflow (verify/reject a
 * donation, approve/reject a zikr request) stays open to every admin, since
 * that's the actual job an Ansar does; this only covers actions explicitly
 * scoped to the Servant. Must run after requireAdminAuth.
 */
export const requireServant = (req: Request, res: Response, next: NextFunction): void => {
  if (req.admin?.role !== 'servant') {
    res.status(403).json({ ok: false, error: 'servant_only' });
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
