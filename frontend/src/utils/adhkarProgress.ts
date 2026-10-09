// Morning/evening adhkar routine (T4.3): per-item tap counts for the current
// tracking day, kept on this device only. Only "routine done" syncs
// (hooks/useAdhkar.ts); nothing here feeds zikr totals, Noor or streaks.
import type { AdhkarPeriod } from './todayTimeline.js';

const KEY = 'bustandeen_adhkar_progress';

export type AdhkarCounts = Record<string, number>;

export interface AdhkarSummary {
  done: number;
  total: number;
}

interface Stored {
  day: string;
  morning: AdhkarCounts;
  evening: AdhkarCounts;
  /** Home's card reads this, so it never loads the adhkar text. */
  summary?: Partial<Record<AdhkarPeriod, AdhkarSummary>>;
}

interface CountedItem {
  id: string;
  repeat: number;
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/** Counts for this tracking day; a new day starts from zero. */
export function readAdhkarCounts(day: string, period: AdhkarPeriod): AdhkarCounts {
  const s = read();
  return s && s.day === day ? { ...(s[period] ?? {}) } : {};
}

/** Progress of a routine on this device today, or null if not started. */
export function readAdhkarSummary(day: string, period: AdhkarPeriod): AdhkarSummary | null {
  const s = read();
  return (s && s.day === day && s.summary?.[period]) || null;
}

export function writeAdhkarCounts(
  day: string,
  period: AdhkarPeriod,
  counts: AdhkarCounts,
  items: CountedItem[]
): void {
  const s = read();
  const base: Stored = s && s.day === day ? s : { day, morning: {}, evening: {} };
  const summary = {
    ...base.summary,
    [period]: { done: doneCount(items, counts), total: items.length },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...base, [period]: counts, summary }));
  } catch {
    // Storage full or blocked: the routine still works for this visit.
  }
}

export function isItemDone(item: CountedItem, counts: AdhkarCounts): boolean {
  return (counts[item.id] ?? 0) >= item.repeat;
}

/** Index of the first item still short of its count, or -1 when all are done. */
export function firstOpenIndex(items: CountedItem[], counts: AdhkarCounts): number {
  return items.findIndex((i) => !isItemDone(i, counts));
}

export function doneCount(items: CountedItem[], counts: AdhkarCounts): number {
  return items.filter((i) => isItemDone(i, counts)).length;
}

/** One tap, never past the item's count. */
export function tapItem(item: CountedItem, counts: AdhkarCounts): AdhkarCounts {
  return { ...counts, [item.id]: Math.min(item.repeat, (counts[item.id] ?? 0) + 1) };
}

/** "Next" on an unfinished item: count it as read and move on. */
export function completeItem(item: CountedItem, counts: AdhkarCounts): AdhkarCounts {
  return { ...counts, [item.id]: item.repeat };
}

/** "Back": reopen the item before `index` so it can be read again. */
export function reopenItem(item: CountedItem, counts: AdhkarCounts): AdhkarCounts {
  return { ...counts, [item.id]: 0 };
}
