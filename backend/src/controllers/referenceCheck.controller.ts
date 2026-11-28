import { Request, Response, NextFunction } from 'express';
import * as referenceCheckService from '../services/referenceCheck.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

// Public: the reference map and the native app show these marks. Nothing
// about the visitor is read or stored.
export const listPublicHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const checks = await referenceCheckService.listChecks();
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=600');
    res.json({ ok: true, checks });
  } catch (err) {
    next(err);
  }
};

export const listAdminHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({ ok: true, checks: await referenceCheckService.listChecks() });
  } catch (err) {
    next(err);
  }
};

export const saveHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as referenceCheckService.ReferenceCheckInput;
    const { check, before } = await referenceCheckService.saveCheck(body, req.admin!.email);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorUid: req.admin!.uid,
      actorRole: req.admin!.role,
      action: 'reference.check',
      targetType: 'ReferenceCheck',
      targetId: body.refId,
      metadata: { before, after: check },
    });
    res.json({ ok: true, refId: body.refId, check });
  } catch (err) {
    next(err);
  }
};

export const clearHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refId = String(req.params['refId']);
    const removed = await referenceCheckService.clearCheck(refId);
    if (!removed) {
      res.status(404).json({ ok: false, error: 'This reference has no manual check.' });
      return;
    }
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorUid: req.admin!.uid,
      actorRole: req.admin!.role,
      action: 'reference.clear',
      targetType: 'ReferenceCheck',
      targetId: refId,
      metadata: { before: removed },
    });
    res.json({ ok: true, refId });
  } catch (err) {
    next(err);
  }
};
