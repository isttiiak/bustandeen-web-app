import { Request, Response, NextFunction } from 'express';
import * as feedbackService from '../services/feedback.service.js';
import { FeedbackStatus } from '../models/FeedbackMessage.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const paramString = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

const handleServiceError = (err: unknown, res: Response, next: NextFunction): void => {
  const status = (err as { status?: number }).status;
  if (status === 404) {
    res.status(status).json({ ok: false, error: (err as Error).message });
    return;
  }
  next(err);
};

export const listHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = req.query.status as FeedbackStatus | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const result = await feedbackService.listFeedback(status, page, limit);
    res.json({ ok: true, ...result });
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
    const { body } = req.body as { body: string };
    const id = paramString(req.params.id);
    const message = await feedbackService.replyToFeedback(id, body, req.admin!.email);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'feedback.reply',
      targetType: 'FeedbackMessage',
      targetId: id,
    });
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
    const message = await feedbackService.markRepliedExternally(id, req.admin!.email);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'feedback.markRepliedExternal',
      targetType: 'FeedbackMessage',
      targetId: id,
    });
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
    const message = await feedbackService.archiveFeedback(id);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'feedback.archive',
      targetType: 'FeedbackMessage',
      targetId: id,
    });
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
    await feedbackService.deleteFeedback(id);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'feedback.delete',
      targetType: 'FeedbackMessage',
      targetId: id,
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};
