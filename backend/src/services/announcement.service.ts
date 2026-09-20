import Announcement, { IAnnouncement } from '../models/Announcement.js';

const httpError = (status: number, message: string): Error & { status: number } => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

export const createAnnouncement = async (
  title: string,
  body: string,
  createdBy: string,
  expiresAt?: Date
): Promise<IAnnouncement> => {
  // Single active announcement at a time — the simplest model that avoids
  // the public endpoint having to pick among several.
  await Announcement.updateMany({ active: true }, { $set: { active: false } });
  return Announcement.create({ title, body, createdBy, expiresAt: expiresAt ?? null });
};

export const listAnnouncements = async (): Promise<IAnnouncement[]> =>
  Announcement.find().sort({ createdAt: -1 }).limit(50);

export const deactivateAnnouncement = async (id: string): Promise<IAnnouncement> => {
  const doc = await Announcement.findByIdAndUpdate(id, { active: false }, { new: true });
  if (!doc) throw httpError(404, 'Announcement not found');
  return doc;
};

/** Public — no auth. Never returns a deactivated or expired announcement. */
export const getActiveAnnouncement = async (): Promise<IAnnouncement | null> =>
  Announcement.findOne({
    active: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).sort({ createdAt: -1 });
