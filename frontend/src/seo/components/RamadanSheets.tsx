// The three A4 Ramadan sheets (R2-R4, prototype
// docs/design/ramadan-print-sheet.html approved 2026-10-17): every Ramadan
// calendar page and the app's sheet for the saved place draw all three,
// hidden on screen. The download buttons pick one and the ink before the
// print window opens (html[data-print-variant], html[data-print-ink]; plain
// Ctrl+P prints the timetable in colour). Styles: styles/global.css
// ("Ramadan print sheets").
//
// Rows carry the one-day shift's attributes (../ramadanShift.ts), so a
// visitor who moved the calendar prints the moved numbering and stars.
// Plain strings in: the SSR pages and the app format their own times.
import { Fragment, type ReactNode } from 'react';
import type { QrPath } from '../utils/qr.js';
import { LAYLAT_AL_QADR_DUA } from '../content/ramadanDuas.js';
import { RAMADAN_SHEET, SHEET_VARIANTS, type SheetLang } from '../locales/ramadanSheet.js';
import { isOddNightFast } from '../ramadanShift.js';

export interface SheetRowData {
  /** The shift's row index (`data-ramadan-row`): the built fast, 0 = the day before. */
  row: number;
  /** `YYYY-MM-DD` */
  date: string;
  /** The fast this row holds as drawn (0 or past the month: hidden). */
  fast: number;
  visible: boolean;
  possible: boolean;
  /** The fast number in the page's digits ('' when hidden). */
  fastLabel: string;
  dateLabel: string;
  weekday: string;
  sehri: string;
  iftar: string;
}

export interface SheetFitra {
  line: string;
  pending: string;
  source: string;
}

export interface RamadanSheetsProps {
  lang: SheetLang;
  title: string;
  checklistTitle: string;
  place: string;
  sub: string;
  url: string;
  qr?: QrPath;
  rows: SheetRowData[];
  /** Rows above which "if Ramadan has 30 days" can stand (the shift moves it). */
  labelRows: readonly number[];
  possible30Label: string;
  /** The shift's table attributes (ramadanTableAttrs); none in the app. */
  tableAttrs?: Record<string, string>;
  /** Sehri ends before Fajr (Bangladesh, R0c countries): no "(Fajr)". */
  sehriBeforeFajr: boolean;
  /** "9 March or 10 March" */
  eid: string;
  /** Bangladesh: Islamic Foundation's announced amounts. */
  fitra?: SheetFitra;
}

const Leaf = () => (
  <svg
    viewBox="0 0 24 24"
    width="13"
    height="13"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
  >
    <path d="M12 21c0-7 3-12 8-15-1 8-4 13-8 15zM12 21C12 14 9 9 4 6c1 8 4 13 8 15z" />
  </svg>
);

const Box = () => <span className="rs-box" aria-hidden="true" />;

