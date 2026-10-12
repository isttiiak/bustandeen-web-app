import { NextFunction, Request, Response } from 'express';
import {
  verifyFirebaseToken,
  isFirebaseInitialized,
  decodeUnverifiedJwt,
} from '../config/firebaseAdmin.js';
import User from '../models/User.js';
import { isAdminEmail, isUnverifiedPasswordAccount } from '../middleware/auth.js';
import { toClientUser } from '../services/user.service.js';
import {
  AuthEmailError,
  sendPasswordReset,
  sendVerification,
} from '../services/authEmail.service.js';
import { markActive } from '../services/dailyActivity.service.js';
import {
  SignupError,
  checkSignup,
  completeSignup,
  startSignup,
  type StartSignupInput,
} from '../services/signup.service.js';

export const verifyHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const header = req.headers.authorization ?? '';
    const tokenFromHeader = header.startsWith('Bearer ') ? header.slice(7) : null;
    const idToken = (req.body as { idToken?: string })?.idToken ?? tokenFromHeader;

    if (!idToken) {
      res.status(400).json({ ok: false, error: 'idToken required' });
      return;
    }

    let decoded: Record<string, unknown>;

    if (isFirebaseInitialized()) {
      decoded = (await verifyFirebaseToken(idToken)) as unknown as Record<string, unknown>;
      // No database user for an unconfirmed email/password account (the
      // client skips this call until the email is confirmed).
      if (isUnverifiedPasswordAccount(decoded)) {
        res.status(403).json({ ok: false, error: 'email_not_verified' });
        return;
      }
    } else if (process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === '1') {
      const payload = decodeUnverifiedJwt(idToken);
      if (!payload?.['uid']) {
        res.status(401).json({ ok: false, error: 'Invalid token' });
        return;
      }
      decoded = payload;
    } else {
      res.status(500).json({ ok: false, error: 'Auth not configured' });
      return;
    }

    const uid = decoded['uid'] as string;
    const email = decoded['email'] as string;
    const displayName = decoded['name'] as string | undefined;
    const picture = decoded['picture'] as string | undefined;
    const gender = (req.body as { gender?: string })?.gender;
    const validGenders = ['male', 'female', 'other', 'prefer_not_say'];
    const genderOnInsert = gender && validGenders.includes(gender) ? gender : undefined;

    // Always update email (can change in Firebase).
    // Only set displayName and photoUrl on first creation — never overwrite values
    // the user has manually edited in their Profile page.
    const user = await User.findOneAndUpdate(
      { uid },
      {
        $set: { uid, email, lastActiveAt: new Date() },
        $setOnInsert: {
          displayName: displayName ?? '',
          ...(picture ? { photoUrl: picture } : {}),
          ...(genderOnInsert ? { gender: genderOnInsert } : {}),
          // Only brand-new accounts get the full-screen first run (T3.3).
          onboardingRequired: true,
        },
      },
      {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true,
        // Frontend only reads displayName/photoUrl here — don't ship the
        // zikr lifetime map and the rest of the doc on every session start.
        projection:
          'uid email displayName photoUrl avatarId gender hijriOffset hijriOffsetSet dayStartMode onboardingRequired onboardedAt disabled',
      }
    );

    // Typed nullable since mongoose 9.10; an upsert always yields a document.
    if (!user) throw new Error('User upsert returned no document');

    // Checked here (not just requireAuth) so a disabled account gets a clear
    // rejection at the sign-in step itself, rather than loading the app
    // shell and only failing on whatever API call happens to run first.
    if (user.disabled) {
      res.status(403).json({ ok: false, error: 'account_disabled' });
      return;
    }

    // Daily "opened the app" count for the admin retention view (T4.6).
    await markActive(uid);

    res.json({ ok: true, user: toClientUser(user), isAdmin: isAdminEmail(email) });
  } catch (err) {
    const error = err as {
      code?: string;
      message?: string;
      errorInfo?: { code: string; message: string };
    };
    const code = error?.code ?? error?.errorInfo?.code ?? null;
    const message = error?.message ?? error?.errorInfo?.message ?? 'Unauthorized';
    if (process.env.NODE_ENV !== 'test') {
      console.error('/api/auth/verify error:', code, message);
    }
    res.status(401).json({ ok: false, error: 'Invalid token', code, message });
  }
};

/** POST /api/auth/password-reset — always the same answer, so it never tells
 *  anyone whether an email has an account. */
export const passwordResetHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, lang } = req.body as { email: string; lang: 'en' | 'bn' };
    await sendPasswordReset(email, lang);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/send-verification — the signed-in user's own email only. */
export const sendVerificationHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lang } = req.body as { lang: 'en' | 'bn' };
    await sendVerification(req.user?.email, lang);
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthEmailError) {
      res.status(err.status).json({ ok: false, error: err.message });
      return;
    }
    next(err);
  }
};

const sendSignupError = (err: unknown, res: Response, next: NextFunction): void => {
  if (err instanceof SignupError) {
    res.status(err.status).json({ ok: false, error: err.message });
    return;
  }
  next(err);
};

/** POST /api/auth/signup/start — same answer for new and registered emails. */
export const signupStartHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await startSignup(req.body as StartSignupInput);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/signup/check — the password page asks whose link this is. */
export const signupCheckHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({ ok: true, ...(await checkSignup((req.body as { token: string }).token)) });
  } catch (err) {
    sendSignupError(err, res, next);
  }
};

/** POST /api/auth/signup/complete — creates the verified account. */
export const signupCompleteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    res.json({ ok: true, ...(await completeSignup(token, password)) });
  } catch (err) {
    sendSignupError(err, res, next);
  }
};
