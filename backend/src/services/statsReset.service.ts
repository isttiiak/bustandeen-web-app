import User, { type IStatsResetEntry } from '../models/User.js';
import ZikrStreak from '../models/ZikrStreak.js';
import QuranProfile from '../models/QuranProfile.js';

/**
 * Stats "fresh start" (U7, Istiak's spec 2026-10-10). A reset NEVER deletes
 * or rewrites worship data. It records a start date per area; totals,
 * streaks (current AND best) and averages are then derived from that date
 * on, while history views keep every day.
 *
 * - zikr / fasting / quran keep their entries in User.statsResets.<area>.
 * - salat keeps its existing User.salatResetDate + salatResetHistory (so
 *   every reset made before U7 carries over); this service writes those.
 * - Untouched by design: Kaza debt, qaḍāʾ, kaffārah, vows, memorised āyāt,
 *   the khatm count, Rayhanah and Noor (Noor always counts every deed).
 * - The latest reset of an area can be undone; it only moves the date back.
 * - The reset tracker (Journey page) reads every area's history from here,
 *   plus `kaza`: a log of Kaza debt resets (salatDebt.service resetDebt). An
 *   entry made by "Reset all" has `all: true`; older ones share one `resetAt`.
 */

export const STATS_AREAS = ['zikr', 'salat', 'fasting', 'quran'] as const;
export type StatsArea = (typeof STATS_AREAS)[number];
type StoredArea = Exclude<StatsArea, 'salat'>;

export interface ResetHistoryEntry {
  date: string;
  note: string;
  resetAt: Date;
  /** Made by "Reset all stats". */
  all: boolean;
  /** kaza only: prayers owed just before the reset. */
  owedBefore?: number;
}
export interface AreaReset {
  /** The day the current count starts, or null when never reset. */
  date: string | null;
  history: ResetHistoryEntry[];
}
/** The four stats areas, plus the Kaza debt reset log (read only here). */
export type StatsResets = Record<StatsArea | 'kaza', AreaReset>;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** The current start date of one area, or null (one small read). */
export async function resetDateFor(uid: string, area: StatsArea): Promise<string | null> {
  if (area === 'salat') {
    const u = await User.findOne({ uid }).select('salatResetDate').lean();
    return u?.salatResetDate ?? null;
  }
  const u = await User.findOne({ uid }).select(`statsResets.${area}`).lean();
  const list = u?.statsResets?.[area as StoredArea] ?? [];
  return list.length ? (list[list.length - 1]?.date ?? null) : null;
}

/** Latest of two YYYY-MM-DD strings (either may be missing). */
export function laterDay(a: string | null | undefined, b: string | null | undefined): string {
  return (a ?? '') > (b ?? '') ? (a ?? '') : (b ?? '');
}

export async function getResets(uid: string): Promise<StatsResets> {
  const u = await User.findOne({ uid })
    .select('salatResetDate salatResetHistory statsResets')
    .lean();
  const entry = (e: {
    date: string;
    note?: string;
    resetAt: Date;
    all?: boolean;
    owedBefore?: number;
  }): ResetHistoryEntry => ({
    date: e.date,
    note: e.note ?? '',
    resetAt: e.resetAt,
    all: !!e.all,
    ...(typeof e.owedBefore === 'number' ? { owedBefore: e.owedBefore } : {}),
  });
  const view = (list: IStatsResetEntry[] | undefined): AreaReset => {
    const l = list ?? [];
    return {
      date: l.length ? (l[l.length - 1]?.date ?? null) : null,
      history: l.map(entry),
    };
  };
  const out: StatsResets = {
    zikr: view(u?.statsResets?.zikr),
    salat: {
      date: u?.salatResetDate ?? null,
      history: (u?.salatResetHistory ?? []).map(entry),
    },
    fasting: view(u?.statsResets?.fasting),
    quran: view(u?.statsResets?.quran),
    kaza: view(u?.statsResets?.kaza),
  };
  markLegacyAll(out);
  return out;
}

/**
 * Resets made by "Reset all" before the `all` flag existed: one request
 * stamps the same `resetAt` on every area, so an instant found in all four
 * areas' histories was a Reset all.
 */
function markLegacyAll(r: StatsResets): void {
  const at = (e: ResetHistoryEntry) => new Date(e.resetAt).getTime();
  const sets = STATS_AREAS.map((a) => new Set(r[a].history.map(at)));
  for (const a of STATS_AREAS) {
    for (const e of r[a].history) {
      if (!e.all && sets.every((s) => s.has(at(e)))) e.all = true;
    }
  }
}

/** Start the given areas again from `day`. Resetting an area twice on the
 * same day is a no-op (so a double tap never stacks entries). */
