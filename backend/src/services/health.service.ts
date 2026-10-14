import mongoose from 'mongoose';
import CronRun from '../models/CronRun.js';

/**
 * LT-3: /api/health answers without the database, so a database outage never
 * reached the status page. This deep check pings MongoDB and reads one
 * collection's metadata. The result is cached for a few seconds, so the public
 * route cannot be used to load the database, and it never says why it failed
 * (the reason is logged instead).
 */
export interface DbHealth {
  ok: boolean;
  latencyMs: number | null;
}

const CACHE_MS = 15_000;
const TIMEOUT_MS = 5_000;

let cached: { at: number; result: DbHealth } | null = null;

const withTimeout = <T>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    );
  });

const probe = async (): Promise<DbHealth> => {
  const db = mongoose.connection.db;
  if (mongoose.connection.readyState !== 1 || !db) {
    console.error('Deep health: MongoDB is not connected');
    return { ok: false, latencyMs: null };
  }
  const start = Date.now();
  try {
    await withTimeout(
      (async () => {
        await db.admin().ping();
        await db.collection('users').estimatedDocumentCount();
      })(),
      TIMEOUT_MS
    );
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    console.error('Deep health: MongoDB check failed:', err instanceof Error ? err.message : err);
    return { ok: false, latencyMs: null };
  }
};

export const checkDatabase = async (now = Date.now()): Promise<DbHealth> => {
  if (cached && now - cached.at < CACHE_MS) return cached.result;
  const result = await probe();
  cached = { at: Date.now(), result };
  return result;
};

/** Tests only. */
export const resetDbHealthCache = (): void => {
  cached = null;
};

/** A daily job fires within its hour on Vercel Hobby; past this the check is stale. */
export const EMAIL_CHECK_MAX_AGE_MS = 36 * 60 * 60 * 1000;

export type EmailHealthState = 'ok' | 'failed' | 'stale' | 'never-run';

/** LT-2: the last daily SMTP check, for the status page. Says only the state;
 *  which sender failed and why is in Admin, Ops health. */
export const emailHealth = async (
  now = Date.now()
): Promise<{ state: EmailHealthState; checkedAt: Date | null }> => {
  const run = await CronRun.findById('email-check').lean();
  if (!run) return { state: 'never-run', checkedAt: null };
  if (now - run.ranAt.getTime() > EMAIL_CHECK_MAX_AGE_MS)
    return { state: 'stale', checkedAt: run.ranAt };
  return { state: run.ok ? 'ok' : 'failed', checkedAt: run.ranAt };
};
