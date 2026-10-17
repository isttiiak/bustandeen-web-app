import { Fragment } from 'react';
import { cityCountry, cityLabel, cityLangs, cityName, type CityEntry } from '../data/cities.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { DownloadPdfButton, PrintSheetHead } from '../components/PrintSheet.js';
import RamadanNotice from '../components/RamadanNotice.js';
import type { QrPath } from '../utils/qr.js';
import { formatTimeInZone, methodFacts } from '../utils/calc.js';
import { dateFormat } from '../utils/intl.js';
import { ISLAMIC_FOUNDATION_URL, MONTHLY } from '../locales/monthly.js';
import { RAMADAN_BD } from '../locales/ramadanBd.js';
import { RAMADAN_WORLD } from '../locales/ramadanWorld.js';
import { COUNTRY_PRAYER_DEFAULTS, countryTimeAdjustments } from '../../utils/countryDefaults.js';
import type { RamadanDay, RamadanPlan } from '../utils/ramadanBd.js';
import {
  RamadanShiftControl,
  RamadanShiftNotes,
  possibleLabelRows,
  ramadanRows,
  ramadanTableAttrs,
} from '../components/RamadanShift.js';
import type { RowState } from '../ramadanShift.js';

const LOCALE_BY_LANG: Record<SeoLang, string> = { en: 'en-US', bn: 'bn-BD', ar: 'ar-SA' };

interface Props {
  lang: SeoLang;
  city: CityEntry;
  /** The month as the city's country counts it (ramadanPlan). */
  plan: RamadanPlan;
  /** The page's year: the Gregorian year Umm al-Qura's Ramadan begins in. */
  gregorianYear: number;
  /** QR of the page URL for the A4 sheet (build time only). */
  qr?: QrPath;
}

