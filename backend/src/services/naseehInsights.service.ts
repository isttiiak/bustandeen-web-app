/**
 * Naseeh page features that are computed from the user's own data:
 *   1. Pattern insights ("what I noticed")
 *   2. Kaza payoff suggestion
 *   3. Ask-about-my-data chat (read-only)
 *
 * Design rule for all three: every number and date shown is computed here from
 * the database. The model never invents a figure. It may only (a) re-word a
 * sentence we already wrote, and we reject its version if any number changed,
 * or (b) pick WHICH whitelisted query to run for a free-text question. Nothing
 * here gives a ruling, and nothing here reads Rayhanah data.
 */

import User from '../models/User.js';
import SalatLog, { PRAYER_IDS, type PrayerId } from '../models/SalatLog.js';
import * as salatService from './salat.service.js';
import * as salatDebtService from './salatDebt.service.js';
import * as zikrService from './zikr.service.js';
import * as quranService from './quran.service.js';
import * as fastingService from './fasting.service.js';
import { getAnalyticsData } from './analytics.service.js';
import { complete, parseLoose, sanitizeForPrompt, asUntrustedData } from './ai.service.js';
import type { AiLanguage } from './ai.service.js';

// ── Small formatting helpers (en / bn) ───────────────────────────────────────
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const pick = (lang: AiLanguage, en: string, bn: string): string => (lang === 'bn' ? bn : en);
const num = (lang: AiLanguage, n: number | string): string =>
  lang === 'bn' ? String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d) : String(n);

const PRAYER_NAME: Record<AiLanguage, Record<PrayerId, string>> = {
  en: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
  bn: { fajr: 'ফজর', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'এশা' },
};
const WEEKDAY_NAME: Record<AiLanguage, string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
};
const REASON_NAME: Record<AiLanguage, Record<string, string>> = {
  en: { sleep: 'oversleeping', travel: 'travel', forgot: 'forgetting', busy: 'being busy' },
  bn: { sleep: 'ঘুমিয়ে পড়া', travel: 'ভ্রমণ', forgot: 'ভুলে যাওয়া', busy: 'ব্যস্ততা' },
};

function h12(h: number): number {
  return h % 12 === 0 ? 12 : h % 12;
}
function bnPart(h: number): string {
  if (h >= 4 && h < 6) return 'ভোর';
  if (h >= 6 && h < 12) return 'সকাল';
  if (h >= 12 && h < 15) return 'দুপুর';
  if (h >= 15 && h < 17) return 'বিকাল';
  if (h >= 17 && h < 19) return 'সন্ধ্যা';
  return 'রাত';
}
function hourLabel(lang: AiLanguage, h: number): string {
  return lang === 'bn'
    ? `${bnPart(h)} ${num(lang, h12(h))}টা`
    : `${h12(h)} ${h % 24 < 12 ? 'AM' : 'PM'}`;
}
function windowLabel(lang: AiLanguage, start: number): string {
  const end = (start + 3) % 24;
  return pick(
    lang,
    `${hourLabel(lang, start)} to ${hourLabel(lang, end)}`,
    `${hourLabel(lang, start)} থেকে ${hourLabel(lang, end)}`
  );
}
function dateLabel(lang: AiLanguage, iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}
function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function durationLabel(lang: AiLanguage, days: number): string {
  if (days < 60) return pick(lang, `${days} days`, `${num(lang, days)} দিন`);
  if (days < 730) {
    const m = Math.round(days / 30);
    return pick(lang, `about ${m} months`, `প্রায় ${num(lang, m)} মাস`);
  }
  const y = Math.round((days / 365) * 10) / 10;
  return pick(lang, `about ${y} years`, `প্রায় ${num(lang, y)} বছর`);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function safeToday(today?: string): string {
  return today && DATE_RE.test(today) ? today : new Date().toISOString().slice(0, 10);
}

// ── Model rewrite with number-preservation check ─────────────────────────────
const toAscii = (s: string): string => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
const numbersIn = (s: string): string[] => (toAscii(s).match(/\d+/g) ?? []).sort();

/**
 * Asks the model to re-word sentences we already wrote. The result is accepted
 * only if every sentence keeps exactly the same numbers; otherwise the caller
 * keeps our own template text. `complete()` already applies the aiEnabled gate,
 * the guardrail filter and audit logging.
 */
async function rephrase(
  lines: string[],
  feature: string,
  userId: string,
  language: AiLanguage
): Promise<string[] | null> {
  if (lines.length === 0) return null;
  const out = await complete(
    `You are given ${lines.length} short factual sentences about a user's own worship habits. Re-word each one so it sounds warm, natural and encouraging, like a kind friend. Rules:
- Keep every number, time, weekday, date and prayer name EXACTLY as written. Do not add, remove or change any number.
- Do not add new facts, advice, rulings, or anything religious. One sentence per line, same order.
- Never blame or shame. Describe what the data shows and, at most, gently suggest.
Reply ONLY as JSON: {"lines": string[${lines.length}]}.`,
    `Sentences (JSON): ${JSON.stringify(lines)}`,
    700,
    { feature, userId, language }
  );
  if (!out) return null;
  const parsed = parseLoose<{ lines?: unknown }>(out.text);
  const got = parsed?.lines;
  if (!Array.isArray(got) || got.length !== lines.length) return null;
  const clean: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const s = got[i];
    if (typeof s !== 'string') return null;
    const t = s.trim();
    if (!t || t.length > 260) return null;
    const a = numbersIn(lines[i] as string);
    const b = numbersIn(t);
    if (a.length !== b.length || a.some((v, k) => v !== b[k])) return null;
    clean.push(t);
  }
  return clean;
}

