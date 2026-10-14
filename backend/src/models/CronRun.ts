import mongoose, { Schema } from 'mongoose';

/**
 * The last run of each Vercel Cron job (LT-1), one document per job, keyed by
 * the job's name in `_id` (so no extra index). Vercel Hobby keeps logs for one
 * hour, so this is the only lasting record that a job ran: Ops health shows it.
 */
export interface ICronRun {
  _id: string;
  ok: boolean;
  /** Short, secret-free outcome ("deploy requested", "hook not set"). */
  detail: string;
  ranAt: Date;
  /** The last run that succeeded (kept across failures). */
  lastOkAt: Date | null;
}

const cronRunSchema = new Schema<ICronRun>(
  {
    _id: { type: String, required: true },
    ok: { type: Boolean, required: true },
    detail: { type: String, required: true, maxlength: 300 },
    ranAt: { type: Date, required: true },
    lastOkAt: { type: Date, default: null },
  },
  { versionKey: false }
);

export default mongoose.model<ICronRun>('CronRun', cronRunSchema);
