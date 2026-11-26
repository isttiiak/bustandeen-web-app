import type { CycleSummary } from '../hooks/useCycle.js';

// Rayhanah privacy rule: these numbers are computed on the device from the
// user's own cycle data; nothing here is sent to an AI or shown to friends.

function shiftStr(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86_400_000
  );
}

export const SYMPTOM_LABEL: Record<string, string> = {
  cramps: 'Cramps',
  headache: 'Headache',
  fatigue: 'Fatigue',
  nausea: 'Nausea',
  backache: 'Backache',
  bloating: 'Bloating',
  tenderness: 'Tenderness',
  insomnia: 'Insomnia',
};

/** The analytics page's statistics: gaps, lengths, predictions, PMS pattern, trend, alerts. */
export function computeCycleStats(summary: CycleSummary | undefined, today: string) {
  const hayd = (summary?.logs ?? [])
    .filter((l) => l.type === 'hayd')
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const gaps: Array<{ from: string; days: number }> = [];
  for (let i = 1; i < hayd.length; i++) {
    const g = daysBetween(hayd[i - 1]!.startDate, hayd[i]!.startDate);
    if (g >= 15 && g <= 60) gaps.push({ from: hayd[i - 1]!.startDate, days: g });
  }
  const lengths = hayd
    .filter((l) => l.endDate)
    .map((l) => ({ from: l.startDate, days: daysBetween(l.startDate, l.endDate!) + 1 }))
    .filter((x) => x.days >= 1 && x.days <= 15);

  const gapVals = gaps.map((g) => g.days);
  const mean = gapVals.length ? gapVals.reduce((a, b) => a + b, 0) / gapVals.length : 28;
  const sd =
    gapVals.length > 1
      ? Math.sqrt(gapVals.reduce((a, b) => a + (b - mean) ** 2, 0) / (gapVals.length - 1))
      : 0;
  const lenVals = lengths.map((l) => l.days);
  const meanLen = lenVals.length ? lenVals.reduce((a, b) => a + b, 0) / lenVals.length : 7;

  const regularity =
    gapVals.length < 2
      ? { key: 'learning', label: 'Learning…', tone: 'text-white/70' }
      : sd <= 2
        ? { key: 'veryRegular', label: 'Very regular', tone: 'text-brand-emerald' }
        : sd <= 4
          ? { key: 'regular', label: 'Regular', tone: 'text-brand-emerald' }
          : sd <= 7
            ? { key: 'somewhatVariable', label: 'Somewhat variable', tone: 'text-brand-gold' }
            : { key: 'irregular', label: 'Irregular', tone: 'text-brand-pink' };

  // Next 3 predicted windows: lastStart + n·mean, each ± max(1, round(SD))
  const lastStart = hayd.length ? hayd[hayd.length - 1]!.startDate : null;
  const spread = Math.max(1, Math.round(sd));
  const windows = lastStart
    ? [1, 2, 3]
        .map((n) => {
          const center = shiftStr(lastStart, Math.round(n * mean));
          return { center, from: shiftStr(center, -spread), to: shiftStr(center, spread) };
        })
        .filter((w) => w.center >= today || daysBetween(w.center, today) < Math.round(mean))
    : [];

  // Fertile window + ovulation for each predicted window
  const fertileWindows = windows.map((w) => {
    const ovulation = shiftStr(w.center, -14);
    return {
      ovulation,
      from: shiftStr(ovulation, -2),
      to: shiftStr(ovulation, 2),
    };
  });

  // PMS prediction: look at symptom patterns to find typical pre-period onset
  const days = summary?.days ?? [];
  const symCount = new Map<string, number>();
  let flowLight = 0,
    flowMed = 0,
    flowHeavy = 0;
  const moodCount = new Map<string, number>();
  for (const d of days) {
    for (const sy of d.symptoms) symCount.set(sy, (symCount.get(sy) ?? 0) + 1);
    if (d.flow === 'light') flowLight++;
    if (d.flow === 'medium') flowMed++;
    if (d.flow === 'heavy') flowHeavy++;
    for (const mo of d.moods ?? []) moodCount.set(mo, (moodCount.get(mo) ?? 0) + 1);
  }
  const topSymptoms = [...symCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const flowTotal = flowLight + flowMed + flowHeavy;

  // PMS symptom pattern: which symptoms appear in the 7 days before each period?
  const pmsSymptomCounts = new Map<string, number>();
  let pmsPeriodsAnalyzed = 0;
  for (let i = 1; i < hayd.length; i++) {
    const periodStart = hayd[i]!.startDate;
    const preWindow = new Set<string>();
    for (let d = -7; d <= -1; d++) preWindow.add(shiftStr(periodStart, d));
    const preDays = days.filter((dd) => preWindow.has(dd.date));
    if (preDays.length > 0) {
      pmsPeriodsAnalyzed++;
      const seen = new Set<string>();
      for (const dd of preDays) {
        for (const sy of dd.symptoms) seen.add(sy);
        for (const mo of dd.moods ?? []) seen.add(`mood:${mo}`);
      }
      for (const s of seen) pmsSymptomCounts.set(s, (pmsSymptomCounts.get(s) ?? 0) + 1);
    }
  }
  const pmsPatterns = [...pmsSymptomCounts.entries()]
    .filter(([, n]) => n >= Math.max(1, Math.floor(pmsPeriodsAnalyzed * 0.4)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, n]) => ({
      key,
      label: key.startsWith('mood:')
        ? `${key.replace('mood:', '')} mood`
        : (SYMPTOM_LABEL[key] ?? key),
      count: n,
      pct: pmsPeriodsAnalyzed > 0 ? Math.round((n / pmsPeriodsAnalyzed) * 100) : 0,
    }));

  // Extended insights: longest/shortest cycle + trend
  const longest = gapVals.length ? Math.max(...gapVals) : null;
  const shortest = gapVals.length ? Math.min(...gapVals) : null;
  // Trend: compare last 3 vs previous 3 cycle gaps
  let trend: 'shorter' | 'longer' | 'stable' | null = null;
  if (gapVals.length >= 6) {
    const recent = gapVals.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const older = gapVals.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    const diff = recent - older;
    if (diff > 2) trend = 'longer';
    else if (diff < -2) trend = 'shorter';
    else trend = 'stable';
  }
  // Irregularity alert: last cycle significantly different from average
  let irregAlertDays: number | null = null;
  let irregAlertDirection: 'longer' | 'shorter' | null = null;
  if (gapVals.length >= 3) {
    const last = gapVals[gapVals.length - 1]!;
    if (Math.abs(last - mean) > 10) {
      irregAlertDays = Math.round(Math.abs(last - mean));
      irregAlertDirection = last > mean ? 'longer' : 'shorter';
    }
  }

  // Fasting makeup: total excused days across all completed cycles
  const totalExcusedDays = (summary?.logs ?? [])
    .filter((l) => l.endDate)
    .reduce((sum, l) => sum + daysBetween(l.startDate, l.endDate!) + 1, 0);

  return {
    gaps,
    lengths,
    mean,
    sd,
    meanLen,
    regularity,
    windows,
    fertileWindows,
    topSymptoms,
    flowLight,
    flowMed,
    flowHeavy,
    flowTotal,
    haydCount: hayd.length,
    pmsPatterns,
    pmsPeriodsAnalyzed,
    longest,
    shortest,
    trend,
    irregAlertDays,
    irregAlertDirection,
    totalExcusedDays,
  };
}

export type CycleStats = ReturnType<typeof computeCycleStats>;
