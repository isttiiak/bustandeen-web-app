import mongoose, { Document, Schema } from 'mongoose';

/**
 * Append-only log of individual (positive) zikr taps, real wall-clock time —
 * unlike ZikrDaily (one cumulative count per user+day+type, bucketed to the
 * Fajr-anchored tracking day), this preserves WHEN during the day a count
 * happened. Powers the time-of-day chart and session history; decrements are
 * corrections and are never logged here, and neither are counts added
 * automatically (e.g. the salat tracker's tasbīḥ), which aren't real-time zikr.
 *
 * TTL-capped at 90 days — this is a UX feature (recent patterns), not
 * long-term history like ZikrDaily, so it doesn't need to grow forever.
 */
export interface IZikrEvent extends Document {
  userId: string;
  zikrType: string;
  amount: number;
  ts: Date;
  /** When the run of taps this event covers began (`ts` is when it ended).
   * Taps are batched by a debounce, so one event can span minutes of counting;
   * sessions use this to show the real start. Absent on older events. */
  startTs?: Date;
  /** Counts the user typed in afterwards ("Log missed counts"), not tapped in
   * real time. They keep no meaningful time, so they are excluded from the
   * time-of-day chart and shown in session history without a clock time. */
  manual?: boolean;
  createdAt: Date;
}

const zikrEventSchema = new Schema<IZikrEvent>(
  {
    userId: { type: String, required: true },
    zikrType: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    ts: { type: Date, required: true },
    startTs: { type: Date },
    manual: { type: Boolean },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

zikrEventSchema.index({ userId: 1, ts: 1 });
zikrEventSchema.index({ ts: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IZikrEvent>('ZikrEvent', zikrEventSchema);
