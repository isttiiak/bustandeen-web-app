import mongoose, { Document, Schema } from 'mongoose';

/**
 * A one-off in-app banner the Servant can push without a code deploy (e.g.
 * "Ramadan hours changed"). Simplest correct model: at most one `active`
 * announcement at a time — creating a new one auto-deactivates any previous
 * active row (see adminAnnouncements.service.ts), so the public endpoint
 * never has to pick among several.
 */
export interface IAnnouncement extends Document {
  title: string;
  body: string;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date | null;
}

const announcementSchema = new Schema<IAnnouncement>({
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 2000 },
  active: { type: Boolean, default: true, index: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
});

export default mongoose.model<IAnnouncement>('Announcement', announcementSchema);
