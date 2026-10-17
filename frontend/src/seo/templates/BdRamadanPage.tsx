import { Fragment } from 'react';
import type { CityEntry } from '../data/cities.js';
import { BD_DIVISIONS, type BdDistrict } from '../data/bdDistricts.js';
import { CHROME } from '../locales/chrome.js';
import {
  ISLAMIC_FOUNDATION_URL,
  MONTHLY,
  formatClock,
  formatNumber,
  formatWeekday,
  type MonthlyLang,
  MONTHLY_LANGS,
} from '../locales/monthly.js';
import { RAMADAN_BD } from '../locales/ramadanBd.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { LeafMark, monthPagePath } from './PrayerTimesMonthPage.js';
import { BD_TZ, type YearMonth } from '../utils/monthTable.js';
import { OtherTownLink } from '../components/PrintSheet.js';
import RamadanSheets from '../components/RamadanSheets.js';
import {
  FastingLengthTiles,
  RamadanAbout,
  RamadanDownloads,
} from '../components/RamadanPageParts.js';
import { FITRA_BD, RAMADAN_SHEET } from '../locales/ramadanSheet.js';
import { eidDays, fastingLength, sheetRows } from '../utils/ramadanSheetData.js';
import { isOddNightFast } from '../ramadanShift.js';
import type { QrPath } from '../utils/qr.js';
import { ramadanPagePath, type RamadanDay, type RamadanPlan } from '../utils/ramadanBd.js';
import { dateFormat, numberFormat } from '../utils/intl.js';
import RamadanNotice from '../components/RamadanNotice.js';
import {
  RamadanShiftControl,
  RamadanShiftNotes,
  possibleLabelRows,
  ramadanRows,
  ramadanTableAttrs,
} from '../components/RamadanShift.js';
import type { RowState } from '../ramadanShift.js';

interface Props {
  lang: MonthlyLang;
  district: BdDistrict;
  city: CityEntry;
  plan: RamadanPlan;
  /** The month the monthly-timetable link opens on (the build's). */
  ym: YearMonth;
  /** QR of the page URL for the A4 sheet (build time only). */
  qr?: QrPath;
}

const SITE = 'https://bustandeen.com';

