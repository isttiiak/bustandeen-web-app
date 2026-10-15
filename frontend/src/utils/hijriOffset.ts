// The pure moon-sighting rule (T4.1, month-start records since v5.157.0),
// shared by the app (islamicCalendar.ts reads the on-device settings) and the
// prerendered Ramadan calendars (T4.4, which apply Bangladesh's records at
// build time). No i18n, storage or DOM here: the SSR bundle imports it.
//
// A record says "{month} {year} began on {startDate} in {country}", as the
// national committee announced it. A month has 29 or 30 days and starts on
// the announced sighting (else the month completes 30), which a shift of
// Umm al-Qura cannot express when Umm al-Qura's month has 29 days and the
// country's has 30 (Ramadan 1448 in Bangladesh may be exactly that).

export interface MoonSightingRecord {
  id: string;
  country: string;
  hijriYear: number;
  /** 1-12 */
  hijriMonth: number;
  /** YYYY-MM-DD: the 1st of that month in the country */
  startDate: string;
  /** Derived by the server for app builds from before v5.157.0 (the old
   * shift model): the first day of the shift, and the shift (-1..+1). */
  effectiveFrom: string;
  offset: number;
  note: string;
  sourceUrl?: string;
}

export interface HijriYmd {
  year: number;
  month: number;
  day: number;
}

export interface HijriDaySource {
  hijri: HijriYmd;
  /** Days relative to Umm al-Qura of the record in force (the user's own
   * offset when manual); 0 without one. Settings describes it. */
  offset: number;
  source: 'manual' | 'country' | 'none';
  record?: MoonSightingRecord;
}

const DAY = 86_400_000;

/** The user's own offset (Settings): -1, 0 or +1. */
export const clampOffset = (n: number): number => (n === -1 || n === 1 ? n : 0);

/** How far a record's start may be from Umm al-Qura's 1st of that month. */
export const MAX_RECORD_SHIFT = 2;

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);
}

// One formatter and a per-day cache: the prerender asks for the same few
// hundred days on thousands of pages (T4.4: never a new Intl.* per call).
let uqFormat: Intl.DateTimeFormat | null = null;
const uqCache = new Map<string, HijriYmd>();

/** Umm al-Qura date of a civil day (YYYY-MM-DD). */
export function ummAlQura(day: string): HijriYmd {
  const hit = uqCache.get(day);
  if (hit) return hit;
  uqFormat ??= new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const parts = uqFormat.formatToParts(new Date(`${day}T12:00:00Z`));
  const num = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  const h = { year: num('year'), month: num('month'), day: num('day') };
  uqCache.set(day, h);
  return h;
}

/** Days from the record's start to Umm al-Qura's 1st of the same month:
 * -1 = the country began a day after Umm al-Qura. null when Umm al-Qura's
 * 1st is more than MAX_RECORD_SHIFT days away (a wrong record: ignored). */
export function recordShift(
  r: Pick<MoonSightingRecord, 'hijriYear' | 'hijriMonth' | 'startDate'>
): number | null {
  for (const k of [0, -1, 1, -2, 2]) {
    const h = ummAlQura(addDays(r.startDate, k));
    if (h.year === r.hijriYear && h.month === r.hijriMonth && h.day === 1) return k;
  }
  return null;
}

export function nextHijriMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** Umm al-Qura's 1st of the month that `day` falls in. */
const uqMonthStart = (day: string): string => addDays(day, 1 - ummAlQura(day).day);

/** Days [from, to) shown as Umm al-Qura shifted by `shift`; `from` itself is the
 * 30th of the month before when `thirtieth` is set. */
interface Approach {
  from: string;
  to: string;
  shift: number;
  thirtieth: boolean;
}

/**
 * The days just before a record whose shift differs from the one in force
 * (`base`: the previous record's shift, or 0). A late start means the month
 * before it ended a day later, an early start a day sooner; since every month
 * has 29 or 30 days, the difference goes back to the nearest month that can
 * take it: a 29-day Umm al-Qura month gains its 30th, or a 30-day one loses
 * it. Between that month and the record, days follow Umm al-Qura shifted by
 * the record's shift. One step per day of difference (a shift of 2 needs two
 * such months). `floor`: the first day the previous record no longer covers.
 * null when no month within a year can take it (records that contradict
 * each other): the caller then keeps the old rule.
 */
