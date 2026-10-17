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
import { DownloadPdfButton, OtherTownLink, PrintSheetHead } from '../components/PrintSheet.js';
import type { QrPath } from '../utils/qr.js';
import { ramadanPagePath, type RamadanDay, type RamadanPlan } from '../utils/ramadanBd.js';
import { dateFormat } from '../utils/intl.js';
import RamadanNotice from '../components/RamadanNotice.js';
import RamadanSheetTable, { type RamadanSheetTableRow } from '../components/RamadanSheetTable.js';

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

  const barePath = ramadanPagePath(city.slug, gregorianYear);
  const url = `${SITE}${langPath(lang, barePath)}`;
  const indexUrl = `${SITE}${langPath(lang, '/ramadan-calendar')}`;
  const dailyPath = langPath(lang, `/prayer-times/${city.slug}`);
  const monthlyPath = langPath(lang, monthPagePath(city.slug, ym));

  const sheetRow = (d: RamadanDay): RamadanSheetTableRow => ({
    date: d.date,
    fast: num(d.fast),
    dateLabel: shortDate(d),
    weekday: formatWeekday(d.noon, lang),
    sehri: formatClock(d.times.sehri, lang),
    iftar: formatClock(d.times.maghrib, lang),
  });

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
      <PrintSheetHead
        lang={lang}
        title={r.title(name, yearLabel)}
        sub={`${r.subheading(num(plan.hijriYear), yearLabel)} · ${m.division(divisionName)}`}
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
          {r.heading(name)}
        </h1>
        <p className="mt-2 text-sm text-white/70">{r.subheading(num(plan.hijriYear), yearLabel)}</p>
      </header>

      <RamadanNotice
        lang={lang}
        plan={plan}
        bd
        country=""
        className="mt-4 rounded-card border border-brand-gold/40 bg-brand-gold/10 px-4 py-3 text-sm text-white print:mt-0 print:mb-2 print:px-0 print:py-0 print:border-0 print:text-[8pt]"
        linkClassName="text-brand-gold underline underline-offset-2"
      />

      <DownloadPdfButton lang={lang} className="mt-4" />
      <OtherTownLink lang={lang} className="mt-2" />

      <RamadanSheetTable
        caption={r.caption(name, yearLabel)}
        columns={r.columns}
        rows={plan.days.map(sheetRow)}
        possible30={plan.possible30 && sheetRow(plan.possible30)}
        possible30Label={r.possible30}
        timezone={BD_TZ}
      />

      <div className="mt-4 space-y-2 text-xs text-white/70 print:mt-2 print:space-y-0.5 print:text-[7.5pt]">
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
