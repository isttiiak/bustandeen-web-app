import mongoose, { Schema, Document } from 'mongoose';

export type PrayerStatus = 'completed' | 'kaza' | 'missed' | 'pending';
export type PrayerLocation = 'home' | 'mosque' | 'jamat';

export const MISSED_REASONS = ['sleep', 'travel', 'forgot', 'busy', 'other'] as const;
export type MissedReason = (typeof MISSED_REASONS)[number];

export const NAFL_TYPE_IDS = [
  'tahajjud',
  'ishraq',
  'duha',
  'awwabin',
  'witr',
  'tahiyyat_wudu',
  'tahiyyat_masjid',
  'hajat',
  'istikharah',
  'tarawih',
] as const;
export type NaflType = (typeof NAFL_TYPE_IDS)[number];

/** How a traveller joined this prayer with its pair (Ẓuhr+ʿAṣr or
 * Maghrib+ʿIshā): taqdīm = both in the earlier prayer's time, ta'khīr = both
 * in the later one's. See frontend utils/musafir.ts for the evidence. */
export const JAM_KINDS = ['taqdim', 'takhir'] as const;
export type JamKind = (typeof JAM_KINDS)[number];

export const PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerId = (typeof PRAYER_IDS)[number];

export interface IPrayerEntry {
  status: PrayerStatus;
  prayedAt?: Date;
  location?: PrayerLocation;
  tasbeeh?: boolean;
  ayatulKursi?: boolean;
  /** Start/end of this prayer's valid window on the day it was marked — sent
   * by the client (it already computes these via the adhan library for
   * display) only when status becomes completed/kaza. Powers the "prayed
   * early/mid/late in the window" analytics; absent for logs written before
   * this field existed or when the client had no location set. */
  windowStart?: Date;
  windowEnd?: Date;
  /** Optional, user-chosen context for why a prayer was missed — set only
   * when status is 'missed'. Never required; purely for the user's own
   * pattern analysis (see salatAnalytics.missedReasons). */
  missedReason?: MissedReason;
  /** Musafir mode: prayed shortened (qaṣr), 2 rak'ahs instead of 4. Only
   * meaningful for Ẓuhr/ʿAṣr/ʿIshā; on a Friday it means the traveller prayed
   * Ẓuhr, not Jumu'ah. */
  qasr?: boolean;
  /** Musafir mode: combined with its pair prayer (jamʿ). */
  jam?: JamKind;
}

export interface INaflEntry {
  completed: boolean;
  types: NaflType[];
  rakat: number;
  completedAt?: Date;
}

export interface ISalatLog extends Document {
  userId: string;
  date: string;
  prayers: Record<PrayerId, IPrayerEntry>;
  nafl: INaflEntry;
  createdAt: Date;
  updatedAt: Date;
}

const prayerEntrySchema = new Schema<IPrayerEntry>(
  {
    status: { type: String, enum: ['completed', 'kaza', 'missed', 'pending'], default: 'pending' },
    prayedAt: { type: Date },
    location: { type: String, enum: ['home', 'mosque', 'jamat'] },
    tasbeeh: { type: Boolean, default: false },
    ayatulKursi: { type: Boolean, default: false },
    windowStart: { type: Date },
    windowEnd: { type: Date },
    missedReason: { type: String, enum: MISSED_REASONS },
    qasr: { type: Boolean },
    jam: { type: String, enum: JAM_KINDS },
  },
  { _id: false }
);

const naflEntrySchema = new Schema<INaflEntry>(
  {
    completed: { type: Boolean, default: false },
    types: [{ type: String, enum: NAFL_TYPE_IDS }],
    rakat: { type: Number, default: 2, min: 2 },
    completedAt: { type: Date },
  },
  { _id: false }
);

const defaultEntry = (): IPrayerEntry => ({ status: 'pending' });
const defaultNafl = (): INaflEntry => ({ completed: false, types: [], rakat: 2 });

const salatLogSchema = new Schema<ISalatLog>(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    prayers: {
      fajr: { type: prayerEntrySchema, default: defaultEntry },
      dhuhr: { type: prayerEntrySchema, default: defaultEntry },
      asr: { type: prayerEntrySchema, default: defaultEntry },
      maghrib: { type: prayerEntrySchema, default: defaultEntry },
      isha: { type: prayerEntrySchema, default: defaultEntry },
    },
    nafl: { type: naflEntrySchema, default: defaultNafl },
  },
  { timestamps: true }
);

salatLogSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<ISalatLog>('SalatLog', salatLogSchema);
