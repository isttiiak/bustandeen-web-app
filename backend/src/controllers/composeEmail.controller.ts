import { Request, Response, NextFunction } from 'express';
import * as composeEmailService from '../services/composeEmail.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

export const sendHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { to, subject, body } = req.body as { to: string; subject: string; body: string };
    await composeEmailService.sendComposedEmail({ to, subject, body });
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'email.compose.send',
      targetType: 'Email',
      targetId: to,
      metadata: { subject },
    });
    res.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 502) {
      res.status(status).json({ ok: false, error: (err as Error).message });
      return;
    }
    next(err);
  }
};
