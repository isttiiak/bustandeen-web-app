import mongoose, { Schema, Document } from 'mongoose';
import { PRAYER_IDS, PrayerId } from './SalatLog.js';

/**
 * Missed-prayer (kaza) debt — one atomic counter per fard prayer. Incremented
 * automatically when a prayer is marked 'missed' (and decremented if that mark
 * is later undone — see updatePrayerStatus in salat.service.ts), and adjustable
 * by hand for debt owed from before the user started tracking, or paid back
 * outside of any specific logged day.
 */
export interface ISalatDebt extends Document {
  userId: string;
  owed: Record<PrayerId, number>;
  /** Civil date (YYYY-MM-DD) the current counting period started — either
   * this doc's creation day or the day of the last manual reset. Shown in
   * the UI so "N prayers owed" reads as "since <date>", not a bottomless
   * lifetime total. */
  since?: string;
  /** Last past civil date already folded into `owed` by the automatic
   * day-rollover sweep (see ensureCaughtUp in salatDebt.service.ts). Days
   * after this one, up to (not including) today, still need processing. */
  lastAccrualDate?: string;
  /** Past days the sweep skipped (or released) because they were Rayhanah rest
   * days. Kept so that if a cycle is later deleted or shortened, exactly those
   * days can be counted after all. Days older than `since` are pruned. */
  skippedRestDays: string[];
  /** True once skippedRestDays has been filled from the cycle log (one-time
   * catch-up for debt documents created before that list existed). */
  restDaysSeeded?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const counterSchema = new Schema(
  Object.fromEntries(PRAYER_IDS.map((id) => [id, { type: Number, default: 0, min: 0 }])),
  { _id: false }
);

const todayDateStr = (): string => new Date().toISOString().substring(0, 10);
const yesterdayDateStr = (): string => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().substring(0, 10);
};

const salatDebtSchema = new Schema<ISalatDebt>(
  {
    userId: { type: String, required: true, unique: true },
    owed: { type: counterSchema, default: () => ({}) },
    // Defaults apply the moment a debt doc is first created (manually or by
    // the automatic sweep) — so accrual always starts from "now", never
    // silently back-charging days before the user (or this feature) existed.
    since: { type: String, default: todayDateStr },
    lastAccrualDate: { type: String, default: yesterdayDateStr },
    skippedRestDays: { type: [String], default: [] },
    restDaysSeeded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ISalatDebt>('SalatDebt', salatDebtSchema);
