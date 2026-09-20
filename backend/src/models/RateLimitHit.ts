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

rateLimitHitSchema.index({ createdAt: -1 });

export default mongoose.model<IRateLimitHit>('RateLimitHit', rateLimitHitSchema);