function approachRecord(
  next: MoonSightingRecord,
  base: number,
  floor: string | null
): Approach[] | null {
  const out: Approach[] = [];
  let shift = recordShift(next)!;
  let to = next.startDate;
  // Umm al-Qura month starts, newest first, from just after the record; each
  // month can take one day only, so the next step looks further back.
  let start = uqMonthStart(addDays(to, 2));
  while (shift !== base) {
    const late = shift < base;
    let found: Approach | null = null;
    for (let i = 0; i < 13 && !found; i++, start = uqMonthStart(addDays(start, -1))) {
      const before = ummAlQura(addDays(start, -1)).day;
      // late: the 29th of a 29-day month repeats on `from`, shown as its 30th;
      // early: the 30th of a 30-day month is skipped at `from`.
      const from = late ? addDays(start, -shift - 1) : addDays(start, -shift);
      if (floor !== null && from < floor) break;
      if (late ? before === 29 && from < to : before === 30 && from <= to) {
        found = { from, to, shift, thirtieth: late };
      }
    }
    if (!found) return null;
    out.push(found);
    to = found.from;
    shift += late ? 1 : -1;
  }
  return out;
}

const isNextMonth = (a: MoonSightingRecord, b: MoonSightingRecord): boolean => {
  const n = nextHijriMonth(a.hijriYear, a.hijriMonth);
  return b.hijriYear === n.year && b.hijriMonth === n.month;
};

/**
 * The pure rule (unit-tested): the Hijri date of `day` (YYYY-MM-DD).
 *   - The user's own offset wins: Umm al-Qura shifted by it.
 *   - R = the country's latest record that has started: its month, day n,
 *     for n up to 29, and day 30 when the next month's record starts later.
 *   - Before a record that began late (or early), its shift applies backwards
 *     to the nearest month that can take the extra (or missing) day, so
 *     Umm al-Qura's 1st never shows a day early ("30 Sha'ban", not "1 Ramadan")
 *     and no day repeats (approachRecord).
 *   - Otherwise Umm al-Qura shifted by R's shift (a forecast until the next
 *     announcement), or plain Umm al-Qura before the country's first record.
 */
export function resolveHijriDay(input: {
  manual: boolean;
  userOffset: number;
  country: string | null;
  records: readonly MoonSightingRecord[];
  day: string;
}): HijriDaySource {
  const { day } = input;
  if (input.manual) {
    const offset = clampOffset(input.userOffset);
    return { hijri: ummAlQura(addDays(day, offset)), offset, source: 'manual' };
  }
  const none: HijriDaySource = { hijri: ummAlQura(day), offset: 0, source: 'none' };
  if (!input.country) return none;

  const mine = input.records
    .filter((r) => r.country === input.country && recordShift(r) !== null)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  let prev: MoonSightingRecord | undefined;
  let next: MoonSightingRecord | undefined;
  for (const r of mine) {
    if (r.startDate <= day) prev = r;
    else {
      next = r;
      break;
    }
  }

  if (prev) {
    const n = daysBetween(prev.startDate, day) + 1;
    const offset = recordShift(prev)!;
    const inMonth = n <= 29 || (n === 30 && next !== undefined && isNextMonth(prev, next));
    if (inMonth) {
      return {
        hijri: { year: prev.hijriYear, month: prev.hijriMonth, day: n },
        offset,
        source: 'country',
        record: prev,
      };
    }
  }
  if (next) {
    const base = prev ? recordShift(prev)! : 0;
    const steps = approachRecord(next, base, prev ? addDays(prev.startDate, 29) : null);
    const step = steps?.find((s) => s.from <= day && day < s.to);
    if (step) {
      const h = ummAlQura(addDays(day, step.shift));
      return {
        hijri: step.thirtieth && day === step.from ? { ...h, day: 30 } : h,
        offset: step.shift,
        source: 'country',
        record: next,
      };
    }
    const offset = recordShift(next)!;
    if (!steps && offset < 0 && daysBetween(day, next.startDate) <= -offset) {
      return {
        hijri: ummAlQura(addDays(day, offset)),
        offset,
        source: 'country',
        record: next,
      };
    }
  }
  if (prev) {
    const offset = recordShift(prev)!;
    return {
      hijri: ummAlQura(addDays(day, offset)),
      offset,
      source: 'country',
      record: prev,
    };
  }
  return none;
}
