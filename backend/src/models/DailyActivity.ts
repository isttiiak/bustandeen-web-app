import mongoose, { Schema } from 'mongoose';

/**
 * One document per day (Bangladesh time, `_id: 'YYYY-MM-DD'`) for the admin
 * retention view (audit T4.6). Aggregate numbers only, never who:
 *
 * - `active`: people who opened the app that day. Incremented the first time
 *   each person is active on a new day (User.activeDay); absent on days
 *   before counting started (v5.158.5).
 * - `salat` / `zikr` / `quran` / `fasting`: how many people logged each that
 *   day, computed from the logs once the day is over (`featuresAt`) and kept,
 *   so the admin view reads snapshots instead of scanning logs every time.
 *
 * `_id` is the day, so no extra index is needed.
 */
export interface IDailyActivity {
  _id: string;
  active?: number;
  salat?: number | null;
  zikr?: number | null;
  quran?: number | null;
  fasting?: number | null;
  featuresAt?: Date | null;
}

const dailyActivitySchema = new Schema<IDailyActivity>(
  {
    _id: { type: String, required: true },
    active: { type: Number },
    salat: { type: Number, default: null },
    zikr: { type: Number, default: null },
    quran: { type: Number, default: null },
    fasting: { type: Number, default: null },
    featuresAt: { type: Date, default: null },
  },
  { versionKey: false }
);

export default mongoose.model<IDailyActivity>('DailyActivity', dailyActivitySchema);
