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
} from '../locales/monthly.js';
import { RAMADAN_BD } from '../locales/ramadanBd.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { LeafMark, monthPagePath } from './PrayerTimesMonthPage.js';
import { BD_TZ, type YearMonth } from '../utils/monthTable.js';
import { ramadanPagePath, type RamadanDay, type RamadanPlan } from '../utils/ramadanBd.js';

interface Props {
  lang: MonthlyLang;
  district: BdDistrict;
  city: CityEntry;
  plan: RamadanPlan;
  /** The month the monthly-timetable link opens on (the build's). */
  ym: YearMonth;
}

const SITE = 'https://bustandeen.com';

/** Ramadan calendar of a Bangladesh district: the Bustan look, Bangla first. */
export default function BdRamadanPage({ lang, district, city, plan, ym }: Props) {
  const t = CHROME[lang];
  const m = MONTHLY[lang];
  const r = RAMADAN_BD[lang];
  const name = lang === 'bn' ? district.bn : district.en;
  const divisionName = BD_DIVISIONS[district.division][lang];
  const num = (n: number) => formatNumber(n, lang);
  const first = plan.days[0];
  const gregorianYear = first.noon.getUTCFullYear();
  const yearLabel = num(gregorianYear);
  const longDate = (d: RamadanDay) =>
    new Intl.DateTimeFormat(m.locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(d.noon);
  const shortDate = (d: RamadanDay) =>
    new Intl.DateTimeFormat(m.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      d.noon
    );

  const barePath = ramadanPagePath(city.slug, gregorianYear);
  const url = `${SITE}${langPath(lang, barePath)}`;
  const indexUrl = `${SITE}${langPath(lang, '/ramadan-calendar')}`;
  const dailyPath = langPath(lang, `/prayer-times/${city.slug}`);
  const monthlyPath = langPath(lang, monthPagePath(city.slug, ym));
  const record = plan.startRecord;

  const row = (d: RamadanDay, possible = false) => (
    <tr
      key={d.date}
      data-date={d.date}
      className={`border-t border-brand-border/60 text-white aria-[current=date]:bg-brand-emerald/15 ${
        possible ? 'text-white/70' : ''
      }`}
    >
      <th scope="row" className="py-2 ps-3 pe-1 text-start font-bold">
        {num(d.fast)}
        {possible && <span className="sr-only"> ({r.possible30})</span>}
      </th>
      <td className="px-2 py-2">
        {shortDate(d)}{' '}
        <small className="text-[11px] text-white/60">{formatWeekday(d.noon, lang)}</small>
      </td>
      <td className="px-2 py-2 text-center font-semibold text-brand-emerald">
        {formatClock(d.times.fajr, lang)}
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
      barePath={barePath}
      breadcrumbs={[
        { label: t.home, path: `${SITE}/` },
        { label: t.breadcrumbRamadan, path: indexUrl },
        { label: m.districtCrumb(name) },
      ]}
    >
      <header className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-9 pb-5 text-center">
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

      <div
        role="note"
        className="mt-4 rounded-card border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-white"
      >
        {record ? (
          <p>
            {r.announcedNotice(longDate(first))}
            {record.sourceUrl && (
              <>
                {' '}
                <a
                  href={record.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold underline underline-offset-2"
                >
                  {r.sourceLink}
                </a>
              </>
            )}
          </p>
        ) : (
          <p>{r.estimateNotice(longDate(first))}</p>
        )}
        {!plan.endSettled && <p className="mt-1.5 text-white/80">{r.eidNote}</p>}
      </div>

      <div className="mt-4 overflow-x-auto rounded-card border border-brand-border bg-brand-deep shadow-elev-2">
        <table
          data-month-table=""
          data-timezone={BD_TZ}
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
            {plan.days.map((d) => row(d))}
            {plan.possible30 && (
              <>
                <tr>
                  <td
                    colSpan={4}
                    aria-hidden="true"
                    className="border-t border-brand-border/60 bg-shade/20 px-3 py-1 text-[11px] font-semibold text-brand-gold"
                  >
                    {r.possible30}
                  </td>
                </tr>
                {row(plan.possible30, true)}
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2 text-xs text-white/70">
        <p>{r.timesNote}</p>
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
      </div>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
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
