import mongoose, { Schema } from 'mongoose';

/**
 * One shared rate-limit counter per (limiter, client), used by
 * middleware/mongoRateLimitStore.ts so every serverless instance sees the
 * same count.
 *
 * `key` is a keyed HASH of "<limiter>:<ip or uid>", never the raw value.
 * `resetAt` is when the client's current window ends; the TTL index deletes
 * the counter shortly after, so nothing outlives its window (the longest
 * window is 24 hours).
 */
export interface IRateLimitCounter {
  key: string;
  hits: number;
  resetAt: Date;
}

const rateLimitCounterSchema = new Schema<IRateLimitCounter>(
  {
    key: { type: String, required: true },
    hits: { type: Number, required: true, default: 0 },
    resetAt: { type: Date, required: true },
  },
  { versionKey: false }
);

rateLimitCounterSchema.index({ key: 1 }, { unique: true });
rateLimitCounterSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IRateLimitCounter>('RateLimitCounter', rateLimitCounterSchema);
