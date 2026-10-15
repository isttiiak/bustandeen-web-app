// What a calendar download contains (Islamic calendar, Library): which
// months, which calendars in which corner, and what each day box and the
// side column list. Pure; the pages are drawn by components/calendar/print.
// Layout "Corners" (approved prototype v3): the first calendar is the big
// number, the second top right, the third under the big number.

import type { CalendarEvent } from './calendarEvents.js';
import {
  monthDays,
  stepMonth,
  type CalendarDay,
  type CalendarKind,
  type DayResolver,
} from './calendarMonth.js';

export type PrintRange =
  | { kind: 'month' }
  | { kind: 'year'; layout: 'pages' | 'glance' }
  | { kind: 'range'; from: string; to: string };

export interface PrintOptions {
  /** 1 to 3 calendars; the first is the big number. */
  order: CalendarKind[];
  range: PrintRange;
  /** Each day box shows its events, or ruled lines to write on. */
  inside: 'events' | 'blank';
  paper: 'A4' | 'Letter';
  orient: 'landscape' | 'portrait';
  color: 'color' | 'mono';
  template: 'bustan' | 'classic' | 'minimal';
}

export const DEFAULT_PRINT: Omit<PrintOptions, 'order'> = {
  range: { kind: 'month' },
  inside: 'events',
  paper: 'A4',
  orient: 'landscape',
  color: 'color',
  template: 'bustan',
};

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

/** The months to print, as the first day of each (in the first calendar). */
export function printMonths(anchor: string, o: PrintOptions, day: DayResolver): string[] {
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
  // At most two years of pages.
  while (out[out.length - 1]! < last && out.length < 24) {
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
