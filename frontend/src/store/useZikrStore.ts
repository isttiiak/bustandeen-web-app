import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getUserTimezoneOffset } from '../utils/timezone.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { addDaysYmd, placeNoonTs } from '../utils/placeClock.js';
import { API_BASE, getIdToken } from '../lib/api.js';
import { newOpId, peekSyncOutbox } from '../utils/syncOutbox.js';
import { currentOutboxOwner } from '../utils/outboxOwner.js';
import { todaysLoggedCounts } from '../utils/zikrLog.js';
import { isDeviceDateError, notifyDeviceDateWrong } from '../utils/deviceDate.js';
import toast from 'react-hot-toast';
import i18n from '../i18n.js';
import {
  UNSENT_PREFIX,
  hasLooseTaps,
  holdTabLock,
  isEmptyRecord,
  isSoloTab,
  orphanKeys,
  ownUnsentKey,
  parseUnsentRecord,
  toUnsentRecord,
  withAdoptionLock,
  type UnsentRecord,
} from './zikrUnsent.js';

const FLUSH_DELAY = 800; // ms
const RETRY_DELAY = 20_000; // ms: retry a failed flush without waiting for another tap
let retryTimer: ReturnType<typeof setTimeout> | undefined;

// Debounce localStorage writes so rapid tapping doesn't block the main thread.
// Reads are always synchronous (needed for hydration on mount).
const PERSIST_DEBOUNCE_MS = 400;
const _persistTimers: Record<string, ReturnType<typeof setTimeout>> = {};
const _pendingWrites: Record<string, string> = {};
const rawDebouncedStorage = {
  getItem: (name: string) => localStorage.getItem(name),
  setItem: (name: string, value: string) => {
    clearTimeout(_persistTimers[name]);
    _pendingWrites[name] = value;
    _persistTimers[name] = setTimeout(() => {
      localStorage.setItem(name, value);
      delete _pendingWrites[name];
    }, PERSIST_DEBOUNCE_MS);
  },
  removeItem: (name: string) => {
    clearTimeout(_persistTimers[name]);
    delete _pendingWrites[name];
    localStorage.removeItem(name);
  },
};
const debouncedStorage = createJSONStorage(() => rawDebouncedStorage);

// Forces any debounced-but-not-yet-written localStorage save to happen
// immediately. Call this before the page can be torn down (tab close,
// navigation away) — otherwise a save queued inside the 400ms debounce
// window is lost, along with whatever `pending` zikr counts it held.
export function flushZikrLocalPersistence() {
  for (const name of Object.keys(_persistTimers)) {
    clearTimeout(_persistTimers[name]);
    const value = _pendingWrites[name];
    if (value !== undefined) {
      localStorage.setItem(name, value);
      delete _pendingWrites[name];
    }
  }
}

export interface CustomMeaning {
  /** Compact Arabic shown on the counter card */
  arabic?: string;
  /** Compact meaning shown on the counter card */
  meaning: string;
  /** Romanised pronunciation, shown under the Arabic on the card and in the
   * expandable reference. Optional — older custom entries simply lack it. */
  transliteration?: string;
  /** Complete Arabic text — the expandable reference card shows this */
  fullArabic?: string;
  /** Complete meaning for the expandable reference card */
  fullMeaning?: string;
  source?: string;
  sourceUrl?: string;
  grade?: string;
  virtue?: string;
}

interface ZikrInflight {
  opId: string;
  body: string;
}

/** Counts not yet confirmed by the server, per type: the pending taps plus an
 * unsent batch (when it belongs to the current tracking day), plus "Log
 * counts" entries for today still waiting in the offline outbox (U4). */
export function unsyncedCounts(state: {
  pending: Record<string, number>;
  inflight: ZikrInflight | null;
}): Record<string, number> {
  const out: Record<string, number> = { ...state.pending };
  if (state.inflight) {
    try {
      const body = JSON.parse(state.inflight.body) as {
        today?: string;
        increments?: { zikrType: string; amount: number }[];
      };
      if (body.today === getTrackingDay()) {
        for (const inc of body.increments ?? []) {
          out[inc.zikrType] = (out[inc.zikrType] ?? 0) + inc.amount;
        }
      }
    } catch {
      /* unreadable batch: nothing to add */
    }
  }
  const owner = currentOutboxOwner();
  const queuedLogs = peekSyncOutbox()
    .filter((op) => op.tracker === 'zikr' && op.owner === owner)
    .map((op) => op.body);
  for (const [type, amount] of Object.entries(todaysLoggedCounts(queuedLogs))) {
    out[type] = (out[type] ?? 0) + amount;
  }
  return out;
}

