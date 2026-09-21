/**
 * Naseeh weekly plan: one small, concrete plan for the week, sized to what the
 * user actually did over the last four weeks.
 *
 * Rules this file keeps:
 *  - Every number comes from the user's own logs. There is no AI in here at all:
 *    the plan depends on which days were Rayhanah rest days, and nothing about
 *    those days may reach a model, so no plan text is ever sent to one.
 *  - Rest days are neutral: they are left out of the four-week baseline, they
 *    reduce how many days a target can be met on, and while today is a rest day
 *    the plan is paused (no plan shown, none can be accepted).
 *  - Accepting writes only to the goal fields that already exist (dhikr daily
 *    goal, Quran daily ayat goal). The salat focus lives in the plan itself.
 */

import User from '../models/User.js';
import ZikrDaily from '../models/ZikrDaily.js';
import QuranLog from '../models/QuranLog.js';
import NaseehPlan, { type INaseehPlan, type IPlanTarget } from '../models/NaseehPlan.js';
import SalatLog, { PRAYER_IDS, type PrayerId } from '../models/SalatLog.js';
import { getExcusedDaySet } from './cycle.service.js';
import { getAnalyticsData, setGoal } from './analytics.service.js';
import * as quranService from './quran.service.js';
import { loadSalatAnalytics } from './naseehInsights.service.js';

const BASELINE_DAYS = 28;
const MIN_BASELINE_DAYS = 7; // fewer counted days than this is too little to size a plan on
const WEAK_BELOW = 0.85; // a tracker at or above this is doing fine
const MAX_TARGETS = 2; // "one small plan", not a to-do list

const PRAYER_LABEL: Record<PrayerId, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

