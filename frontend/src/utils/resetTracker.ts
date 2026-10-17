// The reset tracker (Journey page and each analytics Journey tab): how many
// times each area was started fresh, and when. Pure; the data comes from
// GET /api/stats/resets (backend statsReset.service.ts).

import type { ResetEntry, StatsResets, TrackedArea } from '../hooks/useStatsResets.js';

// Same list as hooks/useStatsResets.ts (imported as types only, so this file
// stays free of the API client and can run in unit tests).
const STATS_AREAS = ['zikr', 'salat', 'fasting', 'quran'] as const;

export interface TrackedReset extends ResetEntry {
  area: TrackedArea;
}

/** One area's resets, newest first. */
export function areaResets(resets: StatsResets | undefined, area: TrackedArea): TrackedReset[] {
  const list = (area === 'kaza' ? resets?.kaza : resets?.[area])?.history ?? [];
  return list.map((e) => ({ ...e, area })).sort(newestFirst);
}

/** "Reset all stats" uses: one per request (its entries share one instant). */
export function fullResets(resets: StatsResets | undefined): { date: string; resetAt: string }[] {
  const seen = new Map<number, { date: string; resetAt: string }>();
  for (const a of STATS_AREAS) {
    for (const e of resets?.[a]?.history ?? []) {
      if (!e.all) continue;
      const at = Date.parse(e.resetAt);
      if (!seen.has(at)) seen.set(at, { date: e.date, resetAt: e.resetAt });
    }
  }
  return [...seen.values()].sort(newestFirst);
}

function newestFirst(a: { resetAt: string }, b: { resetAt: string }): number {
  return Date.parse(b.resetAt) - Date.parse(a.resetAt);
}