interface ZikrState {
  types: string[];
  selected: string;
  counts: Record<string, number>;
  lifetimeTotals: Record<string, number>;
  pending: Record<string, number>;
  /** Portion of `pending` that was NOT tapped in real time (salat-tracker
   * tasbih, set-count corrections). Counted in totals, never logged as a
   * timed session. Negative when such a count was reversed. */
  untimed: Record<string, number>;
  /** Real clock time of the first/last tap in the current pending batch, per
   * type, so a debounced flush (or a retry after being offline) still records
   * when the counting actually happened, not when the request finally went out. */
  tapSpan: Record<string, { first: number; last: number }>;
  /** The batch currently being sent, already taken out of `pending`. It keeps
   * one op id across retries so the server applies it once even if a response
   * is lost (audit T2.3), and keeps the day it was counted in. Persisted. */
  inflight: ZikrInflight | null;
  total: number;
  isFlushing: boolean;
  lastResetDate: string | null;
  timezoneOffset?: number;
  customMeanings: Record<string, CustomMeaning>;
  _flushTimer?: ReturnType<typeof setTimeout>;

  checkAndResetIfNewDay: () => void;
  setTypes: (types: string[]) => void;
  replaceTypes: (types: string[]) => void;
  removeType: (name: string) => void;
  renameType: (oldName: string, newName: string) => void;
  selectType: (selected: string) => void;
  setCustomMeaning: (name: string, data: CustomMeaning) => void;
  resetAll: () => void;
  hydrate: () => Promise<void>;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  addConfirmedCounts: (type: string, amount: number) => void;
  addCounts: (entries: Record<string, number>) => void;
  scheduleFlush: () => void;
  flush: (opts?: { keepalive?: boolean }) => Promise<void>;
}

type BatchBody = {
  increments?: {
    zikrType: string;
    amount: number;
    realTs?: number;
    startTs?: number;
    untimedAmount?: number;
  }[];
};

function readBatch(batch: ZikrInflight): BatchBody['increments'] {
  try {
    return (JSON.parse(batch.body) as BatchBody).increments ?? [];
  } catch {
    return [];
  }
}

/**
 * One batch from `entries` (type, amount pairs, none zero), counted as `day`.
 * Anchored INSIDE the tracking day (midday ts): with the Fajr boundary, a 1 AM
 * tap belongs to the CLOSING day's bucket, and Date.now() would land it in the
 * next civil day.
 */
function buildBatch(
  day: string,
  entries: [string, number][],
  untimedSnap: Record<string, number>,
  spanSnap: Record<string, { first: number; last: number }>,
  timezoneOffset: number | undefined
): ZikrInflight {
  const resolvedOffset = timezoneOffset ?? getUserTimezoneOffset();
  const anchorTs = placeNoonTs(day);
  const flushedAt = Date.now();
  const payload = entries.map(([zikrType, amount]) => {
    const span = spanSnap[zikrType];
    return {
      zikrType,
      amount,
      ts: anchorTs,
      // Real wall-clock moment of the LAST tap (for time-of-day/session
      // analytics): `ts` above is anchored to the day's midday and can't tell us
      // when during the day this actually happened. Not the flush time, since a
      // retry after being offline, or a debounced flush after a long run of
      // taps, would misplace it.
      realTs: Math.min(span?.last ?? flushedAt, flushedAt),
      startTs: span?.first,
      untimedAmount: untimedSnap[zikrType] ?? 0,
      timezoneOffset: resolvedOffset,
    };
  });
  return {
    opId: newOpId(),
    body: JSON.stringify({ increments: payload, timezoneOffset: resolvedOffset, today: day }),
  };
}

