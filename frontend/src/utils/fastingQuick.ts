// Home's Fasting section (T3.4 E). It never makes its own ruling: it reads
// getDayRuling (utils/fastingRules.ts, the Fasting page's engine) and logs
// what the Fasting page itself would preselect for today, a voluntary fast of
// the day's best sunnah kind, else general (Istiak, 2026-10-09).

import { getDayRuling, type DayRuling, type VoluntaryKind } from './fastingRules.js';

export type QuickFastPlan =
  /** Fasting is prohibited today: show the ruling, no Yes. */
  | { kind: 'haram'; title: string }
  /** Ramadan: the Ramadan tracker owns logging. */
  | { kind: 'ramadan' }
  /** A disliked-alone day (lone Friday/Saturday, day of doubt): Yes opens the
   *  Fasting page, which weighs adjacent fasts and shows the warning. */
  | { kind: 'caution' }
  /** One-tap Yes logs this. */
  | { kind: 'log'; voluntaryKind: VoluntaryKind };

export function quickFastPlan(ruling: DayRuling): QuickFastPlan {
  if (ruling.level === 'haram') return { kind: 'haram', title: ruling.haram?.title ?? '' };
  if (ruling.level === 'ramadan') return { kind: 'ramadan' };
  if (ruling.cautions.length > 0) return { kind: 'caution' };
  return { kind: 'log', voluntaryKind: ruling.recommended[0]?.id ?? 'general' };
}

/** The next day (from tomorrow, up to `days` ahead) with a sunnah fast that
 *  may be fasted, and its kind; null when none in range. */
export function nextSunnahFast(
  from: Date,
  days = 7
): { date: Date; kind: VoluntaryKind; label: string } | null {
  for (let i = 1; i <= days; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12);
    const r = getDayRuling(d);
    const best = r.recommended[0];
    if (r.level === 'normal' && best) return { date: d, kind: best.id, label: best.label };
  }
  return null;
}
