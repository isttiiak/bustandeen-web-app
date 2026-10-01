import axios from 'axios';
import type { QueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { currentOutboxOwner, outboxOpOwnership } from './outboxOwner.js';

// Offline outbox for the fasting, Quran and Rayhanah trackers (audit T2.3).
// Same idea as salatOutbox.ts, generalised: a write that cannot reach the
// server is stored here (localStorage, so it survives closing the app) and
// replayed in order when the connection returns.
//
// Every op carries a client op id, sent as `X-Client-Op-Id`. Writes that add
// to a total (Quran āyāt read, a new cycle record) are deduplicated by the
// server with it, so a replay after a lost response never counts twice.
//
// Writes that carry their full end state can be COALESCED: a later op with the
// same `key` replaces the queued one ('replace'), or, for partial updates such
// as a cycle day's flow-then-mood, is merged into it ('merge').
//
// Cleared on sign-out (App.tsx) like the salat outbox, so a shared device never
// replays one account's writes into another's session.

const STORAGE_KEY = 'bustandeen_sync_outbox';

export type SyncTracker = 'fasting' | 'quran' | 'cycle';
type Method = 'post' | 'put' | 'patch' | 'delete';

export interface SyncOp {
  id: string;
  tracker: SyncTracker;
  method: Method;
  url: string;
  body?: Record<string, unknown>;
  key?: string;
  coalesce?: 'replace' | 'merge';
  queuedAt: number;
  /** uid that made the change (utils/outboxOwner.ts). */
  owner?: string;
}

export interface NewSyncOp {
  tracker: SyncTracker;
  method: Method;
  url: string;
  body?: Record<string, unknown>;
  /** Ops with the same key collapse into one (see `coalesce`). */
  key?: string;
  coalesce?: 'replace' | 'merge';
}

/** Thrown by sendOrQueue when the write was queued instead of sent. */
export class OfflineQueuedError extends Error {
  constructor() {
    super('Queued offline');
    this.name = 'OfflineQueuedError';
  }
}

export function newOpId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function readQueue(): SyncOp[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as SyncOp[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: SyncOp[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    /* storage full or blocked: the optimistic UI still shows the change */
  }
}

/** Adds an op (coalescing by key). Returns the stored op. */
export function enqueueSyncOp(op: NewSyncOp & { id?: string }): SyncOp {
  const queue = readQueue();
  const owner = currentOutboxOwner();
  const stored: SyncOp = { ...op, id: op.id ?? newOpId(), queuedAt: Date.now(), owner };
  if (op.key) {
    const i = queue.findIndex((q) => q.key === op.key && q.owner === owner);
    if (i >= 0) {
      const prev = queue[i]!;
      const merged: SyncOp =
        op.coalesce === 'merge' && prev.method === op.method
          ? { ...stored, body: { ...prev.body, ...op.body } }
          : stored;
      // Keep the queue position of the first op so replay order still
      // follows the order the user acted in.
      queue[i] = merged;
      writeQueue(queue);
      return merged;
    }
  }
  queue.push(stored);
  writeQueue(queue);
  return stored;
}

export function peekSyncOutbox(): SyncOp[] {
  return readQueue();
}

export function removeSyncOp(id: string): void {
  writeQueue(readQueue().filter((op) => op.id !== id));
}

export function clearSyncOutbox(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** No response at all: offline, DNS, timeout. A 4xx/5xx is a real answer. */
export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response;
}

function send(op: SyncOp) {
  return api.request({
    method: op.method,
    url: op.url,
    data: op.body,
    headers: { 'X-Client-Op-Id': op.id },
  });
}

/**
 * Sends a write now. If the network is unreachable it is queued and
 * OfflineQueuedError is thrown, so the mutation keeps its optimistic state.
 * If something for the same key is already queued, the write joins the queue
 * instead of overtaking it.
 */
export async function sendOrQueue<T = unknown>(op: NewSyncOp): Promise<T> {
  const owner = currentOutboxOwner();
  if (op.key && readQueue().some((q) => q.key === op.key && q.owner === owner)) {
    enqueueSyncOp(op);
    scheduleReplay();
    throw new OfflineQueuedError();
  }
  const pending: SyncOp = { ...op, id: newOpId(), queuedAt: Date.now() };
  try {
    const res = await send(pending);
    return res.data as T;
  } catch (err) {
    if (isNetworkError(err)) {
      enqueueSyncOp(pending);
      scheduleReplay();
      throw new OfflineQueuedError();
    }
    throw err;
  }
}

const QUERY_ROOTS: Record<SyncTracker, string[][]> = {
  fasting: [['fasting']],
  quran: [['quran']],
  cycle: [['cycle']],
};

let replaying = false;
/** The app's QueryClient, remembered from the first replay (App.tsx). */
let boundQc: QueryClient | undefined;
let replayTimer: ReturnType<typeof setTimeout> | undefined;

/** Retry soon when the browser believes it is online (a blip, or a queue
 * that a server error held back); offline, the 'online' event does it. */
function scheduleReplay(delayMs = 5_000): void {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  clearTimeout(replayTimer);
  replayTimer = setTimeout(() => void replaySyncOutbox(boundQc), delayMs);
}

/**
 * Replays the queue in order. Stops at the first op the network still
 * cannot deliver (or one the server reports in progress) and leaves it and
 * everything after it for the next attempt. An op the server REJECTS (4xx)
 * is dropped: replaying it can never succeed, and it must not block the rest.
 * Returns the number of ops delivered.
 */
export async function replaySyncOutbox(qc?: QueryClient): Promise<number> {
  if (qc) boundQc = qc;
  if (replaying) return 0;
  replaying = true;
  let delivered = 0;
  const touched = new Set<SyncTracker>();
  try {
    for (const op of readQueue()) {
      const ownership = outboxOpOwnership(op.owner);
      if (ownership === 'wait') continue;
      if (ownership === 'foreign') {
        removeSyncOp(op.id);
        continue;
      }
      try {
        await send(op);
        delivered++;
        touched.add(op.tracker);
        removeSyncOp(op.id);
      } catch (err) {
        if (isNetworkError(err)) break;
        const status = axios.isAxiosError(err) ? err.response?.status : undefined;
        if (status === 409 || (status !== undefined && status >= 500)) {
          scheduleReplay(30_000);
          break;
        }
        console.warn(`Offline ${op.tracker} change was rejected (${status}); dropped`);
        touched.add(op.tracker);
        removeSyncOp(op.id);
      }
    }
  } finally {
    replaying = false;
  }
  const client = qc ?? boundQc;
  if (client) {
    for (const t of touched) {
      for (const queryKey of QUERY_ROOTS[t]) void client.invalidateQueries({ queryKey });
    }
  }
  return delivered;
}