/**
 * Take everything in `pending` out of it and into a new in-flight batch
 * counted as `day` (a tracking day, YYYY-MM-DD). Returns null when nothing is
 * pending. The batch is written to localStorage before it can be sent
 * (audit P1-3), and taps from here on start a new batch.
 */
function stageBatch(day: string): ZikrInflight | null {
  const { pending, untimed, tapSpan, timezoneOffset } = useZikrStore.getState();
  const snapshot = { ...pending };
  const untimedSnap = { ...untimed };
  const spanSnap = { ...tapSpan };
  const entries = Object.entries(snapshot).filter(([, a]) => a !== 0);
  if (!entries.length) return null;

  const batch = buildBatch(day, entries, untimedSnap, spanSnap, timezoneOffset);
  // Move the batch out of `pending` (no clamping: pending can be negative, i.e.
  // queued decrements). Taps from here on start a new batch; a day rollover
  // cannot touch this one.
  useZikrStore.setState((s) => {
    const newPending = { ...s.pending };
    const newUntimed = { ...s.untimed };
    const newSpan = { ...s.tapSpan };
    for (const [type, amount] of entries) {
      newPending[type] = (newPending[type] ?? 0) - amount;
      newUntimed[type] = (newUntimed[type] ?? 0) - (untimedSnap[type] ?? 0);
      // Keep the span only if more taps arrived after the snapshot; those
      // start where the batched run ended.
      const batchedLast = spanSnap[type]?.last;
      const cur = newSpan[type];
      if (cur && batchedLast !== undefined && cur.last > batchedLast) {
        newSpan[type] = { first: cur.last, last: cur.last };
      } else {
        delete newSpan[type];
      }
    }
    for (const type of Object.keys(newPending)) {
      if (!newPending[type]) delete newPending[type];
    }
    for (const type of Object.keys(newSpan)) {
      if (!newPending[type]) delete newSpan[type];
    }
    return { pending: newPending, untimed: newUntimed, tapSpan: newSpan, inflight: batch };
  });
  // Write the new batch (with its op id) to localStorage NOW, before the request
  // leaves. The normal save is debounced 400 ms, and on tab close the old state
  // (taps still in `pending`) was forced out first. If the page then died after
  // the request was delivered, the next load found the taps in `pending` with no
  // op id and sent them again under a new one, so the server counted them twice
  // (audit P1-3). With the batch saved here, a reload resends it under the SAME
  // op id and the server recognises the repeat.
  flushZikrLocalPersistence();
  return batch;
}

/** Put a refused batch back into `pending`, added to whatever was tapped since. */
function restoreBatchToPending(batch: ZikrInflight): void {
  const incs = readBatch(batch) ?? [];
  useZikrStore.setState((s) => {
    const pending = { ...s.pending };
    const untimed = { ...s.untimed };
    const tapSpan = { ...s.tapSpan };
    for (const inc of incs) {
      pending[inc.zikrType] = (pending[inc.zikrType] ?? 0) + inc.amount;
      if (inc.untimedAmount) {
        untimed[inc.zikrType] = (untimed[inc.zikrType] ?? 0) + inc.untimedAmount;
      }
      if (inc.realTs !== undefined) {
        const first = inc.startTs ?? inc.realTs;
        const cur = tapSpan[inc.zikrType];
        tapSpan[inc.zikrType] = {
          first: cur ? Math.min(cur.first, first) : first,
          last: cur ? Math.max(cur.last, inc.realTs) : inc.realTs,
        };
      }
    }
    for (const type of Object.keys(pending)) {
      if (!pending[type]) delete pending[type];
    }
    return {
      pending,
      untimed,
      tapSpan,
      inflight: s.inflight?.opId === batch.opId ? null : s.inflight,
    };
  });
  flushZikrLocalPersistence();
}

/** A refused batch that cannot be kept: tell the person how much was lost. */
function notifyBatchDropped(batch: ZikrInflight): void {
  const n = (readBatch(batch) ?? []).reduce((sum, inc) => sum + Math.abs(inc.amount), 0);
  toast.error(
    i18n.t('common.zikrBatchDropped', {
      n,
      defaultValue: '{{n}} zikr counts could not be saved. You can add them again with Log counts.',
    }),
    { id: 'zikr-batch-dropped', duration: 9000 }
  );
}

