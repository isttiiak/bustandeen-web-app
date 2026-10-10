import { Fragment } from 'react';
import type { CityEntry } from '../data/cities.js';
import { BD_DIVISIONS, type BdDistrict } from '../data/bdDistricts.js';
import { CHROME } from '../locales/chrome.js';
import {
  ISLAMIC_FOUNDATION_URL,
  MONTHLY,
  MONTHLY_LANGS,
  formatClock,
  formatMonth,
  formatNumber,
  formatWeekday,
  type MonthlyLang,
} from '../locales/monthly.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { BD_TZ, monthRows, type YearMonth } from '../utils/monthTable.js';
import type { HijriDate } from '../utils/calc.js';
import { ramadanPagePath } from '../utils/ramadanBd.js';
import { DownloadPdfButton, PrintSheetHead } from '../components/PrintSheet.js';
import type { QrPath } from '../utils/qr.js';

interface Props {
  lang: MonthlyLang;
  district: BdDistrict;
  city: CityEntry;
  ym: YearMonth;
  /** The live months (this month and the next two), for the month switcher. */
  months: YearMonth[];
  /** Gregorian year of the Ramadan calendar the page links to. */
  ramadanYear: number;
  /** QR of the page URL for the A4 sheet (build time only). */
  qr?: QrPath;
}

const SITE = 'https://bustandeen.com';

export function monthPagePath(citySlug: string, ym: YearMonth): string {
  return `/prayer-times/${citySlug}/${ym}`;
}

export function LeafMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      className={className}
    >
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z" />
      <path d="M5 19l7-7" />
    </svg>
  );
}

function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
    >
      <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