// ── Date helpers (pure string math, no time zones) ───────────────────────────
function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
/** Monday of the week containing `iso`. */
export function weekStartOf(iso: string): string {
  const dow = (new Date(`${iso}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  return addDays(iso, -dow);
}
function daysBetweenInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const safeToday = (t?: string): string =>
  t && DATE_RE.test(t) ? t : new Date().toISOString().slice(0, 10);

const roundTo = (n: number, step: number): number => Math.round(n / step) * step;
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

// ── Public shapes ────────────────────────────────────────────────────────────
export type PlanStatus = 'paused' | 'not-enough-data' | 'steady' | 'ready' | 'accepted';

export interface PlanTargetView extends IPlanTarget {
  title: string;
  /** Why this target, in plain words, from the user's own last four weeks. */
  reason: string;
  /** Days this week (so far) the daily bar was met. */
  done: number;
  /** The target after allowing for days that cannot count (never above days still possible). */
  effectiveDaysTarget: number;
  /** Days from today to Sunday on which the bar can still be met. */
  daysLeft: number;
  met: boolean;
}

export interface PlanView {
  weekStart: string;
  weekEnd: string;
  status: PlanStatus;
  headline: string;
  targets: PlanTargetView[];
  acceptedAt: string | null;
}

interface TrackerStat {
  kind: IPlanTarget['kind'];
  prayer?: PrayerId;
  /** Share (0-1) of counted days on which the bar was met. */
  rate: number;
  suggestedAmount?: number;
  daysTarget: number;
  reason: string;
}

// ── Gathering the week's own data ────────────────────────────────────────────
interface Gathered {
  weekStart: string;
  weekEnd: string;
  today: string;
  /** First day the four-week baseline covers: never before tracking started. */
  baseFrom: string;
  excused: Set<string>;
  zikrByDay: Map<string, number>;
  quranByDay: Map<string, number>;
  zikrGoal: number;
  quranGoal: number;
  salatDays: number;
  salatDone: Record<PrayerId, number>;
  weekSalat: Map<string, Set<PrayerId>>;
}

async function gather(userId: string, today: string, timezoneOffset: number): Promise<Gathered> {
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);
  // A day before the user started tracking is not a "missed" day, so the
  // baseline never reaches back past their first activity or account creation.
  const [user, firstZikr, firstQuran, firstSalat] = await Promise.all([
    User.findOne({ uid: userId }).select('createdAt').lean(),
    ZikrDaily.findOne({ userId }).sort({ date: 1 }).select('date').lean(),
    QuranLog.findOne({ userId }).sort({ date: 1 }).select('date').lean(),
    SalatLog.findOne({ userId }).sort({ date: 1 }).select('date').lean(),
  ]);
  const starts = [
    user?.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : today,
    firstZikr?.date ? new Date(firstZikr.date).toISOString().slice(0, 10) : today,
    firstQuran?.date ?? today,
    firstSalat?.date ?? today,
  ];
  const trackingStart = starts.reduce((a, b) => (b < a ? b : a));
  const windowStart = addDays(today, -(BASELINE_DAYS - 1));
  const baseFrom = trackingStart > windowStart ? trackingStart : windowStart;
  const excused = await getExcusedDaySet(
    userId,
    baseFrom < weekStart ? baseFrom : weekStart,
    weekEnd
  );

  const [analytics, history, profile, salat, weekLogs] = await Promise.all([
    getAnalyticsData(userId, BASELINE_DAYS, timezoneOffset, today),
    quranService.getHistory(userId, BASELINE_DAYS, today),
    quranService.getOrCreateProfile(userId),
    loadSalatAnalytics(userId, BASELINE_DAYS, today),
    SalatLog.find({ userId, date: { $gte: weekStart, $lte: today } }).select('date prayers'),
  ]);

  const zikrByDay = new Map(analytics.chartData.map((d) => [d.date, d.total]));
  const quranByDay = new Map(history.map((h) => [h.date, h.units]));
  const goal = analytics.goal as { dailyTarget: number };
  const quranGoal = profile.dailyGoalAyat > 0 ? profile.dailyGoalAyat : profile.dailyGoalPages * 10;

  const salatDone = {} as Record<PrayerId, number>;
  for (const pid of PRAYER_IDS) {
    const p = salat.perPrayer[pid];
    salatDone[pid] = (p?.completed ?? 0) + (p?.kaza ?? 0);
  }
  const weekSalat = new Map<string, Set<PrayerId>>();
  for (const log of weekLogs) {
    const done = new Set<PrayerId>();
    for (const pid of PRAYER_IDS) {
      const st = log.prayers[pid]?.status;
      if (st === 'completed' || st === 'kaza') done.add(pid);
    }
    weekSalat.set(log.date, done);
  }

  return {
    weekStart,
    weekEnd,
    today,
    baseFrom,
    excused,
    zikrByDay,
    quranByDay,
    zikrGoal: goal.dailyTarget,
    quranGoal,
    salatDays: salat.totalDays,
    salatDone,
    weekSalat,
  };
}

/** Days of the week (Mon-Sun) on which a target can still count. */
function possibleDays(g: Gathered, from: string): number {
  return daysBetweenInclusive(from, g.weekEnd).filter((d) => !g.excused.has(d)).length;
}

// ── Sizing the plan from the last four weeks ─────────────────────────────────
function tracker(g: Gathered): {
  stats: TrackerStat[];
  countedDays: number;
  possibleThisWeek: number;
} {
  const counted = daysBetweenInclusive(g.baseFrom, g.today).filter((d) => !g.excused.has(d));
  const possibleThisWeek = possibleDays(g, g.weekStart);
  const stats: TrackerStat[] = [];
  if (counted.length < MIN_BASELINE_DAYS)
    return { stats, countedDays: counted.length, possibleThisWeek };

  const daysFor = (perWeek: number): number =>
    clamp(Math.ceil(perWeek) + 1, 1, Math.max(1, Math.min(7, possibleThisWeek)));

  // Dhikr
  {
    const totals = counted.map((d) => g.zikrByDay.get(d) ?? 0);
    const active = totals.filter((n) => n > 0);
    const met = totals.filter((n) => n >= g.zikrGoal).length;
    const avgActive = active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
    const amount = active.length ? clamp(Math.max(10, roundTo(avgActive, 10)), 1, 100000) : 33;
    const perWeek = (totals.filter((n) => n >= amount).length / counted.length) * 7;
    stats.push({
      kind: 'zikr',
      rate: met / counted.length,
      suggestedAmount: amount,
      daysTarget: daysFor(perWeek),
      reason: active.length
        ? `You reached your dhikr goal on ${met} of the last ${counted.length} counted days, and a typical dhikr day for you is about ${Math.round(avgActive)}.`
        : `You have not counted dhikr in the last ${counted.length} counted days, so this starts small.`,
    });
  }

  // Quran
  {
    const totals = counted.map((d) => g.quranByDay.get(d) ?? 0);
    const active = totals.filter((n) => n > 0);
    const met = totals.filter((n) => n >= g.quranGoal).length;
    const avgActive = active.length ? active.reduce((a, b) => a + b, 0) / active.length : 0;
    const amount = active.length ? clamp(Math.max(5, roundTo(avgActive, 5)), 1, 6236) : 5;
    const perWeek = (totals.filter((n) => n >= amount).length / counted.length) * 7;
    stats.push({
      kind: 'quran',
      rate: met / counted.length,
      suggestedAmount: amount,
      daysTarget: daysFor(perWeek),
      reason: active.length
        ? `You read on ${active.length} of the last ${counted.length} counted days, about ${Math.round(avgActive)} ayat on a reading day.`
        : `You have not logged Quran reading in the last ${counted.length} counted days, so this starts small.`,
    });
  }

  // Salat: the one prayer that slips most
  if (g.salatDays >= MIN_BASELINE_DAYS) {
    const worst = PRAYER_IDS.map((pid) => ({ pid, rate: g.salatDone[pid] / g.salatDays })).reduce(
      (a, b) => (b.rate < a.rate ? b : a)
    );
    const done = g.salatDone[worst.pid];
    stats.push({
      kind: 'salat',
      prayer: worst.pid,
      rate: worst.rate,
      daysTarget: daysFor(worst.rate * 7),
      reason: `${PRAYER_LABEL[worst.pid]} is the prayer you logged least: ${done} of the last ${g.salatDays} counted days.`,
    });
  }

  return { stats, countedDays: counted.length, possibleThisWeek };
}

function titleOf(t: IPlanTarget): string {
  const d = `${t.daysTarget} ${t.daysTarget === 1 ? 'day' : 'days'}`;
  if (t.kind === 'zikr') return `Dhikr: ${t.dailyAmount} a day, on ${d}`;
  if (t.kind === 'quran') return `Quran: ${t.dailyAmount} ayat a day, on ${d}`;
  return `${PRAYER_LABEL[t.prayer as PrayerId]} on ${d}`;
}

/** Days this week (Monday to today) on which the target's daily bar was met. */
function doneSoFar(t: IPlanTarget, g: Gathered): number {
  const days = daysBetweenInclusive(g.weekStart, g.today).filter((d) => !g.excused.has(d));
  if (t.kind === 'zikr')
    return days.filter((d) => (g.zikrByDay.get(d) ?? 0) >= (t.dailyAmount ?? 1)).length;
  if (t.kind === 'quran')
    return days.filter((d) => (g.quranByDay.get(d) ?? 0) >= (t.dailyAmount ?? 1)).length;
  return days.filter((d) => g.weekSalat.get(d)?.has(t.prayer as PrayerId)).length;
}

function view(t: IPlanTarget, g: Gathered, reason: string): PlanTargetView {
  const done = doneSoFar(t, g);
  const daysLeft = possibleDays(g, g.today);
  const effective = Math.min(t.daysTarget, done + daysLeft);
  return {
    kind: t.kind,
    dailyAmount: t.dailyAmount,
    prayer: t.prayer,
    daysTarget: t.daysTarget,
    title: titleOf(t),
    reason,
    done,
    effectiveDaysTarget: effective,
    daysLeft,
    met: done >= effective,
  };
}

const PAUSED: Omit<PlanView, 'weekStart' | 'weekEnd'> = {
  status: 'paused',
  headline: 'Your plan is paused. Nothing is due and nothing is lost. It comes back when you do.',
  targets: [],
  acceptedAt: null,
};

/** True if today (or the whole rest of the week) cannot count. */
function isPaused(g: Gathered): boolean {
  return g.excused.has(g.today) || possibleDays(g, g.weekStart) === 0;
}

// ── Reading and accepting ────────────────────────────────────────────────────
export async function getPlan(
  userId: string,
  opts: { today?: string; timezoneOffset: number }
): Promise<PlanView> {
  const g = await gather(userId, safeToday(opts.today), opts.timezoneOffset);
  const base = { weekStart: g.weekStart, weekEnd: g.weekEnd };
  if (isPaused(g)) return { ...base, ...PAUSED };

  const stored = await NaseehPlan.findOne({ userId, weekStart: g.weekStart });
  const { stats, countedDays } = tracker(g);

  if (stored?.accepted && stored.targets.length) {
    const reasons = new Map(stats.map((s) => [s.kind, s.reason]));
    const targets = stored.targets.map((t) =>
      view(t, g, reasons.get(t.kind) ?? 'You chose this target for the week.')
    );
    const allMet = targets.every((t) => t.met);
    return {
      ...base,
      status: 'accepted',
      headline: allMet
        ? 'You have met this week’s targets. Well done. Anything more is a bonus.'
        : 'Your plan for this week. Small and steady is the goal.',
      targets,
      acceptedAt: stored.acceptedAt?.toISOString() ?? null,
    };
  }

  if (countedDays < MIN_BASELINE_DAYS) {
    return {
      ...base,
      status: 'not-enough-data',
      headline:
        'A few more days of logging and Naseeh can suggest a plan sized to you. Nothing to do yet.',
      targets: [],
      acceptedAt: null,
    };
  }

  const weak = stats
    .filter((s) => s.rate < WEAK_BELOW)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, MAX_TARGETS);
  if (weak.length === 0) {
    return {
      ...base,
      status: 'steady',
      headline: 'You are steady across dhikr, Quran and prayer. Keep doing what you are doing.',
      targets: [],
      acceptedAt: null,
    };
  }

  const targets = weak.map((s) =>
    view(
      { kind: s.kind, dailyAmount: s.suggestedAmount, prayer: s.prayer, daysTarget: s.daysTarget },
      g,
      s.reason
    )
  );
  return {
    ...base,
    status: 'ready',
    headline: `A small plan for this week: ${weak.length === 1 ? 'one thing' : 'two things'} to nudge up, sized to what you actually did.`,
    targets,
    acceptedAt: null,
  };
}

export interface PlanAdjustment {
  kind: IPlanTarget['kind'];
  dailyAmount?: number;
  daysTarget?: number;
}

export async function acceptPlan(
  userId: string,
  opts: { today?: string; timezoneOffset: number; adjust?: PlanAdjustment[] }
): Promise<PlanView> {
  const today = safeToday(opts.today);
  const g = await gather(userId, today, opts.timezoneOffset);
  if (isPaused(g)) {
    throw Object.assign(new Error('Your plan is paused right now.'), { statusCode: 409 });
  }
  const { stats, countedDays } = tracker(g);
  if (countedDays < MIN_BASELINE_DAYS) {
    throw Object.assign(new Error('Not enough history for a plan yet.'), { statusCode: 400 });
  }
  const weak = stats
    .filter((s) => s.rate < WEAK_BELOW)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, MAX_TARGETS);
  if (weak.length === 0) {
    throw Object.assign(new Error('There is nothing to plan: you are steady.'), {
      statusCode: 400,
    });
  }

  const maxDays = Math.max(1, Math.min(7, possibleDays(g, g.weekStart)));
  const targets: IPlanTarget[] = weak.map((s) => {
    const tweak = opts.adjust?.find((a) => a.kind === s.kind);
    const t: IPlanTarget = {
      kind: s.kind,
      prayer: s.prayer,
      daysTarget: clamp(tweak?.daysTarget ?? s.daysTarget, 1, maxDays),
    };
    if (s.kind !== 'salat') {
      const cap = s.kind === 'zikr' ? 100000 : 6236;
      t.dailyAmount = clamp(tweak?.dailyAmount ?? s.suggestedAmount ?? 1, 1, cap);
    }
    return t;
  });

  await NaseehPlan.findOneAndUpdate(
    { userId, weekStart: g.weekStart },
    { $set: { accepted: true, acceptedAt: new Date(), targets } },
    { upsert: true, setDefaultsOnInsert: true }
  );

  // Write the daily bars into the goal fields that already exist.
  for (const t of targets) {
    if (t.kind === 'zikr' && t.dailyAmount) await setGoal(userId, t.dailyAmount);
    if (t.kind === 'quran' && t.dailyAmount) {
      await quranService.updateProfile(userId, { dailyGoalAyat: t.dailyAmount });
    }
  }

  return getPlan(userId, { today, timezoneOffset: opts.timezoneOffset });
}

export type { INaseehPlan };
