import { Request, Response, NextFunction } from 'express';
import * as adminUsersService from '../services/adminUsers.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const paramString = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

const handleServiceError = (err: unknown, res: Response, next: NextFunction): void => {
  const status = (err as { status?: number }).status;
  if (status) {
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
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const sortBy = req.query.sort === 'inactive' ? 'inactive' : 'newest';
    const result = await adminUsersService.listUsers(search || undefined, page, limit, sortBy);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const welcomeBackfillStatusHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const missing = await adminUsersService.countMissingWelcomeEmail();
    res.json({ ok: true, missing });
  } catch (err) {
    next(err);
  }
};

export const welcomeBackfillSendHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = req.body?.limit ? Number(req.body.limit) : undefined;
    const result = await adminUsersService.sendWelcomeBackfill(limit);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const detailHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await adminUsersService.getUserDetail(paramString(req.params.uid));
    res.json({ ok: true, user });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const resendWelcomeHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = paramString(req.params.uid);
    await adminUsersService.resendWelcomeEmail(uid);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'user.resendWelcome',
      targetType: 'User',
      targetId: uid,
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const reengagementDraftHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const draft = await adminUsersService.getReengagementDraft(paramString(req.params.uid));
    res.json({ ok: true, ...draft });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const reengagementSendHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = paramString(req.params.uid);
    const { subject, body } = req.body as { subject: string; body: string };
    await adminUsersService.sendReengagementEmail(uid, subject, body);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'user.reengagementEmail',
      targetType: 'User',
      targetId: uid,
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const disableHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = paramString(req.params.uid);
    const { reason } = req.body as { reason?: string };
    await adminUsersService.disableUser(uid, reason);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'user.disable',
      targetType: 'User',
      targetId: uid,
      metadata: reason ? { reason } : undefined,
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const enableHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = paramString(req.params.uid);
    await adminUsersService.enableUser(uid);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'user.enable',
      targetType: 'User',
      targetId: uid,
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};

export const deleteUserHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const uid = paramString(req.params.uid);
    await adminUsersService.deleteUserByAdmin(uid);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'user.delete',
      targetType: 'User',
      targetId: uid,
    });
    res.json({ ok: true });
  } catch (err) {
    handleServiceError(err, res, next);
  }
};