export const useZikrStore = create<ZikrState>()(
  persist(
    (set, get) => ({
      types: ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar', 'La ilaha illallah'],
      selected: 'SubhanAllah',
      counts: {},
      lifetimeTotals: {},
      pending: {},
      untimed: {},
      tapSpan: {},
      inflight: null,
      total: 0,
      isFlushing: false,
      lastResetDate: null,
      customMeanings: {},

      checkAndResetIfNewDay: () => {
        const today = getTrackingDay();
        const lastReset = get().lastResetDate;
        if (lastReset === today) return;
        // Taps not yet sent belong to the day that just closed: send them as
        // that day instead of throwing them away (audit P1-4). The oldest day
        // the server takes is yesterday, so a longer gap files under yesterday.
        let staged = false;
        if (lastReset && !get().inflight) {
          const yesterday = addDaysYmd(today, -1);
          staged = stageBatch(lastReset < yesterday ? yesterday : lastReset) !== null;
        }
        // Staged: pending already moved into the batch, so only the day's
        // display counts reset. Not staged because an earlier batch is still
        // stuck (only one batch can wait): the taps carry into the new day,
        // one day off rather than lost.
        set({ counts: {}, lastResetDate: today });
        if (staged) void get().flush();
      },

      setTypes: (types) => set({ types }),

      replaceTypes: (types) =>
        set({
          types,
          counts: {},
          pending: {},
          untimed: {},
          tapSpan: {},
          selected: types[0] ?? 'SubhanAllah',
        }),

      removeType: (name) =>
        set((s) => {
          const types = s.types.filter((t) => t !== name);
          const customMeanings = { ...s.customMeanings };
          delete customMeanings[name];
          const selected = s.selected === name ? (types[0] ?? 'SubhanAllah') : s.selected;
          return { types, customMeanings, selected };
        }),

      // Rename in place: list entry, today's counts, pending deltas and the
      // stored meaning all move to the new key (server migration is separate).
      renameType: (oldName, newName) =>
        set((s) => {
          const types = s.types.map((t) => (t === oldName ? newName : t));
          const move = <T>(rec: Record<string, T>): Record<string, T> => {
            if (!(oldName in rec)) return rec;
            const next = { ...rec };
            const v = next[oldName];
            delete next[oldName];
            if (v !== undefined) next[newName] = v;
            return next;
          };
          return {
            types,
            counts: move(s.counts),
            pending: move(s.pending),
            untimed: move(s.untimed),
            tapSpan: move(s.tapSpan),
            lifetimeTotals: move(s.lifetimeTotals),
            customMeanings: move(s.customMeanings),
            selected: s.selected === oldName ? newName : s.selected,
          };
        }),

      selectType: (selected) => set({ selected }),

      setCustomMeaning: (name, data) =>
        set((s) => ({ customMeanings: { ...s.customMeanings, [name]: data } })),

      resetAll: () => {
        // Sign-out wipes unsent taps; a crashed tab's leftovers must not be sent
        // later under the next account.
        void discardOrphanRecords();
        set({
          counts: {},
          pending: {},
          untimed: {},
          tapSpan: {},
          inflight: null,
          lifetimeTotals: {},
          total: 0,
          selected: 'SubhanAllah',
          types: ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar', 'La ilaha illallah'],
          customMeanings: {},
        });
      },

      hydrate: async () => {
        get().checkAndResetIfNewDay();
        const idToken = await getIdToken();
        if (!idToken) return;
        try {
          const tzOffset = get().timezoneOffset ?? getUserTimezoneOffset();
          const res = await fetch(
            `${API_BASE}/api/zikr/summary?timezoneOffset=${tzOffset}&today=${getTrackingDay()}`,
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
          if (!res.ok) return;
          const data = (await res.json()) as {
            totalCount?: number;
            perType?: Array<{ zikrType: string; total: number }>;
            types?: Array<{ name: string } | string>;
            today?: { total: number; perType: Record<string, number> };
          };
          const lt = (data.perType ?? []).reduce<Record<string, number>>((acc, t) => {
            acc[t.zikrType] = t.total;
            return acc;
          }, {});
          set({ total: data.totalCount ?? 0, lifetimeTotals: lt });
          // Sync TODAY's counts from the DB so every browser/device agrees.
          // Local unconfirmed deltas (pending + an unsent batch) are layered on top.
          if (data.today?.perType) {
            const pending = unsyncedCounts(get());
            const counts: Record<string, number> = {};
            const typeNames = new Set([
              ...Object.keys(data.today.perType),
              ...Object.keys(pending),
            ]);
            for (const t of typeNames) {
              counts[t] = Math.max(0, (data.today.perType[t] ?? 0) + (pending[t] ?? 0));
            }
            set({ counts, lastResetDate: getTrackingDay() });
          }
          if (Array.isArray(data.types) && data.types.length) {
            const serverNames = data.types
              .map((t) => (typeof t === 'object' ? t.name : t))
              .filter(Boolean) as string[];
            const merged = [...new Set([...(get().types ?? []), ...serverNames])];
            const currentSelected = get().selected;
            set({ types: merged });
            if (!merged.includes(currentSelected)) set({ selected: merged[0] });
          }
        } catch (e) {
          console.error(e);
        }
      },

      increment: () => {
        // checkAndResetIfNewDay is intentionally NOT called here — App.tsx handles it on
        // mount/focus/visibility. Calling it on every tap added unnecessary work per count.
        set((s) => {
          const type = s.selected;
          const now = Date.now();
          const span = s.tapSpan[type];
          return {
            tapSpan: { ...s.tapSpan, [type]: { first: span?.first ?? now, last: now } },
            counts: { ...s.counts, [type]: (s.counts[type] ?? 0) + 1 },
            lifetimeTotals: { ...s.lifetimeTotals, [type]: (s.lifetimeTotals[type] ?? 0) + 1 },
            pending: { ...s.pending, [type]: (s.pending[type] ?? 0) + 1 },
            total: s.total + 1,
          };
        });
      },

      decrement: () =>
        set((s) => {
          const type = s.selected;
          const current = s.counts[type] ?? 0;
          if (current <= 0) return {};
          return {
            counts: { ...s.counts, [type]: current - 1 },
            lifetimeTotals: {
              ...s.lifetimeTotals,
              [type]: Math.max(0, (s.lifetimeTotals[type] ?? 0) - 1),
            },
            // Pending may go NEGATIVE — that's how a decrement of an
            // already-flushed count reaches the server (clamping at 0 here
            // silently dropped the minus button's effect on the DB).
            pending: { ...s.pending, [type]: (s.pending[type] ?? 0) - 1 },
            total: Math.max(0, s.total - 1),
          };
        }),

      // Reset clears only this session's local count — server-confirmed data in analytics is unaffected
      reset: () =>
        set((s) => {
          const cleared = s.counts[s.selected] ?? 0;
          return {
            counts: { ...s.counts, [s.selected]: 0 },
            pending: { ...s.pending, [s.selected]: 0 },
            untimed: { ...s.untimed, [s.selected]: 0 },
            tapSpan: Object.fromEntries(
              Object.entries(s.tapSpan).filter(([k]) => k !== s.selected)
            ),
            total: Math.max(0, s.total - cleared),
          };
        }),

      // Used after manual API-confirmed entry — updates local counts without touching pending
      addConfirmedCounts: (type, amount) =>
        set((s) => ({
          counts: { ...s.counts, [type]: (s.counts[type] ?? 0) + amount },
          lifetimeTotals: { ...s.lifetimeTotals, [type]: (s.lifetimeTotals[type] ?? 0) + amount },
          total: s.total + amount,
        })),

      // Add (or, with negative amounts, subtract) counts across SEVERAL dhikr
      // at once — the salat tracker's tasbīḥ wiring posts 33/33/34 in one go
      // and reverses the exact same amounts when the tag is un-tapped.
      // Routed through `pending` so the existing debounced batch flush syncs
      // it; day counts clamp at 0 and only the APPLIED delta is queued, which
      // keeps lifetime totals and the server in step.
      addCounts: (entries) =>
        set((s) => {
          const counts = { ...s.counts };
          const lifetimeTotals = { ...s.lifetimeTotals };
          const pending = { ...s.pending };
          const untimed = { ...s.untimed };
          let total = s.total;
          for (const [type, amount] of Object.entries(entries)) {
            if (!amount) continue;
            const before = counts[type] ?? 0;
            const after = Math.max(0, before + amount);
            const applied = after - before;
            if (!applied) continue;
            counts[type] = after;
            lifetimeTotals[type] = Math.max(0, (lifetimeTotals[type] ?? 0) + applied);
            pending[type] = (pending[type] ?? 0) + applied;
            // Everything added through here is automatic/corrective (salat
            // tasbih, "set count"), so it must not show up as a zikr session.
            untimed[type] = (untimed[type] ?? 0) + applied;
            total = Math.max(0, total + applied);
          }
          return { counts, lifetimeTotals, pending, untimed, total };
        }),

      scheduleFlush: () => {
        clearTimeout(get()._flushTimer);
        clearTimeout(retryTimer);
        const t = setTimeout(() => void get().flush(), FLUSH_DELAY);
        set({ _flushTimer: t });
      },

      flush: async (opts) => {
        const scheduleRetry = () => {
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => void get().flush(), RETRY_DELAY);
        };
        // Prevent concurrent flushes
        if (get().isFlushing) return;

        // During page unload there's no time for Firebase's async token
        // refresh (`getIdToken()`) to complete before the page is torn
        // down — read the last cached token synchronously instead.
        const idToken = opts?.keepalive
          ? localStorage.getItem('bustandeen_idToken')
          : await getIdToken();
        if (!idToken) return;

        // A batch from an earlier attempt goes first, unchanged (same op id,
        // same day), so the server can recognise a repeat.
        let batch = get().inflight;
        if (!batch) {
          batch = stageBatch(getTrackingDay());
          if (!batch) return;
        }

        set({ isFlushing: true });
        let delivered = false;
        let keepIdle = false; // refused for the device date: do not resend until the next tap
        try {
          const res = await fetch(`${API_BASE}/api/zikr/increment/batch`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
              'X-Client-Op-Id': batch.opId,
            },
            body: batch.body,
            // Lets the request survive page unload — a plain fetch would be
            // cancelled the instant the tab closes/navigates away.
            keepalive: opts?.keepalive,
          });

          if (res.ok) {
            delivered = true;
          } else if (res.status === 400) {
            // The server will never accept this batch as it is; holding it would
            // block every later count. Say so, never drop it silently (P1-4).
            let refusal: unknown = null;
            try {
              refusal = await res.clone().json();
            } catch {
              /* not JSON: treated as any other refusal */
            }
            if (isDeviceDateError(refusal)) {
              // A wrong device date is the one rejection the person can fix, and
              // the batch carries that wrong day. Hand the taps back to `pending`
              // so they are sent as the right day once the clock is set. No
              // retry timer: the next tap tries again, and the clock may still
              // be wrong.
              console.warn('Zikr batch refused: device date is wrong — taps kept');
              restoreBatchToPending(batch);
              notifyDeviceDateWrong();
              keepIdle = true;
            } else {
              console.warn('Zikr batch rejected (400) — dropped');
              notifyBatchDropped(batch);
            }
            delivered = true;
          } else {
            // 401/409/429/5xx: keep the batch (same op id) and try again.
            console.warn(`Batch flush returned ${res.status} — batch kept for retry`);
            scheduleRetry();
          }
        } catch (e) {
          console.error('Flush error — batch kept for retry:', e);
          scheduleRetry();
        } finally {
          set({ isFlushing: false });
        }

        if (delivered) {
          set((s) => (s.inflight?.opId === batch.opId ? { inflight: null } : {}));
          // A closed tab's batch waited for this one to clear.
          if (orphanBatchWaiting) void adoptUnsentRecords();
          // Taps made while this batch was in the air go out next.
          if (!keepIdle && !opts?.keepalive && Object.values(get().pending).some((a) => a !== 0)) {
            void get().flush();
          }
        }
      },
    }),
    {
      name: 'bustandeen_zikr_store',
      storage: debouncedStorage,
      // Display state only. The unsent taps (pending, untimed, tapSpan, inflight)
      // are kept per tab in their own record (zikrUnsent.ts, audit P1-16b), so a
      // second tab can neither copy nor overwrite them.
      partialize: (state) => ({
        selected: state.selected,
        types: state.types,
        counts: state.counts,
        lifetimeTotals: state.lifetimeTotals,
        total: state.total,
        lastResetDate: state.lastResetDate,
        customMeanings: state.customMeanings,
      }),
      // A record saved by an older version still holds the unsent fields. Do not
      // load them here: adoptUnsentRecords() takes them over exactly once, under
      // the cross-tab lock, so two tabs opened after the update cannot both send
      // the same old batch.
      merge: (persisted, current) => {
        const display = { ...((persisted ?? {}) as Partial<ZikrState>) };
        delete display.pending;
        delete display.untimed;
        delete display.tapSpan;
        delete display.inflight;
        return { ...current, ...display };
      },
    }
  )
);

