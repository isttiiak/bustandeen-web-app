import mongoose, { Schema, Document } from 'mongoose';
import { PrayerId } from './SalatLog.js';

/**
 * Append-only log of every change to a user's kaza debt (see SalatDebt.ts),
 * keyed to the CIVIL DATE the change belongs to (the prayer's own date for
 * the automatic missed<->non-missed hook, or the client's local "today" for
 * a manual adjust/set) — not the server clock. Exists purely to chart
 * accumulation vs payback over time; SalatDebt.owed itself is still the
 * single source of truth for the current total.
 */
interface ISalatDebtEvent extends Document {
  userId: string;
  date: string;
  prayer: PrayerId;
  delta: number;
  createdAt: Date;
}

const salatDebtEventSchema = new Schema<ISalatDebtEvent>(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    prayer: { type: String, required: true, enum: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] },
    delta: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

salatDebtEventSchema.index({ userId: 1, date: 1 });

export default mongoose.model<ISalatDebtEvent>('SalatDebtEvent', salatDebtEventSchema);
