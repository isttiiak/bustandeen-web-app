import { Request, Response } from 'express';
import { isAdminEmail, verifyAdminPassword, signAdminSessionToken } from '../middleware/auth.js';

/**
 * The admin panel's entire login — no Firebase account involved at all. An
 * admin is just an email on ADMIN_EMAILS plus the shared ADMIN_PANEL_PASSWORD;
 * this is deliberately public (rate-limited via adminLoginLimiter) since
 * there's nothing else gating it beforehand.
 */
export const loginHandler = (req: Request, res: Response): void => {
  const { email, password } = req.body as { email: string; password: string };
  if (!isAdminEmail(email) || !verifyAdminPassword(password)) {
    res.status(401).json({ ok: false, error: 'Invalid email or password' });
    return;
  }
  const { token, expiresIn, isOwner } = signAdminSessionToken(email.toLowerCase());
  res.json({ ok: true, token, expiresIn, email: email.toLowerCase(), isOwner });
};