// ---------------------------------------------------------------------------
// Per-tab unsent taps (audit 2026-11-16 P1-16b). See zikrUnsent.ts.
// ---------------------------------------------------------------------------

const LEGACY_KEY = 'bustandeen_zikr_store';
const ADOPT_EVERY = 30_000; // ms: look for a closed tab's leftovers
/** Records are written only once this tab's lock is held (see holdTabLock). A
 * single-record (solo) tab waits for its first adoption pass as well. */
let recordsLive = false;
/** A closed tab's batch is waiting for this tab's own batch to clear. */
let orphanBatchWaiting = false;

function snapshotRecord(s: ZikrState): UnsentRecord {
  return {
    pending: s.pending,
    untimed: s.untimed,
    tapSpan: s.tapSpan,
    inflight: s.inflight,
    day: s.lastResetDate,
  };
}

/** Save (or, when empty, remove) this tab's record. Debounced like the rest. */
function persistUnsent(s: ZikrState): void {
  if (!recordsLive) return;
  const rec = snapshotRecord(s);
  try {
    if (isEmptyRecord(rec)) rawDebouncedStorage.removeItem(ownUnsentKey());
    else rawDebouncedStorage.setItem(ownUnsentKey(), JSON.stringify(rec));
  } catch {
    /* storage full or blocked: the taps stay in memory and are still sent */
  }
}