// ── Shared salat analytics loader (same window rules as the analytics page) ──
async function loadSalatAnalytics(userId: string, days: number, today: string) {
  await salatDebtService.ensureCaughtUp(userId, today);
  const user = await User.findOne({ uid: userId }).select('salatResetDate createdAt').lean();
  const firstLog = await SalatLog.findOne({ userId }).sort({ date: 1 }).select('date').lean();
  const createdDate = user?.createdAt
    ? new Date(user.createdAt).toISOString().slice(0, 10)
    : undefined;
  const trackingStart =
    createdDate && firstLog?.date
      ? createdDate < firstLog.date
        ? createdDate
        : firstLog.date
      : (firstLog?.date ?? createdDate);
  return salatService.getSalatAnalytics(userId, days, today, user?.salatResetDate, trackingStart);
}

function peakWindow(hours: Array<{ hour: number; total: number }>): {
  start: number;
  sum: number;
  total: number;
} {
  const total = hours.reduce((a, h) => a + h.total, 0);
  let best = { start: 0, sum: -1 };
  for (let s = 0; s < 24; s++) {
    const sum = [0, 1, 2].reduce((a, k) => a + (hours[(s + k) % 24]?.total ?? 0), 0);
    if (sum > best.sum) best = { start: s, sum };
  }
  return { start: best.start, sum: best.sum, total };
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. Pattern insights
// ═════════════════════════════════════════════════════════════════════════════
export type FindingKind = 'strength' | 'timing' | 'attention';
export interface PatternFinding {
  id: string;
  kind: FindingKind;
  text: string;
  /** Our own computed sentence, set only when the model re-worded `text`.
   * The client caches the re-word against this so it is reused only while the
   * underlying numbers are unchanged. */
  original?: string;
}
export interface PatternInsightsResult {
  findings: PatternFinding[];
  /** True when the top findings were re-worded by the model. */
  ai: boolean;
  /** Days of history the analysis looked at (so the UI can say so). */
  windowDays: number;
}

const MIN_ZIKR_TOTAL = 100; // taps in 30 days before "your best time" means anything
const MIN_QURAN_MINUTES = 20;
const MIN_WEEKDAY_SAMPLE = 10; // prayers on a weekday before comparing it
const MIN_PRAYER_SAMPLE = 14;
const MIN_GAP = 10; // percentage points before a difference is worth mentioning

export async function getPatternInsights(
  userId: string,
  opts: { today?: string; timezoneOffset: number; phrase: boolean; language: AiLanguage }
): Promise<PatternInsightsResult> {
  const { timezoneOffset, language } = opts;
  const today = safeToday(opts.today);
  const [zikrHours, quranHours, salat, correlation] = await Promise.all([
    zikrService.getTimeOfDayDistribution(userId, 30, timezoneOffset),
    quranService.getQuranTimeOfDayDistribution(userId, 30, timezoneOffset),
    loadSalatAnalytics(userId, 90, today),
    salatService.getIshaFajrCorrelation(userId, timezoneOffset, today),
  ]);

  const scored: Array<PatternFinding & { score: number }> = [];

  // Best time for dhikr / Quran (concentration of the user's own activity).
  const z = peakWindow(zikrHours);
  if (z.total >= MIN_ZIKR_TOTAL) {
    const pct = Math.round((z.sum / z.total) * 100);
    if (pct >= 35) {
      scored.push({
        id: 'zikr-time',
        kind: 'timing',
        score: 60 + pct / 10,
        text: pick(
          language,
          `About ${pct}% of your dhikr in the last 30 days happens between ${windowLabel(language, z.start)}. That is your natural rhythm.`,
          `গত ৩০ দিনে আপনার যিকিরের প্রায় ${num(language, pct)}% হয়েছে ${windowLabel(language, z.start)}-এর মধ্যে। এটাই আপনার স্বাভাবিক ছন্দ।`
        ),
      });
    }
  }
  const q = peakWindow(quranHours);
  if (q.total >= MIN_QURAN_MINUTES) {
    const pct = Math.round((q.sum / q.total) * 100);
    if (pct >= 35) {
      scored.push({
        id: 'quran-time',
        kind: 'timing',
        score: 58 + pct / 10,
        text: pick(
          language,
          `Your Quran time clusters between ${windowLabel(language, q.start)}, about ${pct}% of your minutes in the last 30 days.`,
          `আপনার কুরআনের সময় বেশি জমে ${windowLabel(language, q.start)}-এর মধ্যে, গত ৩০ দিনের প্রায় ${num(language, pct)}% মিনিট।`
        ),
      });
    }
  }

  // Salat by weekday: one clearly weaker day compared with the rest.
  const days = Object.entries(salat.byWeekday)
    .map(([k, v]) => ({
      weekday: Number(k),
      total: v.total,
      rate: v.total > 0 ? ((v.completed + v.kaza) / v.total) * 100 : 0,
    }))
    .filter((d) => d.total >= MIN_WEEKDAY_SAMPLE);
  if (days.length >= 5) {
    const lowest = days.reduce((a, b) => (b.rate < a.rate ? b : a));
    const others = days.filter((d) => d.weekday !== lowest.weekday);
    const othersRate = others.reduce((a, d) => a + d.rate, 0) / others.length;
    const gap = Math.round(othersRate - lowest.rate);
    if (gap >= MIN_GAP) {
      const name = WEEKDAY_NAME[language][lowest.weekday] ?? '';
      scored.push({
        id: 'weekday-dip',
        kind: 'attention',
        score: 40 + gap,
        text: pick(
          language,
          `${name} is your quietest day for prayer: ${Math.round(lowest.rate)}% prayed, against ${Math.round(othersRate)}% on your other days.`,
          `${name} আপনার নামাযের সবচেয়ে শান্ত দিন: ${num(language, Math.round(lowest.rate))}% আদায়, অন্য দিনগুলোতে ${num(language, Math.round(othersRate))}%।`
        ),
      });
    }
  }

  // Strongest and weakest prayer.
  const rates = PRAYER_IDS.map((pid) => {
    const p = salat.perPrayer[pid];
    const done = (p?.completed ?? 0) + (p?.kaza ?? 0);
    const total = done + (p?.missed ?? 0);
    return { pid, total, rate: total > 0 ? (done / total) * 100 : 0 };
  }).filter((r) => r.total >= MIN_PRAYER_SAMPLE);
  if (rates.length >= 3) {
    const best = rates.reduce((a, b) => (b.rate > a.rate ? b : a));
    const worst = rates.reduce((a, b) => (b.rate < a.rate ? b : a));
    if (best.rate >= 75) {
      scored.push({
        id: 'strong-prayer',
        kind: 'strength',
        score: 70 + (best.rate - 75) / 5,
        text: pick(
          language,
          `${PRAYER_NAME.en[best.pid]} is your steadiest prayer, at ${Math.round(best.rate)}% over the last 90 days.`,
          `${PRAYER_NAME.bn[best.pid]} আপনার সবচেয়ে নিয়মিত নামায, গত ৯০ দিনে ${num(language, Math.round(best.rate))}%।`
        ),
      });
    }
    const gap = Math.round(best.rate - worst.rate);
    if (worst.pid !== best.pid && gap >= MIN_GAP) {
      scored.push({
        id: 'weak-prayer',
        kind: 'attention',
        score: 42 + gap,
        text: pick(
          language,
          `${PRAYER_NAME.en[worst.pid]} is the prayer that slips most often (${Math.round(worst.rate)}%). A small reminder just for it could help.`,
          `${PRAYER_NAME.bn[worst.pid]} নামাযটিই সবচেয়ে বেশি ছুটে যায় (${num(language, Math.round(worst.rate))}%)। শুধু এর জন্য একটি ছোট রিমাইন্ডার কাজে দিতে পারে।`
        ),
      });
    }
  }

  // Isha-to-Fajr link (already computed, needs enough samples on both sides).
  if (
    correlation.available &&
    correlation.earlyIshaFajrRate !== null &&
    correlation.lateIshaFajrRate !== null
  ) {
    const gap = correlation.earlyIshaFajrRate - correlation.lateIshaFajrRate;
    if (gap >= MIN_GAP) {
      scored.push({
        id: 'isha-fajr',
        kind: 'attention',
        score: 50 + gap,
        text: pick(
          language,
          `When you pray Isha before 11 PM, Fajr is on time ${correlation.earlyIshaFajrRate}% of mornings, against ${correlation.lateIshaFajrRate}% after a later Isha.`,
          `রাত ১১টার আগে এশা পড়লে ${num(language, correlation.earlyIshaFajrRate)}% সকালে ফজর সময়মতো হয়, দেরিতে এশা পড়লে ${num(language, correlation.lateIshaFajrRate)}%।`
        ),
      });
    }
  }

  // What tends to cause a missed prayer (only when the user tagged reasons).
  const reasons = Object.entries(salat.missedReasons)
    .filter(([k]) => k !== 'other')
    .sort((a, b) => b[1] - a[1]);
  const reasonTotal = Object.values(salat.missedReasons).reduce((a, b) => a + b, 0);
  const topReason = reasons[0];
  if (topReason && topReason[1] >= 3 && reasonTotal > 0) {
    const pct = Math.round((topReason[1] / reasonTotal) * 100);
    if (pct >= 40) {
      const label = REASON_NAME[language][topReason[0]] ?? topReason[0];
      scored.push({
        id: 'miss-reason',
        kind: 'attention',
        score: 45 + pct / 5,
        text: pick(
          language,
          `When a prayer slipped and you picked a reason, ${label} was the cause ${pct}% of the time.`,
          `যখন কোনো নামায ছুটেছে ও আপনি কারণ বেছেছেন, ${num(language, pct)}% ক্ষেত্রে কারণ ছিল ${label}।`
        ),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  // Keep the list balanced: never show only "attention" items when there is a
  // strength or timing finding to open with.
  const opener = scored.find((f) => f.kind !== 'attention');
  const ordered = opener ? [opener, ...scored.filter((f) => f !== opener)] : scored;
  const findings = ordered.slice(0, 4).map(({ score: _score, ...rest }) => rest);

  let ai = false;
  if (opts.phrase && findings.length > 0) {
    const top = findings.slice(0, 2);
    const worded = await rephrase(
      top.map((f) => f.text),
      'pattern-insights',
      userId,
      language
    );
    if (worded) {
      worded.forEach((text, i) => {
        const f = findings[i];
        if (f) {
          f.original = f.text;
          f.text = text;
        }
      });
      ai = true;
    }
  }
  return { findings, ai, windowDays: 90 };
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. Kaza payoff suggestion
// ═════════════════════════════════════════════════════════════════════════════
export interface KazaPlanResult {
  totalOwed: number;
  owed: Record<PrayerId, number>;
  /** Prayer to make up first (the one owed the longest), if any is itemized. */
  startWith: PrayerId | null;
  /** The prayer the user is steadiest at: the suggested moment to add a make-up prayer. */
  anchorPrayer: PrayerId | null;
  daysToClear: number;
  clearedBy: string | null;
  twoPerDayClearedBy: string | null;
  avgPayoffDays: number | null;
  /** Lines to show, in order (the first is the headline). */
  lines: string[];
  /** Our computed headline, set only when the model re-worded lines[0]. */
  originalHeadline?: string;
  ai: boolean;
}

export async function getKazaPlan(
  userId: string,
  opts: { today?: string; phrase: boolean; language: AiLanguage }
): Promise<KazaPlanResult> {
  const { language } = opts;
  const today = safeToday(opts.today);
  await salatDebtService.ensureCaughtUp(userId, today);
  const [debt, insights, salat] = await Promise.all([
    salatDebtService.getDebtReadOnly(userId),
    salatDebtService.getKazaInsights(userId),
    loadSalatAnalytics(userId, 90, today),
  ]);

  const total = debt.totalOwed;
  const base: Omit<KazaPlanResult, 'lines' | 'ai'> = {
    totalOwed: total,
    owed: debt.owed,
    startWith: insights.oldestOwed?.prayer ?? null,
    anchorPrayer: null,
    daysToClear: 0,
    clearedBy: null,
    twoPerDayClearedBy: null,
    avgPayoffDays: insights.avgPayoffDays,
  };

  if (total <= 0) {
    return {
      ...base,
      lines: [
        pick(
          language,
          'You have no make-up prayers on the list right now. Nothing to plan.',
          'এই মুহূর্তে আপনার কাযার তালিকায় কোনো নামায নেই। পরিকল্পনার কিছু নেই।'
        ),
      ],
      ai: false,
    };
  }

  // Steadiest prayer over the last 90 days = most reliable moment to attach a
  // make-up prayer to (habit stacking), not a claim about which prayer to make up.
  const steady = PRAYER_IDS.map((pid) => {
    const p = salat.perPrayer[pid];
    const done = (p?.completed ?? 0) + (p?.kaza ?? 0);
    const seen = done + (p?.missed ?? 0);
    return { pid, seen, rate: seen > 0 ? done / seen : 0 };
  })
    .filter((r) => r.seen >= MIN_PRAYER_SAMPLE)
    .sort((a, b) => b.rate - a.rate)[0];
  const anchor = steady?.pid ?? null;

  const daysToClear = total; // one a day, starting today
  const clearedBy = addDays(today, daysToClear - 1);
  const twoPerDayClearedBy = addDays(today, Math.ceil(total / 2) - 1);

  const lines: string[] = [];
  lines.push(
    pick(
      language,
      `You have ${total} make-up ${total === 1 ? 'prayer' : 'prayers'} to catch up on. One a day${anchor ? `, right after ${PRAYER_NAME.en[anchor]}` : ''}, you would finish by ${dateLabel(language, clearedBy)}${daysToClear >= 60 ? ` (${durationLabel(language, daysToClear)})` : ''}.`,
      `আপনার ${num(language, total)}টি কাযা নামায বাকি আছে। প্রতিদিন একটি করে${anchor ? `, ${PRAYER_NAME.bn[anchor]}-এর ঠিক পরে` : ''} পড়লে ${dateLabel(language, clearedBy)} নাগাদ শেষ হবে${daysToClear >= 60 ? ` (${durationLabel(language, daysToClear)})` : ''}।`
    )
  );
  if (total >= 4) {
    lines.push(
      pick(
        language,
        `Two a day would bring that to ${dateLabel(language, twoPerDayClearedBy)}.`,
        `প্রতিদিন দুটি করে পড়লে ${dateLabel(language, twoPerDayClearedBy)} নাগাদ শেষ হবে।`
      )
    );
  }
  if (base.startWith && insights.oldestOwed) {
    lines.push(
      pick(
        language,
        `The one owed longest is ${PRAYER_NAME.en[base.startWith]} from ${dateLabel(language, insights.oldestOwed.missedDate)}, a good one to start with.`,
        `সবচেয়ে পুরনো বাকি নামায ${dateLabel(language, insights.oldestOwed.missedDate)}-এর ${PRAYER_NAME.bn[base.startWith]}, এটি দিয়ে শুরু করতে পারেন।`
      )
    );
  }

  let ai = false;
  let originalHeadline: string | undefined;
  if (opts.phrase) {
    const worded = await rephrase([lines[0] as string], 'kaza-plan', userId, language);
    if (worded?.[0]) {
      originalHeadline = lines[0];
      lines[0] = worded[0];
      ai = true;
    }
  }

  return {
    ...base,
    anchorPrayer: anchor,
    daysToClear,
    clearedBy,
    twoPerDayClearedBy,
    lines,
    originalHeadline,
    ai,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. Ask-about-my-data (read-only)
// ═════════════════════════════════════════════════════════════════════════════
export const DATA_QUERY_IDS = [
  'salat_missed',
  'salat_prayed',
  'salat_rate',
  'salat_streak',
  'kaza_owed',
  'zikr_total',
  'zikr_streak',
  'quran_read',
  'quran_streak',
  'fasting_days',
] as const;
export type DataQueryId = (typeof DATA_QUERY_IDS)[number];
export const DATA_PERIODS = ['today', 'week', 'month', 'year'] as const;
export type DataPeriod = (typeof DATA_PERIODS)[number];

export interface DataQuery {
  query: DataQueryId;
  period?: DataPeriod;
  prayer?: PrayerId;
}

export interface DataAnswer {
  ok: true;
  answered: boolean;
  answer: string;
  query?: DataQuery;
  /** Set when a free-text question could not be answered, so the UI can say why. */
  reason?: 'unsupported' | 'unavailable';
}

const PERIOD_LABEL: Record<AiLanguage, Record<DataPeriod, string>> = {
  en: {
    today: 'today',
    week: 'in the last 7 days',
    month: 'so far this month',
    year: 'in the last year',
  },
  bn: {
    today: 'আজ',
    week: 'গত ৭ দিনে',
    month: 'এই মাসে এখন পর্যন্ত',
    year: 'গত এক বছরে',
  },
};

function periodDays(period: DataPeriod, today: string): number {
  if (period === 'today') return 1;
  if (period === 'week') return 7;
  if (period === 'year') return 365;
  return Math.max(1, Number(today.slice(8, 10)));
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

export async function runDataQuery(
  userId: string,
  q: DataQuery,
  opts: { today?: string; timezoneOffset: number; language: AiLanguage }
): Promise<DataAnswer> {
  const { language, timezoneOffset } = opts;
  const today = safeToday(opts.today);
  const period: DataPeriod = q.period ?? 'week';
  const days = periodDays(period, today);
  const when = PERIOD_LABEL[language][period];
  const N = (n: number): string => num(language, n);
  const done = (answer: string): DataAnswer => ({
    ok: true,
    answered: true,
    answer,
    query: { ...q, period },
  });

  switch (q.query) {
    case 'salat_missed':
    case 'salat_prayed':
    case 'salat_rate': {
      const a = await loadSalatAnalytics(userId, days, today);
      const p = q.prayer ? a.perPrayer[q.prayer] : undefined;
      const name = q.prayer ? PRAYER_NAME[language][q.prayer] : '';
      // "Counted over N days" note when tracking started inside the window.
      const note =
        a.totalDays < days
          ? pick(
              language,
              ` (counted over ${a.totalDays} ${plural(a.totalDays, 'day', 'days')}, since you started tracking)`,
              ` (${N(a.totalDays)} দিনের হিসাব, ট্র্যাকিং শুরুর পর থেকে)`
            )
          : '';
      if (q.query === 'salat_missed') {
        const n = p ? p.missed : a.missedCount;
        if (n === 0 && period === 'today') {
          return done(
            pick(
              language,
              "Nothing is marked missed today, and today's prayers are still open.",
              'আজ কোনো নামায ছুটে যাওয়া হিসেবে চিহ্নিত নেই, আজকের নামাযগুলো এখনো খোলা।'
            )
          );
        }
        return done(
          q.prayer
            ? pick(
                language,
                `You missed ${name} ${n} ${plural(n, 'time', 'times')} ${when}${note}.`,
                `${when} আপনার ${name} ${N(n)} বার ছুটেছে${note}।`
              )
            : pick(
                language,
                `You missed ${n} ${plural(n, 'prayer', 'prayers')} ${when}${note}.`,
                `${when} আপনার ${N(n)}টি নামায ছুটেছে${note}।`
              )
        );
      }
      if (q.query === 'salat_prayed') {
        const n = p ? p.completed + p.kaza : a.prayedTotal;
        const of = p ? a.totalDays : a.totalPossiblePrayers;
        return done(
          q.prayer
            ? pick(
                language,
                `You prayed ${name} on ${n} of ${of} ${plural(of, 'day', 'days')} ${when}${note}.`,
                `${when} ${N(of)} দিনের মধ্যে ${N(n)} দিন আপনি ${name} পড়েছেন${note}।`
              )
            : pick(
                language,
                `You prayed ${n} of ${of} prayers ${when}${note}.`,
                `${when} ${N(of)}টির মধ্যে ${N(n)}টি নামায পড়েছেন${note}।`
              )
        );
      }
      // salat_rate
      const rate = p
        ? a.totalDays > 0
          ? Math.round(((p.completed + p.kaza) / a.totalDays) * 100)
          : 0
        : a.completionRate;
      return done(
        q.prayer
          ? pick(
              language,
              `Your ${name} rate ${when} is ${rate}%${note}.`,
              `${when} আপনার ${name}-এর হার ${N(rate)}%${note}।`
            )
          : pick(
              language,
              `Your prayer rate ${when} is ${rate}%${note}.`,
              `${when} আপনার নামাযের হার ${N(rate)}%${note}।`
            )
      );
    }

    case 'salat_streak': {
      const a = await loadSalatAnalytics(userId, 365, today);
      const cur = q.prayer ? (a.perPrayer[q.prayer]?.currentStreak ?? 0) : a.currentStreak;
      const best = q.prayer ? (a.perPrayer[q.prayer]?.bestStreak ?? 0) : a.bestStreak;
      const what = q.prayer ? PRAYER_NAME[language][q.prayer] : '';
      return done(
        q.prayer
          ? pick(
              language,
              `Your ${what} streak is ${cur} ${plural(cur, 'day', 'days')}. Your best in the last year is ${best}.`,
              `আপনার ${what}-এর ধারাবাহিকতা ${N(cur)} দিন। গত এক বছরে সর্বোচ্চ ${N(best)} দিন।`
            )
          : pick(
              language,
              `Your all-five-prayers streak is ${cur} ${plural(cur, 'day', 'days')}. Your best in the last year is ${best}.`,
              `পাঁচ ওয়াক্ত নামাযের ধারাবাহিকতা ${N(cur)} দিন। গত এক বছরে সর্বোচ্চ ${N(best)} দিন।`
            )
      );
    }

    case 'kaza_owed': {
      await salatDebtService.ensureCaughtUp(userId, today);
      const debt = await salatDebtService.getDebtReadOnly(userId);
      if (q.prayer) {
        const n = debt.owed[q.prayer];
        return done(
          pick(
            language,
            `You owe ${n} ${PRAYER_NAME.en[q.prayer]} make-up ${plural(n, 'prayer', 'prayers')}.`,
            `আপনার ${PRAYER_NAME.bn[q.prayer]}-এর ${N(n)}টি কাযা বাকি আছে।`
          )
        );
      }
      const parts = PRAYER_IDS.filter((p) => debt.owed[p] > 0)
        .map((p) => `${PRAYER_NAME[language][p]} ${N(debt.owed[p])}`)
        .join(', ');
      return done(
        debt.totalOwed === 0
          ? pick(language, 'You have no make-up prayers owed.', 'আপনার কোনো কাযা নামায বাকি নেই।')
          : pick(
              language,
              `You owe ${debt.totalOwed} make-up ${plural(debt.totalOwed, 'prayer', 'prayers')} (${parts}).`,
              `আপনার মোট ${N(debt.totalOwed)}টি কাযা নামায বাকি (${parts})।`
            )
      );
    }

    case 'zikr_total': {
      const a = await getAnalyticsData(userId, days, timezoneOffset, today);
      const n = a.stats.total;
      return done(
        pick(
          language,
          `You counted ${n.toLocaleString('en-US')} dhikr ${when}.`,
          `${when} আপনি মোট ${N(n)}টি যিকির গণনা করেছেন।`
        )
      );
    }

    case 'zikr_streak': {
      const a = await getAnalyticsData(userId, 7, timezoneOffset, today);
      const cur = a.streak.currentStreak;
      const best = a.streak.longestStreak;
      return done(
        pick(
          language,
          `Your dhikr streak is ${cur} ${plural(cur, 'day', 'days')}. Your longest ever is ${best}.`,
          `আপনার যিকিরের ধারাবাহিকতা ${N(cur)} দিন। এখন পর্যন্ত সর্বোচ্চ ${N(best)} দিন।`
        )
      );
    }

    case 'quran_read': {
      const rows = await quranService.getHistory(userId, days, today);
      const pages = Math.round(rows.reduce((a, r) => a + r.pages, 0) * 10) / 10;
      const ayat = rows.reduce((a, r) => a + r.ayat, 0);
      if (pages === 0 && ayat === 0) {
        return done(
          pick(language, `No Quran reading is logged ${when}.`, `${when} কুরআন পড়া লগ করা নেই।`)
        );
      }
      const bits: string[] = [];
      if (pages > 0)
        bits.push(
          pick(language, `${pages} ${plural(pages, 'page', 'pages')}`, `${N(pages)} পৃষ্ঠা`)
        );
      if (ayat > 0) bits.push(pick(language, `${ayat} ayat`, `${N(ayat)}টি আয়াত`));
      return done(
        pick(
          language,
          `You read ${bits.join(' and ')} ${when}.`,
          `${when} আপনি ${bits.join(' ও ')} পড়েছেন।`
        )
      );
    }

    case 'quran_streak': {
      const s = await quranService.getSummary(userId, today);
      return done(
        pick(
          language,
          `Your Quran streak is ${s.streak} ${plural(s.streak, 'day', 'days')}. Your best is ${s.bestStreak}.`,
          `আপনার কুরআনের ধারাবাহিকতা ${N(s.streak)} দিন। সর্বোচ্চ ${N(s.bestStreak)} দিন।`
        )
      );
    }

    case 'fasting_days': {
      const rows = await fastingService.getHistory(userId, days, today);
      const n = rows.filter((r) => r.status === 'completed' && r.date <= today).length;
      return done(
        pick(
          language,
          `You completed ${n} ${plural(n, 'fast', 'fasts')} ${when}.`,
          `${when} আপনি ${N(n)}টি রোযা সম্পন্ন করেছেন।`
        )
      );
    }
  }
}

/** Human-readable menu of what can be asked, used in the model prompt. */
const QUERY_CATALOG = `- salat_missed: how many prayers were missed (optional prayer)
- salat_prayed: how many prayers were prayed (optional prayer)
- salat_rate: prayer completion percentage (optional prayer)
- salat_streak: consecutive-day prayer streak (optional prayer)
- kaza_owed: how many make-up (kaza) prayers are owed (optional prayer)
- zikr_total: how much dhikr was counted
- zikr_streak: dhikr streak
- quran_read: how much Quran was read (pages / ayat)
- quran_streak: Quran reading streak
- fasting_days: how many fasts were completed`;

/**
 * Free-text question -> one whitelisted query. The model only CHOOSES the query;
 * the answer text is always built by runDataQuery from the database. Anything
 * outside the catalog (fiqh, other people, edits, chit-chat) maps to "none".
 */
export async function askAboutData(
  userId: string,
  question: string,
  opts: { today?: string; timezoneOffset: number; language: AiLanguage }
): Promise<DataAnswer> {
  const clean = sanitizeForPrompt(question, 200);
  const unsupported = (): DataAnswer => ({
    ok: true,
    answered: false,
    reason: 'unsupported',
    answer: pick(
      opts.language,
      'I can only answer questions about your own numbers, like prayers, dhikr, Quran, fasting and make-up prayers. For anything about rulings, please ask a qualified scholar.',
      'আমি শুধু আপনার নিজের হিসাব নিয়ে উত্তর দিতে পারি, যেমন নামায, যিকির, কুরআন, রোযা ও কাযা। বিধান নিয়ে কিছু জানতে চাইলে দয়া করে একজন যোগ্য আলেমকে জিজ্ঞাসা করুন।'
    ),
  });
  if (!clean) return unsupported();

  const out = await complete(
    `Map the user's question (English or Bengali) to ONE read-only lookup over their own worship data. Available lookups:
${QUERY_CATALOG}

Periods: "today", "week" (last 7 days), "month" (this calendar month so far), "year" (last 365 days). If no time is given, use "week". "Prayer" is one of fajr|dhuhr|asr|maghrib|isha and is only used when the question names one.
If the question is not answerable by exactly one lookup above (rulings, advice, other people, changing data, general chat), use "none".
Reply ONLY as JSON: {"query": one of the lookup ids or "none", "period": "today"|"week"|"month"|"year", "prayer": prayer id or null}.`,
    asUntrustedData('Question', clean),
    500,
    { feature: 'data-chat', userId, language: opts.language }
  );
  if (!out) {
    return {
      ok: true,
      answered: false,
      reason: 'unavailable',
      answer: pick(
        opts.language,
        "Naseeh couldn't read that question right now. Try one of the quick questions below.",
        'নাসিহ এখন প্রশ্নটি বুঝতে পারেনি। নিচের দ্রুত প্রশ্নগুলোর একটি চেষ্টা করুন।'
      ),
    };
  }
  const parsed = parseLoose<{ query?: unknown; period?: unknown; prayer?: unknown }>(out.text);
  const query = (DATA_QUERY_IDS as readonly string[]).includes(parsed?.query as string)
    ? (parsed?.query as DataQueryId)
    : null;
  if (!query) return unsupported();
  const period = (DATA_PERIODS as readonly string[]).includes(parsed?.period as string)
    ? (parsed?.period as DataPeriod)
    : 'week';
  const prayer = (PRAYER_IDS as readonly string[]).includes(parsed?.prayer as string)
    ? (parsed?.prayer as PrayerId)
    : undefined;
  return runDataQuery(userId, { query, period, prayer }, opts);
}
