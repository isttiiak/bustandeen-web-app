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
  /** Shade the weekend days (`weekend`, 0 = Sunday). */
  weekendOn: boolean;
  weekend: number[];
  /** The side column's guide: which number is which calendar, and the colours. Off by default. */
  guide: boolean;
  /** Faint lines to write on in the rest of the side column. */
  lines: boolean;
}

export const DEFAULT_PRINT: Omit<PrintOptions, 'order' | 'at' | 'include' | 'weekend'> = {
  range: { kind: 'month' },
  inside: 'events',
  paper: 'A4',
  orient: 'landscape',
  color: 'color',
  template: 'bustan',
  weekendOn: true,
  guide: false,
  lines: true,
};

/** The weekend days a sheet shades: none when the weekend is turned off. */
export const printWeekend = (o: Pick<PrintOptions, 'weekendOn' | 'weekend'>): number[] =>
  o.weekendOn ? o.weekend : [];

/**
 * What a month with no listed days says, by the kinds of days listed: it may
 * only say "no holidays" when government holidays are listed. Null when
 * nothing is listed at all (the "This month" block is then left out).
 */
export function emptyMonthKey(
  kinds: readonly CalendarEvent['type'][]
): 'noneThisMonth' | 'noneSpecial' | 'noneHolidays' | null {
  const holidays = kinds.includes('holiday');
  const special = kinds.includes('islamic') || kinds.includes('national');
  if (holidays && special) return 'noneThisMonth';
  if (holidays) return 'noneHolidays';
  if (special) return 'noneSpecial';
  return null;
}

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

/**
 * Islamic days that come every week or every month (Mondays and Thursdays,
 * Fridays, the White Days). A printed month names them once in the side
 * column and marks their days with a small sign instead of a label.
 */
export const isRecurring = (e: CalendarEvent) => e.type === 'islamic' && e.recurring;

/** The small sign a recurring day gets in its box (Fridays get the column header instead). */
export type DayMark = 'fast' | 'white';
export function dayMarks(events: readonly CalendarEvent[]): DayMark[] {
  const marks: DayMark[] = [];
  if (events.some((e) => e.type === 'islamic' && e.id === 'fast_mon_thu')) marks.push('fast');
  if (events.some((e) => e.type === 'islamic' && e.id === 'ayyam_al_bid')) marks.push('white');
  return marks;
}

/** A day box's named events (recurring ones are marks): at most two lines, then "+N more". */
export function boxEvents(events: readonly CalendarEvent[]): {
  shown: CalendarEvent[];
  more: number;
} {
  const named = events.filter((e) => !isRecurring(e));
  if (named.length <= 2) return { shown: named, more: 0 };
  return { shown: named.slice(0, 2), more: named.length - 2 };
}

/**
 * The side column's dated list for a month: every event that is not
 * recurring, once, with the first ten days of Dhul Hijjah as one line (on
 * their first day).
 */
export function monthListEvents(
  days: readonly CalendarDay[],
  eventsOf: (d: CalendarDay) => CalendarEvent[]
): { day: CalendarDay; event: CalendarEvent; span?: [number, number] }[] {
  const out: { day: CalendarDay; event: CalendarEvent; span?: [number, number] }[] = [];
  for (const day of days) {
    for (const event of eventsOf(day)) {
      if (isRecurring(event)) continue;
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

export type RecurringLine =
  /** Every week on these weekdays (0 = Sunday), e.g. Mondays and Thursdays. */
  | { id: 'fast_mon_thu' | 'friday'; weekdays: number[] }
  /** The White Days: one line per run of days in the month, with its Hijri days. */
  | { id: 'ayyam_al_bid'; from: CalendarDay; to: CalendarDay };

/**
 * The side column's "Every week and month" lines: the recurring days that
 * fall in this month (a Monday that is Eid has no fast, so it is not counted;
 * its box simply has no mark).
 */
export function monthRecurring(
  days: readonly CalendarDay[],
  eventsOf: (d: CalendarDay) => CalendarEvent[]
): RecurringLine[] {
  const weekly = new Map<'fast_mon_thu' | 'friday', Set<number>>();
  const runs: { from: CalendarDay; to: CalendarDay }[] = [];
  let prev: CalendarDay | null = null;
  for (const day of days) {
    const ids = eventsOf(day).flatMap((e) => (e.type === 'islamic' && e.recurring ? [e.id] : []));
    for (const id of ids) {
      if (id === 'fast_mon_thu' || id === 'friday') {
        if (!weekly.has(id)) weekly.set(id, new Set());
        weekly.get(id)!.add(day.weekday);
      }
    }
    if (ids.includes('ayyam_al_bid')) {
      const last = runs[runs.length - 1];
      if (last && last.to === prev) last.to = day;
      else runs.push({ from: day, to: day });
    }
    prev = day;
  }
  const out: RecurringLine[] = [];
  for (const id of ['fast_mon_thu', 'friday'] as const) {
    const w = weekly.get(id);
    if (w) out.push({ id, weekdays: [...w].sort((a, b) => a - b) });
  }
  for (const r of runs) out.push({ id: 'ayyam_al_bid', ...r });
  return out;
}
