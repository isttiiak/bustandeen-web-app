import mongoose, { Document, Schema } from 'mongoose';

/**
 * Daily count of Content-Security-Policy violation reports (audit T1.3b).
 *
 * The CSP ships Report-Only; before it is enforced, a week of reports has to
 * be reviewed, and Vercel Hobby keeps only one hour of logs. So each
 * (UTC day, directive, blocked origin, source origin, disposition) gets one
 * counter document. Origins only (see cspReport.service.ts originOnly):
 * never page paths, query strings, script samples, IPs or user ids.
 */
export interface ICspViolationDaily extends Document {
  /** UTC calendar day, YYYY-MM-DD. */
  day: string;
  directive: string;
  blocked: string;
  source: string;
  disposition: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

const cspViolationDailySchema = new Schema<ICspViolationDaily>({
  day: { type: String, required: true },
  directive: { type: String, required: true },
  blocked: { type: String, required: true },
  source: { type: String, required: true },
  disposition: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  firstSeen: { type: Date, required: true, default: Date.now },
  lastSeen: { type: Date, required: true, default: Date.now },
});

/** One counter per day + combination; also serves the per-day cap count and
 *  the admin view's "since day X" match. */
cspViolationDailySchema.index(
  { day: 1, directive: 1, blocked: 1, source: 1, disposition: 1 },
  { unique: true }
);

/** Retention: 30 days, enough to review a week before enforcing and to watch
 *  the weeks after. Built by `npm run sync-indexes` (autoIndex is off in
 *  production). */
export const CSP_VIOLATION_TTL_SECONDS = 30 * 24 * 60 * 60;
cspViolationDailySchema.index({ firstSeen: 1 }, { expireAfterSeconds: CSP_VIOLATION_TTL_SECONDS });

export default mongoose.model<ICspViolationDaily>('CspViolationDaily', cspViolationDailySchema);
