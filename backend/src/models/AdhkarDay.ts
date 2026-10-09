import mongoose, { Schema, Document } from 'mongoose';

export const ADHKAR_PERIODS = ['morning', 'evening'] as const;
export type AdhkarPeriod = (typeof ADHKAR_PERIODS)[number];

/** One row per person per tracking day: when the morning / evening adhkar
 * routine was completed (T4.3). Only the done flags sync; the per-item tap
 * counts stay on the device. Nothing here feeds zikr totals, Noor or streaks. */
export interface IAdhkarDay extends Document {
  userId: string;
  /** Tracking day (getTrackingDay on the client), YYYY-MM-DD */
  date: string;
  morningAt?: Date;
  eveningAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const adhkarDaySchema = new Schema<IAdhkarDay>(
  {
    userId: { type: String, required: true },
    date: { type: String, required: true },
    morningAt: { type: Date },
    eveningAt: { type: Date },
  },
  { timestamps: true }
);

adhkarDaySchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model<IAdhkarDay>('AdhkarDay', adhkarDaySchema);
