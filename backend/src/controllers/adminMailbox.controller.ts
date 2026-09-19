import { Request, Response, NextFunction } from 'express';
import * as mailboxService from '../services/mailbox.service.js';
import { getSyncStatus, syncMailbox } from '../services/mailboxSync.service.js';
import { MailboxStatus } from '../models/MailboxMessage.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const paramString = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

const handleServiceError = (err: unknown, res: Response, next: NextFunction): void => {
  const status = (err as { status?: number }).status;
  if (status === 404 || status === 502) {
    res.status(status).json({ ok: false, error: (err as Error).message });
    return;
  }
  next(err);
};

const audit = (req: Request, action: string, id: string) =>
  logAdminAction({
    actorEmail: req.admin!.email,
    actorRole: req.admin!.role,
    action,
    targetType: 'MailboxMessage',
    targetId: id,
  });

export const listHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as MailboxStatus | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const [result, sync] = await Promise.all([
      mailboxService.listMailbox(status, page, limit),
      getSyncStatus(),
    ]);
    res.json({ ok: true, ...result, sync });
  } catch (err) {
    next(err);
  }
};

/** The panel calls this on open and from its "Sync now" button. A sync that
 *  finished moments ago is not repeated, so a busy panel can't hammer Zoho. */
export const syncHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const before = await getSyncStatus();
    const recent = before.lastSyncAt && Date.now() - before.lastSyncAt.getTime() < 30_000;
    const result = recent ? { ok: true, added: 0 } : await syncMailbox();
    res.json({ ...result, sync: await getSyncStatus() });
  } catch (err) {
    next(err);
  }
};

export const replyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = paramString(req.params.id);
    const message = await mailboxService.replyToMailbox(
      id,
      (req.body as { body: string }).body,
      req.admin!.email
    );
    await audit(req, 'mailbox.reply', id);
    res.json({ ok: true, message });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const markRepliedExternalHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = paramString(req.params.id);
    const message = await mailboxService.markMailboxRepliedExternally(id, req.admin!.email);
    await audit(req, 'mailbox.markRepliedExternal', id);
    res.json({ ok: true, message });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const archiveHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = paramString(req.params.id);
    const message = await mailboxService.archiveMailbox(id);
    await audit(req, 'mailbox.archive', id);
    res.json({ ok: true, message });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const deleteHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = paramString(req.params.id);
    await mailboxService.deleteMailbox(id);
    await audit(req, 'mailbox.delete', id);
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};
