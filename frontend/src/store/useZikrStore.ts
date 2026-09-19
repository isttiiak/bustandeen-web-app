import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getUserTimezoneOffset } from '../utils/timezone.js';
import { getTrackingDay, getTrackingDayMiddayTs } from '../utils/trackingDay.js';
import { API_BASE, getIdToken } from '../lib/api.js';

const FLUSH_DELAY = 800; // ms
const RETRY_DELAY = 20_000; // ms: retry a failed flush without waiting for another tap
let retryTimer: ReturnType<typeof setTimeout> | undefined;

// Timezone offset is stable for the whole session — compute once.
const SESSION_TZ_OFFSET = getUserTimezoneOffset();

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
      total: 0,
      isFlushing: false,
      lastResetDate: null,
      customMeanings: {},

      checkAndResetIfNewDay: () => {
        const today = getTrackingDay();
        const lastReset = get().lastResetDate;
        if (lastReset !== today) {
          set({ counts: {}, pending: {}, untimed: {}, tapSpan: {}, lastResetDate: today });
        }
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

      resetAll: () =>
        set({
          counts: {},
          pending: {},
          untimed: {},
          tapSpan: {},
          lifetimeTotals: {},
          total: 0,
          selected: 'SubhanAllah',
          types: ['SubhanAllah', 'Alhamdulillah', 'Allahu Akbar', 'La ilaha illallah'],
          customMeanings: {},
        }),

      hydrate: async () => {
        get().checkAndResetIfNewDay();
        const idToken = await getIdToken();
        if (!idToken) return;
        try {
          const tzOffset = get().timezoneOffset ?? SESSION_TZ_OFFSET;
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
          // Local unflushed pending deltas are layered on top.
          if (data.today?.perType) {
            const pending = get().pending;
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

        // Snapshot pending at this moment — any taps during the request stay safe
        const snapshot = { ...get().pending };
        const untimedSnap = { ...get().untimed };
        const spanSnap = { ...get().tapSpan };
        const entries = Object.entries(snapshot).filter(([, a]) => a !== 0);
        if (!entries.length) return;

        // During page unload there's no time for Firebase's async token
        // refresh (`getIdToken()`) to complete before the page is torn
        // down — read the last cached token synchronously instead.
        const idToken = opts?.keepalive
          ? localStorage.getItem('bustandeen_idToken')
          : await getIdToken();
        if (!idToken) return;

        const resolvedOffset = get().timezoneOffset ?? SESSION_TZ_OFFSET;
        // Anchor every increment INSIDE the current tracking day (midday ts):
        // with the Fajr boundary, a 1 AM tap belongs to the CLOSING day's
        // bucket — Date.now() would land it in the next civil day.
        const anchorTs = getTrackingDayMiddayTs();
        const flushedAt = Date.now();
        const payload = entries.map(([zikrType, amount]) => {
          const span = spanSnap[zikrType];
          return {
            zikrType,
            amount,
            ts: anchorTs,
            // Real wall-clock moment of the LAST tap (for time-of-day/session
            // analytics): `ts` above is anchored to the tracking day's midday
            // and can't tell us when during the day this actually happened.
            // Not the flush time, since a retry after being offline, or a
            // debounced flush after a long run of taps, would misplace it.
            realTs: Math.min(span?.last ?? flushedAt, flushedAt),
            startTs: span?.first,
            untimedAmount: untimedSnap[zikrType] ?? 0,
            timezoneOffset: resolvedOffset,
          };
        });

        set({ isFlushing: true });
        try {
          const res = await fetch(`${API_BASE}/api/zikr/increment/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({
              increments: payload,
              timezoneOffset: resolvedOffset,
              today: getTrackingDay(),
            }),
            // Lets the request survive page unload — a plain fetch would be
            // cancelled the instant the tab closes/navigates away.
            keepalive: opts?.keepalive,
          });

          if (!res.ok) {
            // Keep pending intact — counts will be retried on next flush
            console.warn(`Batch flush returned ${res.status} — pending preserved for retry`);
            scheduleRetry();
            return;
          }

          // Only subtract the amounts we confirmed were saved (not everything —
          // user may have tapped during the request). No clamping: pending can
          // legitimately be negative (queued decrements).
          set((s) => {
            const newPending = { ...s.pending };
            const newUntimed = { ...s.untimed };
            const newSpan = { ...s.tapSpan };
            for (const [type, amount] of entries) {
              newPending[type] = (newPending[type] ?? 0) - amount;
              newUntimed[type] = (newUntimed[type] ?? 0) - (untimedSnap[type] ?? 0);
              // Keep the span only if more taps arrived while the request was
              // in flight; those start where the flushed run ended.
              const flushedLast = spanSnap[type]?.last;
              const cur = newSpan[type];
              if (cur && flushedLast !== undefined && cur.last > flushedLast) {
                newSpan[type] = { first: cur.last, last: cur.last };
              } else {
                delete newSpan[type];
              }
            }
            // A type whose taps and corrections cancelled out (pending 0) has
            // nothing left to time.
            for (const type of Object.keys(newSpan)) {
              if (!newPending[type]) delete newSpan[type];
            }
            return { pending: newPending, untimed: newUntimed, tapSpan: newSpan };
          });
        } catch (e) {
          console.error('Flush error — pending preserved:', e);
          scheduleRetry();
        } finally {
          set({ isFlushing: false });
        }
      },
    }),
    {
      name: 'bustandeen_zikr_store',
      storage: debouncedStorage,
      partialize: (state) => ({
        selected: state.selected,
        types: state.types,
        counts: state.counts,
        lifetimeTotals: state.lifetimeTotals,
        pending: state.pending,
        untimed: state.untimed,
        tapSpan: state.tapSpan,
        total: state.total,
        lastResetDate: state.lastResetDate,
        customMeanings: state.customMeanings,
      }),
    }
  )
);
