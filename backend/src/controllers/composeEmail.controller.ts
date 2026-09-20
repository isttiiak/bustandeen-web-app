import { Request, Response, NextFunction } from 'express';
import * as composeEmailService from '../services/composeEmail.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

export const sendHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { feedbackId, to, subject, body } = req.body as {
      feedbackId?: string;
      to?: string;
      subject?: string;
      body: string;
    };
    const result = await composeEmailService.sendComposedEmail(
      { feedbackId, to, subject, body },
      req.admin!.email
    );
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: feedbackId ? 'email.compose.reply' : 'email.compose.send',
      targetType: feedbackId ? 'FeedbackMessage' : 'Email',
      targetId: feedbackId ?? result.to,
      metadata: { subject: result.subject },
    });
    res.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 502 || status === 404) {
      res.status(status).json({ ok: false, error: (err as Error).message });
      return;
    }
    next(err);
  }
};
