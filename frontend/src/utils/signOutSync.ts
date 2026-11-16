import type { QueryClient } from '@tanstack/react-query';
import { useZikrStore } from '../store/useZikrStore.js';
import { replaySalatOutbox } from '../hooks/useSalatLog.js';
import { peekSalatOutbox } from './salatOutbox.js';
import { peekSyncOutbox, replaySyncOutbox } from './syncOutbox.js';
import { outboxOpOwnership } from './outboxOwner.js';

// Signing out wipes this device's counts and offline queues (App.tsx), so
// anything still waiting to be sent is lost. The sign-out dialog uses this to
// say what is waiting, and to try sending it first (audit 2026-11-16 P1-6).

export interface UnsyncedSummary {
  /** Zikr taps not yet confirmed by the server (a pending batch and an unsent one). */
  zikrCounts: number;
  /** Queued prayer updates and other offline changes of the signed-in account. */
  changes: number;
  /** zikrCounts + changes: zero means nothing would be lost. */
  total: number;
}

function inflightCounts(body: string): number {
  try {
    const parsed = JSON.parse(body) as { increments?: { amount?: number }[] };
    return (parsed.increments ?? []).reduce((sum, inc) => sum + Math.abs(inc.amount ?? 0), 0);
  } catch {
    return 0;
  }
}

export function summariseUnsynced(): UnsyncedSummary {
  const { pending, inflight } = useZikrStore.getState();
  const zikrCounts =
    Object.values(pending).reduce((sum, a) => sum + Math.abs(a), 0) +
    (inflight ? inflightCounts(inflight.body) : 0);
  const mine = (owner: string | undefined) => outboxOpOwnership(owner) !== 'foreign';
  const changes =
    peekSalatOutbox().filter((op) => mine(op.owner)).length +
    peekSyncOutbox().filter((op) => mine(op.owner)).length;
  return { zikrCounts, changes, total: zikrCounts + changes };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function sendZikr(deadline: number): Promise<void> {
  let before = summariseUnsynced().zikrCounts;
  while (before > 0 && Date.now() < deadline) {
    await useZikrStore.getState().flush();
    // A delivered batch starts the next one without being awaited: let it settle.
    while (useZikrStore.getState().isFlushing && Date.now() < deadline) await sleep(100);
    const after = summariseUnsynced().zikrCounts;
    if (after === 0 || after >= before) return; // done, or no progress (offline)
    before = after;
  }
}

/**
 * Tries to send everything waiting: zikr taps, queued prayer updates and the
 * other offline changes. Gives up after `timeoutMs` or when the network is
 * still out, and returns what is STILL waiting (total 0 means safe to sign out).
 */
export async function syncBeforeSignOut(
  qc: QueryClient,
  opts: { timeoutMs?: number } = {}
): Promise<UnsyncedSummary> {
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const deadline = Date.now() + timeoutMs;
  const work = Promise.all([sendZikr(deadline), replaySalatOutbox(qc), replaySyncOutbox(qc)]).catch(
    (err) => {
      console.warn('Sync before sign-out failed:', (err as Error).message);
    }
  );
  await Promise.race([work, sleep(timeoutMs)]);
  return summariseUnsynced();
}