export default function PrayerTimesMonthPage({
  lang,
  district,
  city,
  ym,
  months,
  ramadanYear,
  qr,
}: Props) {
  const t = CHROME[lang];
  const m = MONTHLY[lang];
  const name = lang === 'bn' ? district.bn : district.en;
  const divisionName = BD_DIVISIONS[district.division][lang];
  const monthLabel = formatMonth(ym, lang);
  const rows = monthRows(city, ym);
  const num = (n: number) => formatNumber(n, lang);
  const hijriLabel = (h: HijriDate) =>
    `${num(h.day)} ${m.hijriMonths[h.month - 1]} ${num(h.year)} ${m.hijriEra}`;

  const first = rows[0].hijri;
  const last = rows[rows.length - 1].hijri;
  const hijriRange =
    first.year === last.year
      ? `${m.hijriMonths[first.month - 1]} - ${m.hijriMonths[last.month - 1]} ${num(last.year)} ${m.hijriEra}`
      : `${m.hijriMonths[first.month - 1]} ${num(first.year)} - ${m.hijriMonths[last.month - 1]} ${num(last.year)} ${m.hijriEra}`;

  const idx = months.indexOf(ym);
  const prev = idx > 0 ? months[idx - 1] : undefined;
  const next = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : undefined;

  const barePath = monthPagePath(city.slug, ym);
  const url = `${SITE}${langPath(lang, barePath)}`;
  const indexUrl = `${SITE}${langPath(lang, '/prayer-times/bangladesh')}`;
  const dailyPath = langPath(lang, `/prayer-times/${city.slug}`);
  const cols = m.columns;
  const btn =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control border border-brand-border bg-brand-deep text-white/80';

  return (
    <Layout
      lang={lang}
      langs={MONTHLY_LANGS}
      look="bustan"
      printable
      barePath={barePath}
      breadcrumbs={[
        { label: t.home, path: `${SITE}/` },
        { label: t.breadcrumbPrayerTimes, path: indexUrl },
        { label: m.districtCrumb(name), path: dailyPath },
        { label: monthLabel },
      ]}
    >
      <PrintSheetHead
        lang={lang}
        title={m.title(name, monthLabel)}
        sub={`${hijriRange} · ${m.division(divisionName)}`}
        qr={qr}
      />
      <header className="print:hidden rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-9 pb-5 text-center">
        <span className="inline-flex text-brand-gold">
          <LeafMark />
        </span>
        <p className="mt-1 text-xs font-semibold tracking-wide text-brand-gold">
          {m.division(divisionName)}
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
          {m.heading(name)}
          <br />
          <span className="text-brand-gold">{monthLabel}</span>
        </h1>
        <p className="mt-2 text-sm text-white/70">{hijriRange}</p>
      </header>

      <nav aria-label={m.monthsLabel} className="mt-4 flex items-center gap-2 print:hidden">
        {prev ? (
          <a
            className={`${btn} no-underline hover:border-brand-emerald/40`}
            href={langPath(lang, monthPagePath(city.slug, prev))}
            aria-label={m.prevMonth(formatMonth(prev, lang, false))}
          >
            <Chevron dir="prev" />
          </a>
        ) : (
          <span className={`${btn} opacity-40`} aria-hidden="true">
            <Chevron dir="prev" />
          </span>
        )}
        <div className="flex flex-1 gap-1.5">
          {months.map((mo) => (
            <a
              key={mo}
              href={langPath(lang, monthPagePath(city.slug, mo))}
              aria-current={mo === ym ? 'page' : undefined}
              className={`flex-1 rounded-control border px-2 py-2 text-center text-sm font-semibold no-underline ${
                mo === ym
                  ? 'border-brand-emerald bg-brand-emerald/10 text-white'
                  : 'border-brand-border bg-brand-deep text-white/70 hover:text-white'
              }`}
            >
              {formatMonth(mo, lang, false)}
            </a>
          ))}
        </div>
        {next ? (
          <a
            className={`${btn} no-underline hover:border-brand-emerald/40`}
            href={langPath(lang, monthPagePath(city.slug, next))}
            aria-label={m.nextMonth(formatMonth(next, lang, false))}
          >
            <Chevron dir="next" />
          </a>
        ) : (
          <span className={`${btn} opacity-40`} aria-hidden="true">
            <Chevron dir="next" />
          </span>
        )}
      </nav>

      <DownloadPdfButton lang={lang} className="mt-4" />

      <div className="mt-4 print:mt-0 overflow-x-auto rounded-card border border-brand-border bg-brand-deep shadow-elev-2">
        <table
          data-month-table=""
          data-timezone={BD_TZ}
          className="w-full border-collapse text-[13px] tabular-nums"
        >
          <caption className="sr-only">{m.caption(name, monthLabel)}</caption>
          <thead>
            <tr className="text-[11px] font-semibold text-white/70">
              {[
                cols.date,
                cols.fajr,
                cols.sunrise,
                cols.dhuhr,
                cols.asr,
                cols.maghrib,
                cols.isha,
              ].map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={`px-1.5 py-2.5 ${i === 0 ? 'text-start ps-3' : 'text-center'}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const monthStarts = i > 0 && r.hijri.month !== rows[i - 1].hijri.month;
              return (
                <Fragment key={r.date}>
                  {monthStarts && (
                    <tr>
                      <td
                        colSpan={7}
                        className="border-t border-brand-border/60 bg-shade/20 px-3 py-1 text-[11px] font-semibold text-brand-gold"
                      >
                        {hijriLabel(r.hijri)}
                      </td>
                    </tr>
                  )}
                  <tr
                    data-date={r.date}
                    className="border-t border-brand-border/60 text-white aria-[current=date]:bg-brand-emerald/15"
                  >
                    <th scope="row" className="py-1.5 ps-3 pe-1 text-start font-normal">
                      <b className="font-bold">{num(r.day)}</b>{' '}
                      <small className="text-[10px] text-white/60">
                        {formatWeekday(r.noon, lang)}
                      </small>
                    </th>
                    <td className="px-1.5 text-center">{formatClock(r.times.fajr, lang)}</td>
                    <td className="px-1.5 text-center text-white/60">
                      {formatClock(r.times.sunrise, lang)}
                    </td>
                    <td className="px-1.5 text-center">{formatClock(r.times.dhuhr, lang)}</td>
                    <td className="px-1.5 text-center">{formatClock(r.times.asr, lang)}</td>
                    <td className="px-1.5 text-center font-semibold text-brand-gold">
                      {formatClock(r.times.maghrib, lang)}
                    </td>
                    <td className="px-1.5 text-center">{formatClock(r.times.isha, lang)}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2 text-xs text-white/70 print:mt-2 print:space-y-0.5 print:text-[7.5pt]">
        <p>{m.methodNote}</p>
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
        <p>{m.hijriNote}</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm print:hidden">
        <a href={dailyPath} className="text-brand-emerald no-underline hover:underline">
          {m.todayCta(name)} →
        </a>
        <a
          href={langPath(lang, ramadanPagePath(city.slug, ramadanYear))}
          className="text-brand-emerald no-underline hover:underline"
        >
          {m.ramadanCta(name)} →
        </a>
        <a
          href={langPath(lang, '/prayer-times/bangladesh')}
          className="text-brand-emerald no-underline hover:underline"
        >
          {m.allDistrictsCta} →
        </a>
      </div>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: `${SITE}/` },
          { name: t.breadcrumbPrayerTimes, url: indexUrl },
          { name: m.districtCrumb(name), url: `${SITE}${dailyPath}` },
          { name: monthLabel, url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: m.title(name, monthLabel),
          description: m.description(name, monthLabel),
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: `${SITE}/` },
        }}
      />
    </Layout>
  );
}
