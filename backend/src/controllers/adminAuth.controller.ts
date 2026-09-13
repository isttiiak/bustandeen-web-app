import { Request, Response } from 'express';
import { verifyAdminPassword, signAdminSessionToken } from '../middleware/auth.js';

export const verifyPasswordHandler = (req: Request, res: Response): void => {
  const { password } = req.body as { password: string };
  if (!verifyAdminPassword(password)) {
    res.status(401).json({ ok: false, error: 'Incorrect admin password' });
    return;
  }
  const { token, expiresIn } = signAdminSessionToken(req.user.uid);
  res.json({ ok: true, token, expiresIn });
};