useZikrStore.subscribe((s, prev) => {
  if (
    s.pending !== prev.pending ||
    s.untimed !== prev.untimed ||
    s.tapSpan !== prev.tapSpan ||
    s.inflight !== prev.inflight ||
    s.lastResetDate !== prev.lastResetDate
  ) {
    persistUnsent(s);
  }
});

/**
 * An older version kept the unsent fields inside the shared record. Move them
 * into a record of their own so they are adopted like any closed tab's.
 */
function moveLegacyUnsent(): void {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } | null;
    const st = parsed?.state;
    if (!st || typeof st !== 'object') return;
    if (!('pending' in st || 'untimed' in st || 'tapSpan' in st || 'inflight' in st)) return;
    const rec = toUnsentRecord({ ...st, day: st.lastResetDate });
    if (rec && !isEmptyRecord(rec)) {
      const id = `legacy-${Date.now().toString(36)}`;
      localStorage.setItem(UNSENT_PREFIX + id, JSON.stringify(rec));
    }
    delete st.pending;
    delete st.untimed;
    delete st.tapSpan;
    delete st.inflight;
    localStorage.setItem(LEGACY_KEY, JSON.stringify(parsed));
  } catch {
    /* unreadable: nothing to move */
  }
}

/** Take over one record whose tab is gone. Runs inside the adoption lock. */
function adoptRecord(key: string): void {
  let rec: UnsentRecord | null;
  try {
    rec = parseUnsentRecord(localStorage.getItem(key));
  } catch {
    return;
  }
  if (!rec) {
    // Not JSON: there is nothing in it to send.
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }

  const s = useZikrStore.getState();
  const today = getTrackingDay();
  const left: UnsentRecord = {
    pending: {},
    untimed: {},
    tapSpan: {},
    inflight: null,
    day: rec.day,
  };
  let inflight = s.inflight;
  let { pending, untimed, tapSpan } = s;

  // A staged batch keeps its op id, so a repeat is recognised by the server.
  // Only one batch can wait here: a second one stays for the next pass.
  if (rec.inflight) {
    if (!inflight) inflight = rec.inflight;
    else left.inflight = rec.inflight;
  }

  if (hasLooseTaps(rec)) {
    if (!rec.day || rec.day >= today) {
      pending = { ...pending };
      untimed = { ...untimed };
      tapSpan = { ...tapSpan };
      for (const [type, amount] of Object.entries(rec.pending)) {
        if (!amount) continue;
        pending[type] = (pending[type] ?? 0) + amount;
        if (rec.untimed[type]) untimed[type] = (untimed[type] ?? 0) + rec.untimed[type]!;
        const span = rec.tapSpan[type];
        if (span) {
          const cur = tapSpan[type];
          tapSpan[type] = {
            first: cur ? Math.min(cur.first, span.first) : span.first,
            last: cur ? Math.max(cur.last, span.last) : span.last,
          };
        }
      }
    } else if (!inflight) {
      // Taps from a day that has closed go out as that day (never today's), the
      // oldest the server takes being yesterday: the same rule as a day rollover.
      const yesterday = addDaysYmd(today, -1);
      const entries = Object.entries(rec.pending).filter(([, a]) => a !== 0);
      inflight = buildBatch(
        rec.day < yesterday ? yesterday : rec.day,
        entries,
        rec.untimed,
        rec.tapSpan,
        s.timezoneOffset
      );
    } else {
      left.pending = rec.pending;
      left.untimed = rec.untimed;
      left.tapSpan = rec.tapSpan;
    }
  }

  useZikrStore.setState({ pending, untimed, tapSpan, inflight });
  // Our record is on disk before the old one is touched, so a crash here at
  // worst leaves the taps in two places, never in none.
  flushZikrLocalPersistence();
  // A single-record (solo) tab takes back its own previous record: it is saved
  // again from memory right after this pass, so there is nothing to clear.
  if (key === ownUnsentKey()) return;
  try {
    if (isEmptyRecord(left)) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(left));
  } catch {
    /* ignore */
  }
  if (!isEmptyRecord(left)) orphanBatchWaiting = true;
}

