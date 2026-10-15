// The Islamic calendar's month grid (Library): the days of a Gregorian,
// Hijri or Bengali month with all three dates for each day. Pure: the Hijri
// inputs (own offset, country, moon-sighting records) are passed in, read once
// per render with readHijriInputs() (islamicCalendar.ts), not per cell.
//
// Days are civil dates (YYYY-MM-DD) and each shows its daytime Hijri date;
// the screen says that a Hijri date begins at the previous Maghrib.

import { bengaliDate, type BengaliDate } from './bengaliCalendar.js';
import {
  addDays,
  resolveHijriDay,
  type HijriDaySource,
  type HijriYmd,
  type MoonSightingRecord,
} from './hijriOffset.js';

export type CalendarKind = 'greg' | 'hijri' | 'bn';

export interface HijriInputs {
  manual: boolean;
  userOffset: number;
  country: string | null;
  records: readonly MoonSightingRecord[];
}

export interface CalendarDay {
  ymd: string;
  /** 0 = Sunday ... 6 = Saturday */
  weekday: number;
  hijri: HijriYmd;
  /** Where the Hijri date comes from (own offset, a country record, Umm al-Qura). */
  hijriSource: HijriDaySource['source'];
  record?: MoonSightingRecord;
  bengali: BengaliDate;
}

export type DayResolver = (ymd: string) => CalendarDay;

/** One resolver per set of inputs; it remembers each day it built. */
export function calendarDays(inputs: HijriInputs): DayResolver {
  const cache = new Map<string, CalendarDay>();
  return (ymd) => {
    const hit = cache.get(ymd);
    if (hit) return hit;
    const src = resolveHijriDay({ ...inputs, day: ymd });
    const day: CalendarDay = {
      ymd,
      weekday: new Date(`${ymd}T12:00:00Z`).getUTCDay(),
      hijri: src.hijri,
      hijriSource: src.source,
      record: src.record,
      bengali: bengaliDate(ymd),
    };
    cache.set(ymd, day);
    return day;
  };
}

/** The month a day belongs to in a calendar, as a comparable key. */
export function monthKey(day: CalendarDay, kind: CalendarKind): string {
  if (kind === 'greg') return day.ymd.slice(0, 7);
  if (kind === 'hijri') return `${day.hijri.year}-${day.hijri.month}`;
  return `${day.bengali.year}-${day.bengali.month}`;
}

/** Every day of the month that `anchor` falls in, first to last. */
export function monthDays(anchor: string, kind: CalendarKind, day: DayResolver): CalendarDay[] {
  const key = monthKey(day(anchor), kind);
  let first = anchor;
  // A month has at most 31 days; the bound guards against bad input.
  for (let i = 0; i < 31 && monthKey(day(addDays(first, -1)), kind) === key; i++) {
    first = addDays(first, -1);
  }
  const out: CalendarDay[] = [];
  for (let d = first, i = 0; i < 31 && monthKey(day(d), kind) === key; d = addDays(d, 1), i++) {
    out.push(day(d));
  }
  return out;
}

/** The first day of the month before (-1) or after (+1) the one `anchor` is in. */
export function stepMonth(
  anchor: string,
  kind: CalendarKind,
  step: -1 | 1,
  day: DayResolver
): string {
  const days = monthDays(anchor, kind, day);
  const edge = step === 1 ? addDays(days[days.length - 1].ymd, 1) : addDays(days[0].ymd, -1);
  return monthDays(edge, kind, day)[0].ymd;
}

/** Weekdays in grid order for a week starting on `weekStart` (0 = Sunday). */
export function weekdayOrder(weekStart: number): number[] {
  return [0, 1, 2, 3, 4, 5, 6].map((i) => (i + weekStart) % 7);
}

/** Empty cells before the 1st in a grid whose week starts on `weekStart`. */
export function leadingBlanks(firstWeekday: number, weekStart: number): number {
  return (firstWeekday - weekStart + 7) % 7;
}

export interface CalendarWindow {
  from: string;
  to: string;
}

/**
 * The years the calendar shows and downloads: last year, this year and next
 * year (Istiak, 2026-10-15). Further out, Hijri dates are only Umm al-Qura
 * estimates and no holiday list exists yet.
 */
export function calendarWindow(today: string): CalendarWindow {
  const y = Number(today.slice(0, 4));
  return { from: `${y - 1}-01-01`, to: `${y + 1}-12-31` };
}

/** Whether a month overlaps the window (a Hijri month at the edge still counts). */
export function monthInWindow(days: readonly CalendarDay[], w: CalendarWindow): boolean {
  if (!days.length) return false;
  return days[0]!.ymd <= w.to && days[days.length - 1]!.ymd >= w.from;
}
