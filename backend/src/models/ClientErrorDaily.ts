import mongoose, { Document, Schema } from 'mongoose';

/**
 * Daily count of errors the app hit in visitors' browsers (audit T1.1
 * follow-up: frontend error reporting, no third-party tracker).
 *
 * Vercel Hobby keeps one hour of logs, so, like CspViolationDaily, each
 * (UTC day, kind, message, code location, page type, app version) gets one
 * counter document. The message is scrubbed (no addresses, emails or long
 * numbers), the location is our own bundle file and line, the page is the
 * analytics-redacted pattern ("/private" for private areas). No IP, user id,
 * device id or page address is stored.
 */
export interface IClientErrorDaily extends Document {
  /** UTC calendar day, YYYY-MM-DD. */
  day: string;
  kind: 'error' | 'rejection' | 'render';
  message: string;
  /** "main.js:12" (bundle file without its hash) or "unknown". */
  where: string;
  /** Redacted page pattern, e.g. "/prayer-times/:city" or "/private". */
  route: string;
  version: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
}

const clientErrorDailySchema = new Schema<IClientErrorDaily>({
  day: { type: String, required: true },
  kind: { type: String, required: true, enum: ['error', 'rejection', 'render'] },
  message: { type: String, required: true },
  where: { type: String, required: true },
  route: { type: String, required: true },
  version: { type: String, required: true },
  count: { type: Number, required: true, default: 0 },
  firstSeen: { type: Date, required: true, default: Date.now },
  lastSeen: { type: Date, required: true, default: Date.now },
});

/** One counter per day + combination; also serves the per-day cap count. */
clientErrorDailySchema.index(
  { day: 1, kind: 1, message: 1, where: 1, route: 1, version: 1 },
  { unique: true }
);

/** Retention: 30 days. Built by `npm run sync-indexes` (autoIndex is off in
 *  production). */
export const CLIENT_ERROR_TTL_SECONDS = 30 * 24 * 60 * 60;
clientErrorDailySchema.index({ firstSeen: 1 }, { expireAfterSeconds: CLIENT_ERROR_TTL_SECONDS });

export default mongoose.model<IClientErrorDaily>('ClientErrorDaily', clientErrorDailySchema);
