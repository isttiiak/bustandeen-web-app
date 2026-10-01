import { createHash, createHmac } from 'node:crypto';
import {
  MemoryStore,
  type ClientRateLimitInfo,
  type Options,
  type Store,
} from 'express-rate-limit';
import mongoose from 'mongoose';
import RateLimitCounter from '../models/RateLimitCounter.js';

/**
 * A rate-limit store shared by every serverless instance (audit SEC-01).
 *
 * express-rate-limit's default MemoryStore lives inside one instance. On
 * Vercel each warm instance keeps its own counters and a cold start resets
 * them, so "20 AI requests a day" really meant "20 per instance per life of
 * that instance". This store keeps the counters in MongoDB instead, so every
 * instance sees the same count.
 *
 * Window: like MemoryStore, each client's window starts at its first hit
 * and lasts `windowMs` (not a calendar day for everyone at once). Counting is
 * one atomic update, so two instances incrementing at the same moment can
 * never both read the old value.
 *
 * Privacy: keys are IP addresses or user ids. Only a keyed hash of them is
 * stored, and every counter deletes itself (TTL) when its window ends.
 *
 * Failure: if MongoDB is unreachable the store falls back to an in-process
 * MemoryStore for that request, so an outage neither blocks every user nor
 * removes protection completely.
 */

const OP_TIMEOUT_MS = 2_000;

function hashKey(prefix: string, key: string): string {
  const secret = process.env.LOG_HASH_KEY ?? process.env.FIELD_ENCRYPTION_KEY;
  const input = `${prefix}:${key}`;
  if (!secret) return createHash('sha256').update(input).digest('hex');
  const k = createHmac('sha256', secret).update('bustandeen:rate-limit:v1').digest();
  return createHmac('sha256', k).update(input).digest('hex');
}

/** Mongoose would otherwise BUFFER queries while disconnected (up to 10 s),
 * stalling the request; when the database isn't ready, fall back at once. */
function dbReady(): boolean {
  return mongoose.connection.readyState === 1;
}

function isDuplicateKey(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export class MongoRateLimitStore implements Store {
  /** Counters are shared across instances (not local to this process). */
  localKeys = false;
  prefix: string;
  private windowMs = 60_000;
  private readonly fallback = new MemoryStore();
  private fallbackReady = false;

  constructor(prefix: string) {
    this.prefix = `${prefix}:`;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
    this.fallback.init(options);
    this.fallbackReady = true;
  }

  private id(key: string): string {
    return hashKey(this.prefix, key);
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    if (!dbReady()) return this.fallbackReady ? this.fallback.get(key) : undefined;
    try {
      const doc = await RateLimitCounter.findOne({
        key: this.id(key),
        resetAt: { $gt: new Date() },
      })
        .maxTimeMS(OP_TIMEOUT_MS)
        .lean();
      return doc ? { totalHits: doc.hits, resetTime: doc.resetAt } : undefined;
    } catch {
      return this.fallbackReady ? this.fallback.get(key) : undefined;
    }
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    if (!dbReady()) return this.fallback.increment(key);
    const id = this.id(key);
    const now = new Date();
    const freshReset = new Date(now.getTime() + this.windowMs);
    // One atomic pipeline update: inside the window → +1; window over (or no
    // counter yet) → start a new window at 1.
    const update = [
      {
        $set: {
          hits: { $cond: [{ $gt: ['$resetAt', now] }, { $add: ['$hits', 1] }, 1] },
          resetAt: { $cond: [{ $gt: ['$resetAt', now] }, '$resetAt', freshReset] },
        },
      },
    ];
    const run = () =>
      RateLimitCounter.findOneAndUpdate({ key: id }, update, {
        upsert: true,
        new: true,
        // Mongoose 9 rejects pipeline (array) updates unless asked explicitly.
        updatePipeline: true,
        maxTimeMS: OP_TIMEOUT_MS,
        lean: true,
      });
    try {
      let doc;
      try {
        doc = await run();
      } catch (err) {
        // Two instances creating the same counter at once: one insert loses
        // on the unique index; the retry then finds and increments it.
        if (!isDuplicateKey(err)) throw err;
        doc = await run();
      }
      if (!doc) throw new Error('rate-limit counter upsert returned nothing');
      return { totalHits: doc.hits, resetTime: doc.resetAt };
    } catch (err) {
      console.error(
        JSON.stringify({
          level: 'error',
          type: 'rate-limit-store',
          prefix: this.prefix,
          message: String((err as Error)?.message ?? err),
        })
      );
      return this.fallback.increment(key);
    }
  }

  async decrement(key: string): Promise<void> {
    if (!dbReady()) return this.fallback.decrement(key);
    try {
      await RateLimitCounter.updateOne(
        { key: this.id(key), resetAt: { $gt: new Date() }, hits: { $gt: 0 } },
        { $inc: { hits: -1 } }
      ).maxTimeMS(OP_TIMEOUT_MS);
    } catch {
      await this.fallback.decrement(key);
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await RateLimitCounter.deleteOne({ key: this.id(key) }).maxTimeMS(OP_TIMEOUT_MS);
    } catch {
      // ignore: the counter expires on its own
    }
    await this.fallback.resetKey(key);
  }

  shutdown(): void {
    this.fallback.shutdown();
  }
}