let firstAdoption = true;

/**
 * Take over the unsent taps of tabs that have closed or crashed (and, once, of
 * an older version's shared record). Safe to call from any tab at any time.
 */
export async function adoptUnsentRecords(): Promise<void> {
  const includeOwn = firstAdoption;
  firstAdoption = false;
  try {
    await withAdoptionLock((live) => {
      orphanBatchWaiting = false;
      moveLegacyUnsent();
      const keys = orphanKeys(live, includeOwn);
      if (!keys.length) return;
      useZikrStore.getState().checkAndResetIfNewDay();
      for (const key of keys) adoptRecord(key);
    });
  } catch (e) {
    console.error('Zikr: could not check for unsent counts of a closed tab', e);
    return;
  }
  const s = useZikrStore.getState();
  if (s.inflight || hasLooseTaps(s)) s.scheduleFlush();
}

/** Sign-out: leftovers of closed tabs are dropped with everything else. */
async function discardOrphanRecords(): Promise<void> {
  try {
    await withAdoptionLock((live) => {
      moveLegacyUnsent();
      for (const key of orphanKeys(live, false)) localStorage.removeItem(key);
    });
  } catch {
    /* nothing to drop */
  }
}

async function startTabRecords(): Promise<void> {
  await holdTabLock();
  if (!isSoloTab()) {
    // Records are written from here on; taps made in the first moments, before
    // the lock was ours, are saved now.
    recordsLive = true;
    persistUnsent(useZikrStore.getState());
  }
  await adoptUnsentRecords();
  if (isSoloTab()) {
    // Only now: saving first would overwrite the previous record, which is
    // what this tab has just taken back.
    recordsLive = true;
    persistUnsent(useZikrStore.getState());
  }
  if (typeof document === 'undefined' || isSoloTab()) return;
  setInterval(() => void adoptUnsentRecords(), ADOPT_EVERY);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void adoptUnsentRecords();
  });
}

void startTabRecords();
