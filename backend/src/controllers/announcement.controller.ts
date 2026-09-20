import { Request, Response, NextFunction } from 'express';
import * as announcementService from '../services/announcement.service.js';

export const getActiveHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const announcement = await announcementService.getActiveAnnouncement();
    res.json({
      ok: true,
      announcement: announcement
        ? { id: announcement._id, title: announcement.title, body: announcement.body }
        : null,
    });
  } catch (err) {
    next(err);
  }
};
