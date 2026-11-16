import type { NextFunction, Request, Response } from 'express';
import ClientOp from '../models/ClientOp.js';
import { runInTransaction } from '../utils/transaction.js';

/**
 * Applies a write at most once per `X-Client-Op-Id` (audit T2.3).
 *
 * The app's offline outbox (frontend utils/syncOutbox.ts) and the zikr flush
 * attach a fresh id to every non-idempotent write and keep that id across
 * retries. If the first attempt reached the server but its response was lost,
 * the retry gets the stored first answer back instead of counting twice.
 *
 * - No header: the request runs as before (older app versions keep working).
 * - A malformed header: 400, so a client bug never silently disables dedupe.
 * - Same id still in flight: 409 `op_in_progress`; the client retries later
 *   (a claim older than a minute is treated as abandoned and may run again).
 * - 5xx: the record is removed so a retry can run the write for real.
 *
 * Mount after requireAuth (it keys on req.user.uid) and after validate().
 */
const OP_ID = /^[A-Za-z0-9-]{8,64}$/;
/** Larger first responses are replayed as `{ ok: true }` (none of the
 * deduped routes' clients need more than that from a replay). */
const MAX_STORED_BODY_BYTES = 32 * 1024;

export function idempotent(opts: { storeBody?: boolean } = {}) {
  const storeBody = opts.storeBody !== false;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const raw = req.get('x-client-op-id');
    if (raw === undefined) return next();
    if (!OP_ID.test(raw)) {
      res.status(400).json({ ok: false, error: 'Invalid X-Client-Op-Id' });
      return;
    }
    const uid = req.user?.uid;
    if (!uid) return next();

    try {
      const existing = await ClientOp.findOne({ uid, opId: raw }).lean();
      if (existing && !isAbandoned(existing.status, existing.createdAt)) {
        replay(res, existing.status, existing.statusCode, existing.body);
        return;
      }
      // An abandoned claim (the instance died mid-write) may run again.
      if (existing) await ClientOp.deleteOne({ uid, opId: raw, status: 'pending' });
      await ClientOp.create({
        uid,
        opId: raw,
        route: `${req.method} ${req.baseUrl}${req.path}`,
        status: 'pending',
      });
    } catch (err) {
      // Lost a race with a concurrent duplicate (unique index): answer as a replay.
      if ((err as { code?: number }).code === 11000) {
        const winner = await ClientOp.findOne({ uid, opId: raw }).lean();
        replay(res, winner?.status ?? 'pending', winner?.statusCode, winner?.body);
        return;
      }
      return next(err);
    }

    // A handler that wraps its writes in `runIdempotent` records the op inside
    // its own transaction and flips `recorded`; this hook then only sends.
    res.locals.clientOp = { uid, opId: raw, storeBody, recorded: false } satisfies ClientOpClaim;

    // Record the first answer BEFORE it is sent: on serverless the instance can
    // be frozen the moment the response leaves, so a write after 'finish' might
    // never happen and the op would look in flight for good.
    const json = res.json.bind(res);
    res.json = (body: unknown) => {
      if ((res.locals.clientOp as ClientOpClaim | undefined)?.recorded) return json(body);
      const code = res.statusCode;
      const record =
        code >= 500
          ? ClientOp.deleteOne({ uid, opId: raw })
          : ClientOp.updateOne(
              { uid, opId: raw },
              {
                $set: {
                  status: 'done',
                  statusCode: code,
                  body: storeBody && fits(body) ? body : { ok: code < 400 },
                },
              }
            );
      void record
        .catch((e: unknown) => console.error('idempotency: could not record op', e))
        .finally(() => json(body));
      return res;
    };

    next();
  };
}

interface ClientOpClaim {
  uid: string;
  opId: string;
  storeBody: boolean;
  recorded: boolean;
}

/**
 * Runs a handler's writes in ONE transaction together with the `ClientOp`
 * update (audit 2026-11-16 P0-5). Without it, a failure after the first write
 * left that write in place while the claim was deleted, so the client's retry
 * counted it twice. Now an error rolls everything back, the claim is released
 * by the response hook as before, and the retry runs the whole write once.
 *
 * `fn` returns the 200 response body; the caller sends it with `res.json`.
 * It may run more than once (a write conflict with a concurrent request is
 * retried), so keep side effects outside the database in `afterCommit`.
 * Without an `X-Client-Op-Id` the writes are still atomic, just not deduped.
 */
export async function runIdempotent<T>(res: Response, fn: () => Promise<T>): Promise<T> {
  const claim = res.locals.clientOp as ClientOpClaim | undefined;
  const body = await runInTransaction(async () => {
    const result = await fn();
    if (claim) {
      await ClientOp.updateOne(
        { uid: claim.uid, opId: claim.opId },
        {
          $set: {
            status: 'done',
            statusCode: 200,
            body: claim.storeBody && fits(result) ? result : { ok: true },
          },
        }
      );
    }
    return result;
  });
  if (claim) claim.recorded = true;
  return body;
}

/** A claim still pending after this long belongs to a request that died. */
const ABANDONED_AFTER_MS = 60_000;
function isAbandoned(status: string, createdAt: Date): boolean {
  return status === 'pending' && Date.now() - new Date(createdAt).getTime() > ABANDONED_AFTER_MS;
}

function fits(body: unknown): boolean {
  try {
    return JSON.stringify(body ?? null).length <= MAX_STORED_BODY_BYTES;
  } catch {
    return false;
  }
}

function replay(res: Response, status: string, statusCode?: number, body?: unknown): void {
  res.set('Idempotent-Replayed', 'true');
  if (status !== 'done') {
    res.status(409).json({ ok: false, error: 'op_in_progress' });
    return;
  }
  res.status(statusCode ?? 200).json(body ?? { ok: true });
}
