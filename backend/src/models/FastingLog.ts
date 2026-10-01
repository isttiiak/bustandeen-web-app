import mongoose, { Schema, Document } from 'mongoose';

export const FASTING_CATEGORIES = ['qada', 'kaffarah', 'nadhr', 'voluntary', 'ramadan'] as const;
export type FastingCategory = (typeof FASTING_CATEGORIES)[number];

export const VOLUNTARY_KINDS = [
  'mon_thu',
  'ayyam_bid',
  'arafah',
  'ashura',
  'shawwal_six',
  'muharram',
  'shaban',
  'dawud',
  'dhul_hijjah',
  'general',
] as const;
export type VoluntaryKind = (typeof VOLUNTARY_KINDS)[number];

export const FASTING_STATUSES = ['intended', 'completed', 'broken'] as const;
export type FastingStatus = (typeof FASTING_STATUSES)[number];

export interface IFastingLog extends Document {
  userId: string;
  /** Local civil date of the dawn→sunset period, client-authoritative */
  date: string;
  category: FastingCategory;
  voluntaryKind?: VoluntaryKind;
  /** References FastingProfile.vows._id when category === 'nadhr' */
  vowId?: string;
  status: FastingStatus;
  /** Display snapshot of the user's adjusted hijri date, e.g. "17 Muḥarram 1448" */
  hijri?: string;
  note?: string;
  /** Ramadan nights: tarawih prayed (independent of the fast status) */
  tarawih?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const fastingLogSchema = new Schema<IFastingLog>(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    category: { type: String, enum: FASTING_CATEGORIES, required: true },
    voluntaryKind: { type: String, enum: VOLUNTARY_KINDS },
    vowId: { type: String },
    status: { type: String, enum: FASTING_STATUSES, required: true },
    hijri: { type: String, maxlength: 60 },
    note: { type: String, maxlength: 200 },
    tarawih: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One fast per person per day — you cannot fast twice in one day.
fastingLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IFastingLog>('FastingLog', fastingLogSchema);