export async function resetAreas(
  uid: string,
  areas: readonly StatsArea[],
  day: string,
  note = ''
): Promise<StatsResets> {
  if (!DAY_RE.test(day)) throw Object.assign(new Error('Invalid day'), { statusCode: 400 });
  const current = new Map(Object.entries(await getResets(uid)));
  const resetAt = new Date();
  const cleanNote = note.trim().slice(0, 200);
  // Every area at once = "Reset all stats" (counted on its own in the tracker).
  const all = STATS_AREAS.every((a) => areas.includes(a));

  for (const area of new Set(areas)) {
    if (current.get(area)?.date === day) continue;

    if (area === 'salat') {
      await User.updateOne(
        { uid },
        {
          $set: { salatResetDate: day },
          $push: {
            salatResetHistory: { date: day, note: cleanNote, resetAt, ...(all ? { all } : {}) },
          },
        }
      );
      continue;
    }

    const entry: IStatsResetEntry = {
      date: day,
      note: cleanNote,
      resetAt,
      ...(all ? { all } : {}),
    };
    if (area === 'zikr') {
      // Best streak restarts too (Istiak). The old values are kept in the
      // entry for Undo and "all time"; the derived streak walk stops at `day`.
      const s = await ZikrStreak.findOne({ userId: uid }).lean();
      entry.prevStreak = s
        ? {
            currentStreak: s.currentStreak ?? 0,
            longestStreak: s.longestStreak ?? 0,
            lastCompletedDate: s.lastCompletedDate ?? null,
            isPaused: s.isPaused ?? false,
            pausedAt: s.pausedAt ?? null,
            pausedStreak: s.pausedStreak ?? 0,
          }
        : null;
      if (s) {
        await ZikrStreak.updateOne(
          { userId: uid },
          {
            $set: {
              currentStreak: 0,
              longestStreak: 0,
              lastCompletedDate: null,
              isPaused: false,
              pausedAt: null,
              pausedStreak: 0,
            },
          }
        );
      }
    }
    if (area === 'quran') {
      // Most-read surahs count completions above this snapshot.
      const p = await QuranProfile.findOne({ userId: uid }).select('surahCounts').lean();
      entry.surahBaseline = (p?.surahCounts as unknown as Record<string, number>) ?? {};
    }
    await User.updateOne({ uid }, { $push: { [`statsResets.${area}`]: entry } });
  }
  return getResets(uid);
}

/** Log a Kaza debt reset (the debt itself is reset by salatDebt.service). */
export async function logKazaReset(uid: string, day: string, owedBefore: number): Promise<void> {
  const entry: IStatsResetEntry = {
    date: day,
    note: '',
    resetAt: new Date(),
    owedBefore: Math.max(0, Math.round(owedBefore)),
  };
  await User.updateOne({ uid }, { $push: { 'statsResets.kaza': entry } });
}

/** Undo the latest reset of one area: the previous start date comes back. */
export async function undoReset(uid: string, area: StatsArea): Promise<StatsResets> {
  if (area === 'salat') {
    const u = await User.findOne({ uid }).select('salatResetHistory').lean();
    const hist = u?.salatResetHistory ?? [];
    if (hist.length) {
      const prev = hist.length > 1 ? hist[hist.length - 2]?.date : undefined;
      await User.updateOne(
        { uid },
        {
          $pop: { salatResetHistory: 1 },
          ...(prev ? { $set: { salatResetDate: prev } } : { $unset: { salatResetDate: '' } }),
        }
      );
    }
    return getResets(uid);
  }

  const u = await User.findOne({ uid }).select(`statsResets.${area}`).lean();
  const list = u?.statsResets?.[area as StoredArea] ?? [];
  const last = list[list.length - 1];
  if (!last) return getResets(uid);

  if (area === 'zikr' && last.prevStreak) {
    // Put the streak doc back; a best reached since the reset is kept.
    const now = await ZikrStreak.findOne({ userId: uid }).lean();
    const prev = last.prevStreak as Record<string, unknown>;
    await ZikrStreak.updateOne(
      { userId: uid },
      {
        $set: {
          ...prev,
          longestStreak: Math.max(Number(prev.longestStreak ?? 0), now?.longestStreak ?? 0),
        },
      },
      { upsert: true }
    );
  }
  await User.updateOne({ uid }, { $pop: { [`statsResets.${area}`]: 1 } });
  return getResets(uid);
}

/** Best streak over every phase, for "see all time" (zikr). */
export async function zikrLifetimeBest(uid: string, currentBest: number): Promise<number> {
  const u = await User.findOne({ uid }).select('statsResets.zikr').lean();
  return (u?.statsResets?.zikr ?? []).reduce(
    (best, e) =>
      Math.max(best, Number((e.prevStreak as { longestStreak?: number })?.longestStreak ?? 0)),
    currentBest
  );
}
