// The Ramadan timetable of the A4 sheet (T4.4, Bustan look): the district
// calendars (BdRamadanPage) and the app's own sheet for the saved place
// (pages/RamadanTracker.tsx, audit R12) draw the same table. Plain strings
// in, so it serves the prerender and the app alike.

export interface RamadanSheetTableRow {
  /** `YYYY-MM-DD` */
  date: string;
  fast: string;
  dateLabel: string;
  weekday: string;
  sehri: string;
  iftar: string;
}

interface Props {
  caption: string;
  columns: { fast: string; date: string; sehri: string; iftar: string };
  rows: RamadanSheetTableRow[];
  /** The day after a 29-day month, until the Shawwal moon settles it. */
  possible30?: RamadanSheetTableRow | null;
  possible30Label: string;
  /** The zone the times are on (`data-timezone`). */
  timezone?: string;
}

export default function RamadanSheetTable({
  caption,
  columns,
  rows,
  possible30,
  possible30Label,
  timezone,
}: Props) {
  const row = (d: RamadanSheetTableRow, possible = false) => (
    <tr
      key={d.date}
      data-date={d.date}
      className={`border-t border-brand-border/60 text-white aria-[current=date]:bg-brand-emerald/15 ${
        possible ? 'text-white/70' : ''
      }`}
    >
      <th scope="row" className="py-2 ps-3 pe-1 text-start font-bold">
        {d.fast}
        {possible && <span className="sr-only"> ({possible30Label})</span>}
      </th>
      <td className="px-2 py-2">
        {d.dateLabel} <small className="text-[11px] text-white/60">{d.weekday}</small>
      </td>
      <td className="px-2 py-2 text-center font-semibold text-brand-emerald">{d.sehri}</td>
      <td className="px-2 py-2 pe-3 text-center font-semibold text-brand-gold">{d.iftar}</td>
    </tr>
  );

  return (
    <div className="mt-4 print:mt-0 overflow-x-auto rounded-card border border-brand-border bg-brand-deep shadow-elev-2">
      <table
        data-month-table=""
        data-timezone={timezone}
        className="w-full border-collapse text-sm tabular-nums"
      >
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-xs font-semibold text-white/70">
            <th scope="col" className="py-2.5 ps-3 pe-1 text-start">
              {columns.fast}
            </th>
            <th scope="col" className="px-2 py-2.5 text-start">
              {columns.date}
            </th>
            <th scope="col" className="px-2 py-2.5 text-center">
              {columns.sehri}
            </th>
            <th scope="col" className="px-2 py-2.5 pe-3 text-center">
              {columns.iftar}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => row(d))}
          {possible30 && (
            <>
              <tr>
                <td
                  colSpan={4}
                  aria-hidden="true"
                  className="border-t border-brand-border/60 bg-shade/20 px-3 py-1 text-[11px] font-semibold text-brand-gold"
                >
                  {possible30Label}
                </td>
              </tr>
              {row(possible30, true)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
