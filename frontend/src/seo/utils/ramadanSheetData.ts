// From a Ramadan plan to what the print sheets and the page parts draw
// (R2-R4): the shift's rows as plain strings, the fasting length, the
// expected Eid. Shared by RamadanCalendarPage and BdRamadanPage.
import type { RamadanDay, RamadanPlan } from './ramadanBd.js';
import { possibleLabelRows, ramadanRows } from '../components/RamadanShift.js';
import type { SheetRowData } from '../components/RamadanSheets.js';
import type { FastingLength } from '../components/RamadanPageParts.js';

export interface SheetFormat {
  fast: (n: number) => string;
  dateLabel: (d: RamadanDay) => string;
  weekday: (d: RamadanDay) => string;
  clock: (t: Date) => string;
}

/** Every row the calendar draws (the day before fast 1 and the day after the
 * last are there, hidden, for the visitor's one-day shift). */
export function sheetRows(plan: RamadanPlan, f: SheetFormat): SheetRowData[] {
  return ramadanRows(plan).map(({ day, state }) => ({
    row: day.fast,
    date: day.date,
    fast: state.fast,
    visible: state.visible,
    possible: state.possible,
    fastLabel: state.visible ? f.fast(state.fast) : '',
    dateLabel: f.dateLabel(day),
    weekday: f.weekday(day),
    sehri: f.clock(day.times.sehri),
    iftar: f.clock(day.times.maghrib),
  }));
}

export { possibleLabelRows };

const minutes = (d: RamadanDay) =>
  Math.round((d.times.maghrib.getTime() - d.times.sehri.getTime()) / 60_000);

/** From the end of suhoor to iftar, over the fasts the month surely has (the
 * possible 30th is left out). */
export function fastingLength(
  plan: RamadanPlan,
  dateLabel: (d: RamadanDay) => string
): FastingLength {
  const days = plan.days;
  let shortest = days[0];
  let longest = days[0];
  for (const d of days) {
    if (minutes(d) < minutes(shortest)) shortest = d;
    if (minutes(d) > minutes(longest)) longest = d;
  }
  return {
    first: minutes(days[0]),
    last: minutes(days[days.length - 1]),
    shortest: { minutes: minutes(shortest), dateLabel: dateLabel(shortest) },
    longest: { minutes: minutes(longest), dateLabel: dateLabel(longest) },
  };
}

const DAY = 86_400_000;

/** Noon UTC of the expected Eid: one day once the Shawwal moon has fixed the
 * month (or a 30-day month is built), else the day after the 29th and the
 * day after the possible 30th. */
export function eidDays(plan: RamadanPlan): Date[] {
  const last = plan.days[plan.days.length - 1].noon.getTime();
  if (plan.possible30) return [new Date(last + DAY), new Date(last + 2 * DAY)];
  return [new Date(last + DAY)];
}
