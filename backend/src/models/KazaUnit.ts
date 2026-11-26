import mongoose, { Document, Schema } from 'mongoose';
import { PrayerId } from './SalatLog.js';

/**
 * One itemized missed-prayer record — unlike SalatDebt (a flat running
 * counter) or SalatDebtEvent (an anonymous delta log, "when did the total
 * change" but not "which specific prayer"), a KazaUnit ties a debt unit to
 * the EXACT day it was missed, so it can be resolved individually and
 * genuinely new analysis becomes possible ("how long did that Fajr sit
 * unpaid", "what's the oldest thing you still owe").
 *
 * Deliberately only created where a real, specific date is known — the
 * automatic day-rollover sweep (ensureCaughtUp) and a specific past day's
 * log edit both know exactly which day+prayer. The generic +/- debt
 * adjuster and the one-time "estimate what you owe" setup do NOT create
 * these (see salatDebt.service.ts) — assigning a fake date to an anonymous
 * bulk correction would be misleading data, not useful analysis. Those
 * portions of a user's debt simply have no itemized record, same as before
 * this model existed; SalatDebt.owed stays the authoritative total either way.
 */
interface IKazaUnit extends Document {
  userId: string;
  prayer: PrayerId;
  /** Civil date (YYYY-MM-DD) this specific prayer was missed on. */
  missedDate: string;
  status: 'owed' | 'paid';
  /** When it was marked paid — null/undefined while still owed. */
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const kazaUnitSchema = new Schema<IKazaUnit>(
  {
    userId: { type: String, required: true },
    prayer: { type: String, required: true },
    missedDate: { type: String, required: true },
    status: { type: String, enum: ['owed', 'paid'], default: 'owed' },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// One unit per (user, prayer, day) — a given prayer can only be missed once
// on a given civil day, so this both indexes the common queries (FIFO oldest
// owed; exact-date resolve) and guards against double-creation.
kazaUnitSchema.index({ userId: 1, prayer: 1, missedDate: 1 }, { unique: true });
kazaUnitSchema.index({ userId: 1, prayer: 1, status: 1, missedDate: 1 });

export default mongoose.model<IKazaUnit>('KazaUnit', kazaUnitSchema);