/** Ramadan calendar of a Bangladesh district: the Bustan look, Bangla first. */
export default function BdRamadanPage({ lang, district, city, plan, ym, qr }: Props) {
  const t = CHROME[lang];
  const m = MONTHLY[lang];
  const r = RAMADAN_BD[lang];
  const name = lang === 'bn' ? district.bn : district.en;
  const divisionName = BD_DIVISIONS[district.division][lang];
  const num = (n: number) => formatNumber(n, lang);
  const first = plan.days[0];
  const gregorianYear = first.noon.getUTCFullYear();
  const yearLabel = num(gregorianYear);
  const shortDate = (d: RamadanDay) =>
    dateFormat(m.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(d.noon);
  const dayMonth = (noon: Date, year = false) =>
    dateFormat(m.locale, {
      day: 'numeric',
      month: 'long',
      ...(year ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    }).format(noon);
  const sh = RAMADAN_SHEET[lang];
  const numberWithGroups = (n: number) => numberFormat(m.locale, {}).format(n);

  const barePath = ramadanPagePath(city.slug, gregorianYear);
  const url = `${SITE}${langPath(lang, barePath)}`;
  const indexUrl = `${SITE}${langPath(lang, '/ramadan-calendar')}`;
  const dailyPath = langPath(lang, `/prayer-times/${city.slug}`);
  const monthlyPath = langPath(lang, monthPagePath(city.slug, ym));

  // Rows that can be the 30th after a shift: the label and the note.
  const labelRows = possibleLabelRows(plan);
  const fitraLine = FITRA_BD.text[lang](
    num(FITRA_BD.hijriYear),
    dayMonth(new Date(`${FITRA_BD.announced}T12:00:00Z`), true),
    num(FITRA_BD.minTaka),
    numberWithGroups(FITRA_BD.maxTaka)
  );
  const row = (d: RamadanDay, { visible, possible, fast }: RowState) => (
    <tr
      key={d.date}
      data-date={d.date}
      data-ramadan-row={d.fast}
      data-fast={visible ? d.fast : undefined}
      data-possible={possible ? '' : undefined}
      data-odd={visible && isOddNightFast(fast) ? '' : undefined}
      hidden={!visible}
      className="border-t border-brand-border/60 text-white aria-[current=date]:bg-brand-emerald/15 data-[possible]:text-white/70 data-[odd]:bg-brand-gold/[0.07]"
    >
      <th scope="row" className="py-2 ps-3 pe-1 text-start font-bold whitespace-nowrap">
        <span data-fast-num="">{visible ? num(d.fast) : ''}</span>
        <span
          data-odd-star=""
          aria-hidden="true"
          hidden={!(visible && isOddNightFast(fast))}
          className="ms-1 text-brand-gold"
        >
          ★
        </span>
        {labelRows.includes(d.fast) && (
          <span data-possible-note="" hidden={!possible} className="sr-only">
            {' '}
            ({r.possible30})
          </span>
        )}
      </th>
      <td className="px-2 py-2">
        {shortDate(d)}{' '}
        <small className="text-[11px] text-white/60">{formatWeekday(d.noon, lang)}</small>
      </td>
      <td className="px-2 py-2 text-center font-semibold text-brand-emerald">
        {formatClock(d.times.sehri, lang)}
      </td>
      <td className="px-2 py-2 pe-3 text-center font-semibold text-brand-gold">
        {formatClock(d.times.maghrib, lang)}
      </td>
    </tr>
  );

  return (
    <Layout
      lang={lang}
      look="bustan"
      printable
      barePath={barePath}
      langs={MONTHLY_LANGS}
      breadcrumbs={[
        { label: t.home, path: `${SITE}/` },
        { label: t.breadcrumbRamadan, path: indexUrl },
        { label: m.districtCrumb(name) },
      ]}
    >
      <header className="print:hidden rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-9 pb-5 text-center">
        <span className="inline-flex text-brand-gold">
          <LeafMark />
        </span>
        <p className="mt-1 text-xs font-semibold tracking-wide text-brand-gold">
          {m.division(divisionName)}
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
          {r.heading(name)}
        </h1>
        <p className="mt-2 text-sm text-white/70">{r.subheading(num(plan.hijriYear), yearLabel)}</p>
      </header>

      <FastingLengthTiles lang={lang} length={fastingLength(plan, shortDate)} num={num} />

      <RamadanShiftNotes
        lang={lang}
        plan={plan}
        className="mt-2 text-sm font-semibold text-white print:mt-0 print:mb-2 print:text-[8pt]"
      />
      <RamadanShiftControl lang={lang} barePath={barePath} look="bustan" />

      <RamadanDownloads lang={lang} className="mt-4" />
      <OtherTownLink lang={lang} className="mt-2" />

      <div className="mt-4 print:mt-0 overflow-x-auto rounded-card border border-brand-border bg-brand-deep shadow-elev-2">
        <table
          data-month-table=""
          data-timezone={BD_TZ}
          {...ramadanTableAttrs(plan, lang)}
          className="w-full border-collapse text-sm tabular-nums"
        >
          <caption className="sr-only">{r.caption(name, yearLabel)}</caption>
          <thead>
            <tr className="text-xs font-semibold text-white/70">
              <th scope="col" className="py-2.5 ps-3 pe-1 text-start">
                {r.columns.fast}
              </th>
              <th scope="col" className="px-2 py-2.5 text-start">
                {r.columns.date}
              </th>
              <th scope="col" className="px-2 py-2.5 text-center">
                {r.columns.sehri}
              </th>
              <th scope="col" className="px-2 py-2.5 pe-3 text-center">
                {r.columns.iftar}
              </th>
            </tr>
          </thead>
          <tbody>
            {ramadanRows(plan).map(({ day, state }) => (
              <Fragment key={day.date}>
                {labelRows.includes(day.fast) && (
                  <tr data-possible-label={day.fast} hidden={!(state.possible && day.fast === 30)}>
                    <td
                      colSpan={4}
                      aria-hidden="true"
                      className="border-t border-brand-border/60 bg-shade/20 px-3 py-1 text-[11px] font-semibold text-brand-gold"
                    >
                      {r.possible30}
                    </td>
                  </tr>
                )}
                {row(day, state)}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <RamadanAbout
        lang={lang}
        items={[
          {
            title: sh.aboutDates,
            body: (
              <RamadanNotice
                lang={lang}
                plan={plan}
                bd
                country=""
                linkClassName="text-brand-gold underline underline-offset-2"
              />
            ),
          },
          { title: sh.aboutTimes, body: <p>{r.timesNote}</p> },
          // Until the Shawwal moon fixes the month's length.
          ...(plan.endSettled ? [] : [{ title: sh.about30, body: <p>{sh.about30Body}</p> }]),
          { title: sh.aboutOdd, body: <p>{sh.aboutOddBody}</p> },
          {
            title: sh.aboutMasjid,
            body: (
              <p>
                {m.mosqueNote[0]}
                <a
                  href={ISLAMIC_FOUNDATION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold underline underline-offset-2"
                >
                  {m.mosqueNote[1]}
                </a>
                {m.mosqueNote[2]}
              </p>
            ),
          },
          {
            title: sh.aboutFitra,
            body: (
              <p>
                {sh.aboutFitraBody}{' '}
                <a
                  href={FITRA_BD.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold underline underline-offset-2"
                >
                  {fitraLine}
                </a>
              </p>
            ),
          },
        ]}
      />

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm print:hidden">
        <a href={dailyPath} className="text-brand-emerald no-underline hover:underline">
          {m.todayCta(name)} →
        </a>
        <a href={monthlyPath} className="text-brand-emerald no-underline hover:underline">
          {r.monthlyCta(name)} →
        </a>
        <a
          href={`${langPath(lang, '/ramadan-calendar')}#bangladesh`}
          className="text-brand-emerald no-underline hover:underline"
        >
          {r.allDistrictsCta} →
        </a>
      </div>

      <RamadanSheets
        lang={lang}
        title={sh.title(yearLabel)}
        checklistTitle={sh.checklistTitle(yearLabel)}
        place={`${m.districtCrumb(name)} · ${m.division(divisionName)}, ${sh.bangladesh}`}
        sub={sh.sub(
          num(plan.hijriYear),
          dayMonth(first.noon),
          dayMonth(plan.days[plan.days.length - 1].noon, true),
          plan.possible30 && dayMonth(plan.possible30.noon)
        )}
        url={url}
        qr={qr}
        rows={sheetRows(plan, {
          fast: num,
          dateLabel: shortDate,
          weekday: (d) => formatWeekday(d.noon, lang),
          clock: (t) => formatClock(t, lang),
        })}
        labelRows={labelRows}
        possible30Label={r.possible30}
        tableAttrs={ramadanTableAttrs(plan, lang)}
        sehriBeforeFajr
        eid={eidDays(plan)
          .map((d) => dayMonth(d))
          .join(` ${sh.or} `)}
        fitra={{
          line: fitraLine,
          pending: FITRA_BD.pending[lang](num(plan.hijriYear)),
          source: FITRA_BD.sourceLabel[lang],
        }}
      />

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: `${SITE}/` },
          { name: t.breadcrumbRamadan, url: indexUrl },
          { name: m.districtCrumb(name), url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: r.title(name, yearLabel),
          description: r.description(name, yearLabel),
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: `${SITE}/` },
        }}
      />
    </Layout>
  );
}