export default function RamadanSheets(p: RamadanSheetsProps) {
  const s = RAMADAN_SHEET[p.lang];
  const sehriHead = p.sehriBeforeFajr ? s.columns.sehriShort : s.columns.sehri;

  const head = (title: string, checklist: boolean) => (
    <div className="rs-head">
      <div>
        <p className="rs-brand">
          <Leaf /> Bustandeen
        </p>
        <p className="rs-title">{title}</p>
        <p className="rs-place">{p.place}</p>
        <p className="rs-sub">{p.sub}</p>
        {checklist && (
          <p className="rs-name">
            {s.name}: <span />
          </p>
        )}
      </div>
      {p.qr && (
        <figure className="rs-qr">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${p.qr.size} ${p.qr.size}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label="QR"
          >
            <path fill="#000" d={p.qr.d} />
          </svg>
          <figcaption>
            {checklist ? s.scanApp : s.scan}
            <br />
            bustandeen.com
          </figcaption>
        </figure>
      )}
    </div>
  );

  /** One table body: the shift's rows plus the movable "30 days" label. */
  const body = (cols: number, cells: (r: SheetRowData) => ReactNode) =>
    p.rows.map((r) => {
      const odd = r.visible && isOddNightFast(r.fast);
      return (
        <Fragment key={r.date}>
          {p.labelRows.includes(r.row) && (
            <tr
              className="rs-p30label"
              data-possible-label={r.row}
              hidden={!(r.possible && r.fast === 30)}
            >
              <td colSpan={cols}>{p.possible30Label}</td>
            </tr>
          )}
          <tr
            data-date={r.date}
            data-ramadan-row={r.row}
            data-fast={r.visible ? r.fast : undefined}
            data-possible={r.possible ? '' : undefined}
            data-odd={odd ? '' : undefined}
            hidden={!r.visible}
            className={r.fast % 7 === 0 && r.fast < 29 ? 'rs-week' : undefined}
          >
            <th scope="row" className="rs-n">
              <span data-fast-num="">{r.fastLabel}</span>
              <span className="rs-star" data-odd-star="" hidden={!odd}>
                ★
              </span>
            </th>
            {cells(r)}
          </tr>
        </Fragment>
      );
    });

  const times = (r: SheetRowData) => (
    <>
      <td className="rs-t rs-sh">{r.sehri}</td>
      <td className="rs-t rs-if">{r.iftar}</td>
    </>
  );
  const footnote = <p className="rs-footnote">{s.footnote}</p>;
  const foot = <p className="rs-foot">{p.url.replace(/^https?:\/\//, '')}</p>;

  const dua = (
    <div className="rs-block" data-sheet-block="dua">
      <h4>{s.duaTitle}</h4>
      <p className="rs-ar" lang="ar" dir="rtl">
        {LAYLAT_AL_QADR_DUA.arabic}
      </p>
      <p className="rs-tr">{LAYLAT_AL_QADR_DUA.transliteration[p.lang]}</p>
      <p>{LAYLAT_AL_QADR_DUA.meaning[p.lang]}</p>
      <p className="rs-src">{LAYLAT_AL_QADR_DUA.source[p.lang]}</p>
    </div>
  );
  const zakat = (
    <div className="rs-block" data-sheet-block="zakat">
      <h4>{s.zakatTitle}</h4>
      <p>{s.zakat(p.eid)}</p>
      {p.fitra ? (
        <>
          <p>
            <b>{p.fitra.line}</b> {p.fitra.pending}
          </p>
          <p className="rs-src">{p.fitra.source}</p>
        </>
      ) : (
        <p>{s.zakatAskMasjid}</p>
      )}
    </div>
  );

  const prayerHead = (
    <tr>
      {s.prayers.map((name) => (
        <th key={name} className="rs-c rs-sub-th">
          {name}
        </th>
      ))}
    </tr>
  );

  const sheets = {
    timetable: (
      <>
        {head(p.title, false)}
        <div className="rs-body">
          <div>
            <table className="rs-table" {...p.tableAttrs}>
              <colgroup>
                <col style={{ width: '13mm' }} />
                <col style={{ width: '22mm' }} />
                <col style={{ width: '23mm' }} />
                <col />
                <col />
              </colgroup>
              <thead>
                <tr>
                  <th>{s.columns.fast}</th>
                  <th>{s.columns.date}</th>
                  <th>{s.columns.day}</th>
                  <th className="rs-c">{sehriHead}</th>
                  <th className="rs-c">{s.columns.iftar}</th>
                </tr>
              </thead>
              <tbody>
                {body(5, (r) => (
                  <>
                    <td>{r.dateLabel}</td>
                    <td>{r.weekday}</td>
                    {times(r)}
                  </>
                ))}
              </tbody>
            </table>
            {footnote}
          </div>
          <aside className="rs-aside">
            {dua}
            {zakat}
          </aside>
        </div>
      </>
    ),
    combined: (
      <>
        {head(p.title, false)}
        <div className="rs-body rs-full">
          <div>
            <table className="rs-table rs-compact rs-combined" {...p.tableAttrs}>
              <colgroup>
                <col style={{ width: '11mm' }} />
                <col style={{ width: '16mm' }} />
                <col style={{ width: '16mm' }} />
                <col style={{ width: '21mm' }} />
                <col style={{ width: '21mm' }} />
                <col span={5} style={{ width: '12mm' }} />
                <col style={{ width: '14mm' }} />
                <col />
                <col style={{ width: '12mm' }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2}>{s.columns.fast}</th>
                  <th rowSpan={2}>{s.columns.date}</th>
                  <th rowSpan={2}>{s.columns.day}</th>
                  <th rowSpan={2} className="rs-c">
                    {s.columns.sehriShort}
                  </th>
                  <th rowSpan={2} className="rs-c">
                    {s.columns.iftarShort}
                  </th>
                  <th colSpan={5} className="rs-c rs-grp">
                    {s.prayersGroup}
                  </th>
                  <th rowSpan={2} className="rs-c">
                    {s.tarawih}
                  </th>
                  <th rowSpan={2} className="rs-c">
                    {s.quranPages}
                  </th>
                  <th rowSpan={2} className="rs-c">
                    {s.nafl}
                  </th>
                </tr>
                {prayerHead}
              </thead>
              <tbody>
                {body(13, (r) => (
                  <>
                    <td>{r.dateLabel}</td>
                    <td>{r.weekday}</td>
                    {times(r)}
                    {s.prayers.map((name) => (
                      <td key={name} className="rs-ck">
                        <Box />
                      </td>
                    ))}
                    <td className="rs-ck">
                      <Box />
                    </td>
                    <td className="rs-wr" />
                    <td className="rs-ck">
                      <Box />
                    </td>
                  </>
                ))}
              </tbody>
            </table>
            {footnote}
          </div>
        </div>
      </>
    ),
    checklist: (
      <>
        {head(p.checklistTitle, true)}
        <div className="rs-goals">
          <div className="rs-goal">
            <h4>{s.juz}</h4>
            <div className="rs-juz">
              {Array.from({ length: 30 }, (_, i) => (
                <span key={i}>
                  {p.lang === 'bn'
                    ? String(i + 1).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)])
                    : i + 1}
                </span>
              ))}
            </div>
          </div>
          <div className="rs-goal">
            <h4>{s.intentions}</h4>
            <div className="rs-lines">
              <div />
              <div />
            </div>
          </div>
        </div>
        <div className="rs-body rs-full">
          <div>
            <table className="rs-table rs-compact rs-dense" {...p.tableAttrs}>
              <colgroup>
                <col style={{ width: '11mm' }} />
                <col style={{ width: '16mm' }} />
                <col style={{ width: '12mm' }} />
                <col span={5} style={{ width: '11.5mm' }} />
                <col style={{ width: '13mm' }} />
                <col />
                <col span={5} style={{ width: '12.6mm' }} />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2}>{s.columns.fast}</th>
                  <th rowSpan={2}>{s.columns.date}</th>
                  <th rowSpan={2} className="rs-c">
                    {s.fasted}
                  </th>
                  <th colSpan={5} className="rs-c rs-grp">
                    {s.prayersGroup}
                  </th>
                  {[
                    s.tarawih,
                    s.quranPages,
                    s.tahajjud,
                    s.duha,
                    s.adhkarAm,
                    s.adhkarPm,
                    s.sadaqah,
                  ].map((label) => (
                    <th key={label} rowSpan={2} className="rs-c">
                      {label}
                    </th>
                  ))}
                </tr>
                {prayerHead}
              </thead>
              <tbody>
                {body(15, (r) => (
                  <>
                    <td>{r.dateLabel}</td>
                    {Array.from({ length: 7 }, (_, i) => (
                      <td key={i} className="rs-ck">
                        <Box />
                      </td>
                    ))}
                    <td className="rs-wr" />
                    {Array.from({ length: 5 }, (_, i) => (
                      <td key={i} className="rs-ck">
                        <Box />
                      </td>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
            <p className="rs-footnote">{s.footnoteChecklist}</p>
            <p className="rs-eid">
              <Box /> {s.zakatGiven}
            </p>
          </div>
        </div>
      </>
    ),
  };

  return (
    <div data-ramadan-sheets="" lang={p.lang} aria-hidden="true">
      {SHEET_VARIANTS.map((v) => (
        <section key={v} className="rs-paper" data-ramadan-sheet={v}>
          {sheets[v]}
          {foot}
        </section>
      ))}
    </div>
  );
}
