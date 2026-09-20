import { Request, Response, NextFunction } from 'express';
import * as adminAuditService from '../services/adminAudit.service.js';

export const listHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const actorEmail = typeof req.query.actor === 'string' ? req.query.actor.trim() : undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const result = await adminAuditService.listAuditLog(actorEmail || undefined, page, limit);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
};
