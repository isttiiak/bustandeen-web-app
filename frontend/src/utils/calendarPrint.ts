// What a calendar download contains (Islamic calendar, Library): which
// months, which calendars in which corner, and what each day box and the
// side column list. Pure; the pages are drawn by components/calendar/print.
// Layout "Corners" (approved prototype v3): the first calendar is the big
// number, the second top right, the third under the big number.

import {
  hasHolidays,
  hasNationalDays,
  type CalendarEvent,
  type EventFilters,
} from './calendarEvents.js';
import {
  monthDays,
  monthInWindow,
  stepMonth,
  type CalendarDay,
  type CalendarKind,
  type CalendarWindow,
  type DayResolver,
} from './calendarMonth.js';
import { calendarWindow } from './calendarMonth.js';

export type PrintRange =
  | { kind: 'month' }
  | { kind: 'year'; layout: 'pages' | 'glance' }
  | { kind: 'range'; from: string; to: string };

/** What a download lists (the screen's own event settings are separate). */
export interface PrintInclude {
  islamic: boolean;
  /** Under Islamic days: Monday and Thursday fasts and the White Days. */
  sunnahFasts: boolean;
  /** Under Islamic days: every Friday (Jumu'ah). */
  fridays: boolean;
  /** Government holidays: a curated list per year, so these keep the three-year window. */
  holidays: boolean;
  national: boolean;
}

export interface PrintOptions {
  /** 1 to 3 calendars; the first is the big number. */
  order: CalendarKind[];
  /** A day in the month (or year) to print, chosen in the download sheet. */
  at: string;
  include: PrintInclude;
  range: PrintRange;
  /** Each day box shows its events, or ruled lines to write on. */
  inside: 'events' | 'blank';
  paper: 'A4' | 'Letter';
  orient: 'landscape' | 'portrait';
  color: 'color' | 'mono';
  template: 'bustan' | 'classic' | 'minimal';
}

export const DEFAULT_PRINT: Omit<PrintOptions, 'order' | 'at' | 'include'> = {
  range: { kind: 'month' },
  inside: 'events',
  paper: 'A4',
  orient: 'landscape',
  color: 'color',
  template: 'bustan',
};

/**
 * What a download lists to start with: Islamic days everywhere; in a country
 * with curated national days (Bangladesh, Pakistan, ...) those too. Government holidays are
 * never on by default: their lists are entered by hand each year.
 */
export function defaultInclude(country: string | null): PrintInclude {
  return {
    islamic: true,
    sunnahFasts: false,
    fridays: false,
    holidays: false,
    national: hasNationalDays(country),
  };
}

/** The event filters a download prints with. */
export function includeFilters(country: string | null, inc: PrintInclude): EventFilters {
  return {
    country,
    islamic: inc.islamic,
    holidays: inc.holidays && hasHolidays(country),
    national: inc.national && hasNationalDays(country),
    monThu: inc.sunnahFasts,
    whiteDays: inc.sunnahFasts,
    fridays: inc.fridays,
  };
}

/** Years either side of today a download without government holidays can reach. */
export const OPEN_YEARS = 25;

/**
 * The months a download may include: with government holidays, the screen's
 * window (last year to next year, the years whose lists are entered by hand);
 * without them, the Islamic days and national days follow rules, so any year
 * within OPEN_YEARS of today.
 */
export function downloadWindow(today: string, holidays: boolean): CalendarWindow {
  if (holidays) return calendarWindow(today);
  const y = Number(today.slice(0, 4));
  return { from: `${y - OPEN_YEARS}-01-01`, to: `${y + OPEN_YEARS}-12-31` };
}

/** At most this many months in one download (one year). */
export const MAX_PRINT_MONTHS = 12;

/** Downloads one device may start in an hour, so nothing runs away. */
export const DOWNLOADS_PER_HOUR = 10;
const HOUR = 60 * 60 * 1000;
export const DOWNLOAD_LOG_KEY = 'bustandeen_calendar_downloads';