export default function RamadanCalendarPage({ lang, city, plan, gregorianYear, qr }: Props) {
  const t = CHROME[lang];
  const locale = LOCALE_BY_LANG[lang];
  // Bangladesh towns other than the district HQs: the committee's wording,
  // in English and Bangla. Every other city: English only.
  const bd = city.countryCode === 'BD';
  const textLang = lang === 'bn' ? 'bn' : 'en';
  const country = cityCountry(city, lang);
  const method = plan.days[0].times.method;
  // The country's match to its official timetable (audit R0c), if any.
  const calibration = countryTimeAdjustments(city.countryCode, method);
  const sehriBeforeFajr = (calibration?.sehri ?? 0) < 0;
  const facts = methodFacts(method);
  const timesNote = bd
    ? RAMADAN_BD[textLang].timesNote
    : RAMADAN_WORLD.timesNote({
        method: calibration?.methodName ?? t.prayerTimes.methodNames[method],
        ...facts,
        fajrAngle: calibration?.fajrAngle ?? facts.fajrAngle,
        fajrMinutes: calibration?.fajr ?? 0,
        maghribMinutes: facts.maghribMinutes + (calibration?.maghrib ?? 0),
        sehriMinutes: calibration?.sehri ?? 0,
        country: city.countryCode in COUNTRY_PRAYER_DEFAULTS ? country : undefined,
        checkedAgainst: calibration?.checkedAgainst,
        iftarOnly: calibration?.iftarOnly,
        pageNote: calibration?.pageNote,
      });
  const possible30Label = bd ? RAMADAN_BD[textLang].possible30 : RAMADAN_WORLD.possible30;

  const url = `https://bustandeen.com${langPath(lang, `/ramadan-calendar/${city.slug}/${gregorianYear}`)}`;

  // Rows that can be the 30th after a shift: the label and the note.
  const labelRows = possibleLabelRows(plan);
  const row = (d: RamadanDay, { visible, possible }: RowState) => (
    <tr
      key={d.date}
      data-date={d.date}
      data-ramadan-row={d.fast}
      data-fast={visible ? d.fast : undefined}
      data-possible={possible ? '' : undefined}
      hidden={!visible}
      className="border-b border-[#1e2d42] last:border-0 data-[possible]:opacity-70"
    >
      <td className="px-4 py-2 text-[#f1f5f9] font-semibold tabular-nums">
        <span data-fast-num="">{visible ? d.fast : ''}</span>
        {labelRows.includes(d.fast) && (
          <span data-possible-note="" hidden={!possible} className="sr-only">
            {' '}
            ({possible30Label})
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-[#94a3b8]">
        {/* Noon UTC of the civil date: formatted in UTC it is that date. */}
        {dateFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d.noon)}
      </td>
      <td className="px-4 py-2 text-end text-[#10b981] font-bold tabular-nums">
        {formatTimeInZone(d.times.sehri, city.timezone, locale)}
      </td>
      <td className="px-4 py-2 text-end text-[#f59e0b] font-bold tabular-nums">
        {formatTimeInZone(d.times.maghrib, city.timezone, locale)}
      </td>
    </tr>
  );
  const barePath = `/ramadan-calendar/${city.slug}/${gregorianYear}`;

  return (
    <Layout
      lang={lang}
      printable
      barePath={barePath}
      langs={cityLangs(city)}
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbRamadan },
        { label: cityLabel(city, lang) },
      ]}
    >
      <PrintSheetHead
        lang={lang}
        title={t.ramadan.heading(cityName(city, lang), gregorianYear)}
        sub={t.ramadan.subheading(cityName(city, lang), cityCountry(city, lang))}
        qr={qr}
      />
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9] print:hidden">
        {t.ramadan.heading(cityName(city, lang), gregorianYear)}
      </h1>
      <p className="text-[#94a3b8] mt-2 print:hidden">
        {t.ramadan.subheading(cityName(city, lang), cityCountry(city, lang))}
      </p>
      <RamadanNotice
        lang={textLang}
        plan={plan}
        bd={bd}
        country={country}
        className="text-xs text-[#94a3b8] mt-3 bg-[#0d1520] border border-[#1e2d42] rounded-xl p-3 print:mt-0 print:mb-2 print:p-0 print:border-0 print:text-[8pt]"
        linkClassName="text-[#10b981] underline underline-offset-2"
      />

      <RamadanShiftNotes
        lang={textLang}
        plan={plan}
        className="text-xs text-[#f1f5f9] mt-2 print:mt-0 print:mb-2 print:text-[8pt]"
      />
      <RamadanShiftControl lang={textLang} barePath={barePath} look="world" />

      <DownloadPdfButton lang={lang} className="mt-5 text-[#94a3b8]" />

      <div className="mt-6 print:mt-0 rounded-2xl border border-[#1e2d42] bg-[#0d1520] overflow-x-auto">
        {/* Latin digits, as this template writes them in every language. */}
        <table className="w-full text-sm" {...ramadanTableAttrs(plan, 'en')}>
          <thead>
            <tr className="border-b border-[#1e2d42] text-[#94a3b8] text-xs uppercase tracking-wide">
              <th className="text-start px-4 py-2.5">{t.ramadan.dayLabel}</th>
              <th className="text-start px-4 py-2.5">{t.ramadan.dateLabel}</th>
              {/* Bangladesh, and the countries whose sehri ends before Fajr
                  (audit R0c): not "(Fajr)". */}
              <th className="text-end px-4 py-2.5">
                {bd
                  ? RAMADAN_BD[textLang].columns.sehri
                  : sehriBeforeFajr
                    ? t.ramadan.suhoorEndsLabel
                    : t.ramadan.imsakLabel}
              </th>
              <th className="text-end px-4 py-2.5">
                {bd ? RAMADAN_BD[textLang].columns.iftar : t.ramadan.iftarLabel}
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
                      className="border-b border-[#1e2d42] px-4 py-1 text-[11px] font-semibold text-[#f59e0b]"
                    >
                      {possible30Label}
                    </td>
                  </tr>
                )}
                {row(day, state)}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-2 text-xs text-[#94a3b8] print:mt-2 print:space-y-0.5 print:text-[7.5pt]">
        <p>{timesNote}</p>
        {bd ? (
          <p>
            {MONTHLY[textLang].mosqueNote[0]}
            <a
              href={ISLAMIC_FOUNDATION_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#10b981] underline underline-offset-2"
            >
              {MONTHLY[textLang].mosqueNote[1]}
            </a>
            {MONTHLY[textLang].mosqueNote[2]}
          </p>
        ) : (
          <p>{RAMADAN_WORLD.masjidNote}</p>
        )}
      </div>

      <a
        href="https://bustandeen.com/fasting"
        className="mt-5 inline-block print:hidden rounded-xl bg-[#10b981] text-[#080c12] font-bold text-sm px-4 py-2.5 no-underline"
      >
        {t.ramadan.liveAppCta}
      </a>

      <div className="mt-6 flex flex-wrap gap-3 text-sm print:hidden">
        <a
          href={langPath(lang, `/prayer-times/${city.slug}`)}
          className="text-[#10b981] no-underline hover:underline"
        >
          {t.ramadan.prayerTimesCta(cityName(city, lang))} →
        </a>
        <a href="/qibla" className="text-[#10b981] no-underline hover:underline">
          {t.qibla.liveAppCta} →
        </a>
      </div>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          { name: cityLabel(city, lang), url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t.ramadan.heading(cityName(city, lang), gregorianYear),
          description: t.ramadan.subheading(cityName(city, lang), cityCountry(city, lang)),
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
