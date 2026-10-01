import mongoose, { Document, Schema } from 'mongoose';

/**
 * Written only when a request is actually THROTTLED (never per-request —
 * that would be far too high volume) by a rate limiter's `handler` callback
 * (see middleware/rateLimiter.ts). DB-backed rather than reading
 * express-rate-limit's own in-memory store, since Vercel serverless spreads
 * requests across instances whose in-memory counters never share state —
 * a live-counter view would be misleading there. This is event-driven
 * instead, so it works the same regardless of how many instances are live.
 */
export interface IRateLimitHit extends Document {
  limiterName: string;
  path: string;
  ip: string;
  uid?: string;
  createdAt: Date;
}

const rateLimitHitSchema = new Schema<IRateLimitHit>({
  limiterName: { type: String, required: true },
  path: { type: String, required: true },
  ip: { type: String, required: true },
  uid: { type: String },
  createdAt: { type: Date, default: Date.now },
});

/** Retention: IP addresses are personal data, so throttle events are kept
 * for 30 days only (the admin ops view reads the last 24h). The TTL index also
 * serves the newest-first sort. Documented on /privacy. Built by
 * `npm run sync-indexes` (autoIndex is off in production). */
export const RATE_LIMIT_HIT_TTL_SECONDS = 30 * 24 * 60 * 60;
rateLimitHitSchema.index({ createdAt: 1 }, { expireAfterSeconds: RATE_LIMIT_HIT_TTL_SECONDS });

export default mongoose.model<IRateLimitHit>('RateLimitHit', rateLimitHitSchema);