/** Download times within the last hour, from the stored log (bad data reads as none). */
export function recentDownloads(raw: string | null, now: number): number[] {
  let list: unknown;
  try {
    list = JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
  return Array.isArray(list)
    ? list.filter((t): t is number => typeof t === 'number' && t <= now && now - t < HOUR)
    : [];
}

/** Minutes until the next download is allowed, or 0 when one is allowed now. */
export function downloadWaitMinutes(recent: readonly number[], now: number): number {
  if (recent.length < DOWNLOADS_PER_HOUR) return 0;
  const oldest = Math.min(...recent);
  return Math.max(1, Math.ceil((oldest + HOUR - now) / 60_000));
}

/** Sheet size in CSS px (96 per inch): A4 297 x 210 mm, Letter 11 x 8.5 in. */
export function sheetSize(paper: PrintOptions['paper'], orient: PrintOptions['orient']) {
  const [long, short] = paper === 'A4' ? [1123, 794] : [1056, 816];
  return orient === 'landscape' ? { width: long, height: short } : { width: short, height: long };
}

/** The @page rule for the print sheet. */
export const pageRule = (o: Pick<PrintOptions, 'paper' | 'orient'>) =>
  `@page { size: ${o.paper} ${o.orient}; margin: 0; }`;

/** The first day of the year (in the main calendar) that `anchor` is in. */
export function yearStart(anchor: string, kind: CalendarKind, day: DayResolver): string {
  let first = monthDays(anchor, kind, day)[0]!.ymd;
  for (let i = 0; i < 12; i++) {
    const d = day(first);
    const isFirstMonth =
      kind === 'greg'
        ? first.slice(5, 7) === '01'
        : kind === 'hijri'
          ? d.hijri.month === 1
          : d.bengali.month === 1;
    if (isFirstMonth) return first;
    first = stepMonth(first, kind, -1, day);
  }
  return first;
}

/** The months to print, as the first day of each (in the first calendar),
 * keeping only those in the calendar's window when one is given. */
export function printMonths(
  anchor: string,
  o: PrintOptions,
  day: DayResolver,
  bounds?: CalendarWindow
): string[] {
  const kind = o.order[0] ?? 'greg';
  const all = allPrintMonths(anchor, o, day).slice(0, MAX_PRINT_MONTHS);
  return bounds ? all.filter((a) => monthInWindow(monthDays(a, kind, day), bounds)) : all;
}

function allPrintMonths(anchor: string, o: PrintOptions, day: DayResolver): string[] {
  const kind = o.order[0] ?? 'greg';
  const first = (ymd: string) => monthDays(ymd, kind, day)[0]!.ymd;
  if (o.range.kind === 'month') return [first(anchor)];
  if (o.range.kind === 'year') {
    const out = [yearStart(anchor, kind, day)];
    while (out.length < 12) out.push(stepMonth(out[out.length - 1]!, kind, 1, day));
    return out;
  }
  const from = first(o.range.from);
  const to = first(o.range.to);
  const out = [from <= to ? from : to];
  const last = from <= to ? to : from;
  // At most a year of pages.
  while (out[out.length - 1]! < last && out.length < MAX_PRINT_MONTHS) {
    out.push(stepMonth(out[out.length - 1]!, kind, 1, day));
  }
  return out;
}

/** A day box's events: at most two lines, then "+N more" (the side column lists all). */
export function boxEvents(events: readonly CalendarEvent[]): {
  shown: CalendarEvent[];
  more: number;
} {
  if (events.length <= 2) return { shown: [...events], more: 0 };
  return { shown: events.slice(0, 2), more: events.length - 2 };
}

/**
 * The side column's list for a month: every event once, with White Days and
 * the first ten days of Dhul Hijjah as one line each (on their first day).
 */
export function monthListEvents(
  days: readonly CalendarDay[],
  eventsOf: (d: CalendarDay) => CalendarEvent[]
): { day: CalendarDay; event: CalendarEvent; span?: [number, number] }[] {
  const out: { day: CalendarDay; event: CalendarEvent; span?: [number, number] }[] = [];
  for (const day of days) {
    for (const event of eventsOf(day)) {
      if (event.type === 'islamic' && event.id === 'ayyam_al_bid') {
        if (day.hijri.day !== 13 && !(day === days[0] && day.hijri.day > 13)) continue;
        out.push({ day, event, span: [13, 15] });
        continue;
      }
      if (event.type === 'islamic' && event.id === 'dhul_hijjah_first10') {
        if (day.hijri.day !== 1 && day !== days[0]) continue;
        out.push({ day, event, span: [1, 10] });
        continue;
      }
      out.push({ day, event });
    }
  }
  return out;
}
