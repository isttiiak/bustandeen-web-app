import { Request, Response, NextFunction } from 'express';
import * as moonSightingService from '../services/moonSighting.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

// Public: devices apply the record for their own country on-device; nothing
// about the visitor is sent or needed.
export const listPublicHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const records = await moonSightingService.listActive();
    res.set('Cache-Control', 'public, max-age=900, stale-while-revalidate=3600');
    res.json({ ok: true, records });
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
    const records = await moonSightingService.listAll();
    res.json({ ok: true, records });
  } catch (err) {
    next(err);
  }
};

export const createHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.body as Parameters<typeof moonSightingService.create>[0];
    const record = await moonSightingService.create(body, req.admin!.email);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'moonSighting.create',
      targetType: 'MoonSighting',
      targetId: String(record._id),
      metadata: {
        country: record.country,
        effectiveFrom: record.effectiveFrom,
        offset: record.offset,
      },
    });
    res.status(201).json({ ok: true, record });
  } catch (err) {
    next(err);
  }
};

export const deactivateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params['id']);
    const record = await moonSightingService.deactivate(id, req.admin!.email);
    if (!record) {
      res.status(404).json({ ok: false, error: 'No active record with this id.' });
      return;
    }
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'moonSighting.deactivate',
      targetType: 'MoonSighting',
      targetId: id,
      metadata: {
        country: record.country,
        effectiveFrom: record.effectiveFrom,
        offset: record.offset,
      },
    });
    res.json({ ok: true, record });
  } catch (err) {
    next(err);
  }
};
