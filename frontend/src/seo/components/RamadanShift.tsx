// The visitor's one-day shift of a Ramadan calendar (R12): the control, the
// notes it shows, and the rows the table draws (see ../ramadanShift.ts).
import { useEffect } from 'react';
import { MONTHLY, type MonthlyLang } from '../locales/monthly.js';
import { RAMADAN_SHIFT } from '../locales/ramadanShift.js';
import { dateFormat } from '../utils/intl.js';
import type { RamadanDay, RamadanPlan } from '../utils/ramadanBd.js';
import {
  RAMADAN_SHIFTS,
  rowState,
  wireRamadanShift,
  type RamadanShape,
  type RowState,
} from '../ramadanShift.js';

export function ramadanShape(plan: RamadanPlan): RamadanShape {
  return {
    maxFast: plan.possible30 ? 30 : plan.days.length,
    possible30: !!plan.possible30,
  };
}

/** Every row the table draws, with its state as built (shift 0): the day
 * before fast 1 and the day after the last are there, hidden. */
export function ramadanRows(plan: RamadanPlan): { day: RamadanDay; state: RowState }[] {
  const shape = ramadanShape(plan);
  const days = [
    plan.before,
    ...plan.days,
    ...(plan.possible30 ? [plan.possible30] : []),
    plan.after,
  ];
  return days.map((day) => ({ day, state: rowState(day.fast, 0, shape) }));
}

/** Rows above which the "if Ramadan has 30 days" label can stand: the 30th
 * as built, or one row either side of it after a shift. */
export function possibleLabelRows(plan: RamadanPlan): number[] {
  return plan.possible30 ? [29, 30, 31] : [];
}

/** The attributes of the calendar's <table>. */
export function ramadanTableAttrs(plan: RamadanPlan, lang: MonthlyLang) {
  const shape = ramadanShape(plan);
  return {
    'data-ramadan-table': '',
    'data-max-fast': String(shape.maxFast),
    'data-possible30': shape.possible30 ? '1' : '0',
    'data-digits': lang === 'bn' ? 'bn' : 'latn',
  };
}

interface Props {
  lang: MonthlyLang;
  /** The page's path without the language: the saved shift's key. */
  barePath: string;
  look: 'world' | 'bustan';
}

/** "Did Ramadan begin on a different day where you live?" Hidden until the
 * script runs (no script, no control); never on paper. */
export function RamadanShiftControl({ lang, barePath, look }: Props) {
  const s = RAMADAN_SHIFT[lang];
  // In the app the router draws the page: wire it here. Prerendered pages
  // are wired by static-entry.ts (no effects run in renderToStaticMarkup).
  useEffect(() => wireRamadanShift(), []);
  const bustan = look === 'bustan';
  return (
    <div
      data-ramadan-shift={barePath}
      hidden
      className={`print:hidden mt-4 text-sm ${
        bustan
          ? 'rounded-card border border-brand-border bg-brand-deep px-4 py-3 text-white/80'
          : 'rounded-xl border border-[#1e2d42] bg-[#0d1520] p-3 text-[#94a3b8]'
      }`}
    >
      <p className={`font-semibold ${bustan ? 'text-white' : 'text-[#f1f5f9]'}`}>{s.question}</p>
      <p className="mt-0.5 text-xs">{s.explain}</p>
      <div role="group" aria-label={s.question} className="mt-2.5 flex flex-wrap gap-2">
        {RAMADAN_SHIFTS.map((v, i) => (
          <button
            key={v}
            type="button"
            data-shift-value={v}
            aria-pressed={v === 0}
            className={`min-h-11 px-3 py-2 text-xs font-semibold border ${
              bustan
                ? 'rounded-control border-brand-border text-white aria-pressed:border-brand-emerald aria-pressed:bg-brand-emerald/15'
                : 'rounded-lg border-[#1e2d42] text-[#f1f5f9] aria-pressed:border-[#10b981] aria-pressed:bg-[#10b981]/15'
            }`}
          >
            {s.options[i]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The note naming the visitor's first fast after a shift: on screen and on
 * the A4 sheet. Prerendered for both shifts, shown by the script. */
export function RamadanShiftNotes({
  lang,
  plan,
  className = '',
}: {
  lang: MonthlyLang;
  plan: RamadanPlan;
  className?: string;
}) {
  const s = RAMADAN_SHIFT[lang];
  const date = (d: RamadanDay) =>
    dateFormat(MONTHLY[lang].locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d.noon);
  const firstFast = { '-1': plan.before, '1': plan.days[1] };
  return (
    <>
      {(['-1', '1'] as const).map((v) => (
        <p key={v} data-shift-note={v} hidden role="status" className={className}>
          {s.adjusted(date(firstFast[v]))}
        </p>
      ))}
    </>
  );
}
