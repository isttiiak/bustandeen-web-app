/**
 * Shared retry rules for the offline outboxes (audit 2026-11-16 P1-5).
 *
 * An outbox used to treat every answer other than "no network" as final and
 * drop the write: a 401 while the token was refreshing, a 429 under load or a
 * 503 during a deploy silently lost a prayer or a log the person had made.
 * These statuses say "not now", not "never", so the write stays queued and is
 * tried again later with a growing delay.
 */

/** Answers that mean "try again later" rather than "this can never work". */
export function isRetryableStatus(status: number | undefined): boolean {
  if (status === undefined) return false;
  return (
    status === 401 || // token not ready or just expired
    status === 403 || // e-mail not verified yet, account state changing
    status === 408 ||
    status === 409 || // the same op is still being applied
    status === 425 ||
    status === 429 ||
    status >= 500
  );
}

const BACKOFF_BASE_MS = 30_000;
const BACKOFF_MAX_MS = 15 * 60_000;

/** A write that has waited this long is dropped, so one that can never go
 * through cannot hold the queue for ever. */
const MAX_OP_AGE_MS = 14 * 24 * 3600_000;

export function isTooOld(queuedAt: number, now = Date.now()): boolean {
  return now - queuedAt > MAX_OP_AGE_MS;
}

/**
 * Wait before the next automatic try: 30 s, 60 s, 2 min ... up to 15 min. A
 * `Retry-After` in seconds (sent with a 429) is respected, within the same cap.
 */
export function backoffMs(attempts: number, retryAfter?: unknown): number {
  const exp = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1));
  const seconds = Number(retryAfter);
  if (retryAfter !== undefined && retryAfter !== '' && Number.isFinite(seconds) && seconds > 0) {
    return Math.min(BACKOFF_MAX_MS, Math.max(exp, seconds * 1000));
  }
  return exp;
}
