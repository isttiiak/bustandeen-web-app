// Zikr quick chips on Home (T3.4 E, Istiak 2026-10-09). Three dhikr chosen
// in Zikr settings, each with a number. What one tap does is also a setting:
// open the counter on that dhikr with the number as its target (default), or
// add the number at once. Synced across devices.

export const ZIKR_QUICK_KEY = 'bustandeen_zikr_quick';
export const ZIKR_QUICK_ACTION_KEY = 'bustandeen_zikr_quick_action';

export interface QuickZikr {
  /** The counter's dhikr name (its key in the zikr store). */
  name: string;
  count: number;
}

export type QuickAction = 'open' | 'add';

export const QUICK_SLOTS = 3;
export const QUICK_MAX_COUNT = 1000;

/** Default: istighfār, tahlīl and ṣalawāt, 100 each. */
export const DEFAULT_QUICK_ZIKR: QuickZikr[] = [
  { name: 'Astaghfirullah', count: 100 },
  { name: 'La ilaha illallah', count: 100 },
  { name: 'Durud Ibrahim', count: 100 },
];

const validCount = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= QUICK_MAX_COUNT;

/** The three chips; any bad or missing slot falls back to its default. */
export function getQuickZikr(): QuickZikr[] {
  let saved: unknown[] = [];
  try {
    const raw = localStorage.getItem(ZIKR_QUICK_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (Array.isArray(parsed)) saved = parsed;
  } catch {
    /* corrupt: defaults */
  }
  return DEFAULT_QUICK_ZIKR.map((fallback, i) => {
    const s = saved[i] as Partial<QuickZikr> | undefined;
    return s && typeof s.name === 'string' && s.name.trim() && validCount(s.count)
      ? { name: s.name, count: s.count }
      : fallback;
  });
}

export function setQuickZikr(chips: QuickZikr[]): void {
  try {
    localStorage.setItem(ZIKR_QUICK_KEY, JSON.stringify(chips.slice(0, QUICK_SLOTS)));
  } catch {
    /* private mode */
  }
}

export function getQuickAction(): QuickAction {
  try {
    return localStorage.getItem(ZIKR_QUICK_ACTION_KEY) === 'add' ? 'add' : 'open';
  } catch {
    return 'open';
  }
}

export function setQuickAction(action: QuickAction): void {
  try {
    localStorage.setItem(ZIKR_QUICK_ACTION_KEY, action);
  } catch {
    /* private mode */
  }
}

/** Counter link for the 'open' action: that dhikr with a session target. */
export function counterHref(z: QuickZikr): string {
  return `/zikr?type=${encodeURIComponent(z.name)}&target=${z.count}`;
}

/** Reads a counter link's target back, or null when absent or invalid. */
export function parseTarget(raw: string | null): number | null {
  const n = Number(raw);
  return raw !== null && validCount(n) ? n : null;
}
