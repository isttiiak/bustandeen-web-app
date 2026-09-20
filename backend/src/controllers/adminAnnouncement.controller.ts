import { Request, Response, NextFunction } from 'express';
import * as announcementService from '../services/announcement.service.js';
import { logAdminAction } from '../services/adminAudit.service.js';

const paramString = (v: string | string[] | undefined): string =>
  (Array.isArray(v) ? v[0] : v) ?? '';

export const listHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const announcements = await announcementService.listAnnouncements();
    res.json({ ok: true, announcements });
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
    const { title, body, expiresAt } = req.body as {
      title: string;
      body: string;
      expiresAt?: Date;
    };
    const announcement = await announcementService.createAnnouncement(
      title,
      body,
      req.admin!.email,
      expiresAt
    );
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'announcement.create',
      targetType: 'Announcement',
      targetId: String(announcement._id),
      metadata: { title },
    });
    res.status(201).json({ ok: true, announcement });
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
    const id = paramString(req.params.id);
    const announcement = await announcementService.deactivateAnnouncement(id);
    await logAdminAction({
      actorEmail: req.admin!.email,
      actorRole: req.admin!.role,
      action: 'announcement.deactivate',
      targetType: 'Announcement',
      targetId: id,
    });
    res.json({ ok: true, announcement });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) {
      res.status(404).json({ ok: false, error: (err as Error).message });
      return;
    }
    next(err);
  }
};
