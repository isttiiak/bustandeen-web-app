/**
 * Zikr taps the server has not confirmed yet, kept per browser tab (audit
 * 2026-11-16 P1-16b).
 *
 * They used to live in the one shared `bustandeen_zikr_store` record. Two tabs
 * of the app then loaded and saved the same unsent batch: a tab opened while
 * another still held unsent taps sent them again under a different op id (the
 * server counted them twice), and a stale tab could overwrite the batch the
 * other tab had just staged.
 *
 * Now each tab owns one record (`bustandeen_zikr_unsent:<tab id>`) and is the
 * only one that writes it. A tab holds a Web Lock named after its id for as
 * long as the page lives, so any other tab can tell a live record from the
 * leftovers of a tab that closed or crashed, and take those over. Adoption runs
 * under one shared lock, so two tabs never take the same record. Browsers
 * without Web Locks keep a single fixed record (`solo`), as before.
 */

export interface UnsentRecord {
  pending: Record<string, number>;
  untimed: Record<string, number>;
  tapSpan: Record<string, { first: number; last: number }>;
  /** A batch already staged (and possibly delivered): resent under the same op id. */
  inflight: { opId: string; body: string } | null;
  /** Tracking day the loose taps were counted in (the store's `lastResetDate`). */
  day: string | null;
}

export const UNSENT_PREFIX = 'bustandeen_zikr_unsent:';
const TAB_LOCK_PREFIX = 'bustandeen-zikr-tab-';
const ADOPT_LOCK = 'bustandeen-zikr-adopt';

interface LockManagerLike {
  request(name: string, callback: () => unknown): Promise<unknown>;
  query(): Promise<{ held?: { name?: string }[] }>;
}

function lockManager(): LockManagerLike | null {
  try {
    const l =
      typeof navigator === 'undefined' ? undefined : (navigator as { locks?: unknown }).locks;
    const mgr = l as LockManagerLike | undefined;
    return mgr && typeof mgr.request === 'function' && typeof mgr.query === 'function' ? mgr : null;
  } catch {
    return null;
  }
}

function newTabId(): string {
  try {
    const id = globalThis.crypto?.randomUUID?.();
    if (id) return id;
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

let tabId = lockManager() ? newTabId() : 'solo';
let solo = tabId === 'solo';

export const isSoloTab = () => solo;
export const ownUnsentKey = () => UNSENT_PREFIX + tabId;

/** Any unexpected lock failure: behave like a browser without Web Locks. */
function fallBackToSolo(): void {
  tabId = 'solo';
  solo = true;
}

/**
 * Take this tab's lock and keep it for the life of the page. Resolves once it
 * is held: records are written only after that, so another tab can never see a
 * record whose owner is not yet marked alive.
 */
export function holdTabLock(): Promise<void> {
  const mgr = lockManager();
  if (!mgr || solo) return Promise.resolve();
  return new Promise<void>((resolve) => {
    mgr
      .request(TAB_LOCK_PREFIX + tabId, () => {
        resolve();
        return new Promise<void>(() => {}); // never released: the page's end releases it
      })
      .catch(() => {
        fallBackToSolo();
        resolve();
      });
  });
}

/** Run `fn` while holding the adoption lock, with the ids of every live tab. */
export async function withAdoptionLock(fn: (liveTabIds: Set<string>) => void): Promise<void> {
  const mgr = lockManager();
  if (!mgr || solo) {
    fn(new Set());
    return;
  }
  await mgr.request(ADOPT_LOCK, async () => {
    const live = new Set<string>();
    const snapshot = await mgr.query();
    for (const h of snapshot.held ?? []) {
      if (h.name?.startsWith(TAB_LOCK_PREFIX)) live.add(h.name.slice(TAB_LOCK_PREFIX.length));
    }
    fn(live);
  });
}

function storageKeys(): string[] {
  try {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) out.push(k);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Records whose tab is gone. `includeOwn` is true only on the first pass of a
 * single-record (solo) tab, which takes its previous record back.
 */
export function orphanKeys(live: Set<string>, includeOwn: boolean): string[] {
  const out: string[] = [];
  const candidates = new Set(
    storageKeys()
      .filter((k) => k.startsWith(UNSENT_PREFIX))
      .map((k) => k.slice(UNSENT_PREFIX.length))
  );
  if (solo) candidates.add('solo');
  for (const id of candidates) {
    if (live.has(id)) continue;
    if (id === tabId && !includeOwn) continue;
    const key = UNSENT_PREFIX + id;
    try {
      if (localStorage.getItem(key) !== null) out.push(key);
    } catch {
      /* storage unavailable */
    }
  }
  return out;
}

function numbers(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
    }
  }
  return out;
}

function spans(v: unknown): UnsentRecord['tapSpan'] {
  const out: UnsentRecord['tapSpan'] = {};
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v)) {
      const s = x as { first?: unknown; last?: unknown } | null;
      if (s && typeof s.first === 'number' && typeof s.last === 'number') {
        out[k] = { first: s.first, last: s.last };
      }
    }
  }
  return out;
}

/** Reads a stored record defensively. Returns null when it is not JSON at all. */
export function toUnsentRecord(value: unknown): UnsentRecord | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  const f = o.inflight as { opId?: unknown; body?: unknown } | null | undefined;
  return {
    pending: numbers(o.pending),
    untimed: numbers(o.untimed),
    tapSpan: spans(o.tapSpan),
    inflight:
      f && typeof f.opId === 'string' && typeof f.body === 'string'
        ? { opId: f.opId, body: f.body }
        : null,
    day: typeof o.day === 'string' ? o.day : null,
  };
}

export function parseUnsentRecord(raw: string | null): UnsentRecord | null {
  if (raw === null) return null;
  try {
    return toUnsentRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export const hasLooseTaps = (rec: Pick<UnsentRecord, 'pending'>): boolean =>
  Object.values(rec.pending).some((a) => a !== 0);

/** Nothing worth keeping: no staged batch and no loose taps. */
export const isEmptyRecord = (rec: UnsentRecord): boolean => !rec.inflight && !hasLooseTaps(rec);
