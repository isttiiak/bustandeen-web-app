import { Fragment } from 'react';
import { cityCountry, cityLabel, cityLangs, cityName, type CityEntry } from '../data/cities.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { OtherTownLink } from '../components/PrintSheet.js';
import RamadanSheets from '../components/RamadanSheets.js';
import {
  FastingLengthTiles,
  RamadanAbout,
  RamadanDownloads,
  type AboutItem,
} from '../components/RamadanPageParts.js';
import { FITRA_BD, RAMADAN_SHEET } from '../locales/ramadanSheet.js';
import { eidDays, fastingLength, sheetRows } from '../utils/ramadanSheetData.js';
import { isOddNightFast } from '../ramadanShift.js';
import { LeafMark } from './PrayerTimesMonthPage.js';
import RamadanNotice from '../components/RamadanNotice.js';
import type { QrPath } from '../utils/qr.js';
import { formatTimeInZone, methodFacts } from '../utils/calc.js';
import { dateFormat, numberFormat } from '../utils/intl.js';
import { ISLAMIC_FOUNDATION_URL, MONTHLY, formatClock, formatNumber } from '../locales/monthly.js';
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
  const sh = RAMADAN_SHEET[textLang];
  const mloc = MONTHLY[textLang].locale;
  // Bangladesh towns in Bangla: Bangla digits; every other page: Latin digits.
  const num = (n: number) => formatNumber(n, textLang);
  const shortDate = (d: RamadanDay) =>
    dateFormat(mloc, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d.noon);
  const dayMonth = (noon: Date, year = false) =>
    dateFormat(mloc, {
      day: 'numeric',
      month: 'long',
      ...(year ? { year: 'numeric' } : {}),
      timeZone: 'UTC',
    }).format(noon);
  const weekday = (d: RamadanDay) =>
    dateFormat(mloc, { weekday: 'short', timeZone: 'UTC' }).format(d.noon);
  const clock = (time: Date) =>
    bd ? formatClock(time, textLang) : formatTimeInZone(time, city.timezone, locale);
  const fitraLine = FITRA_BD.text[textLang](
    num(FITRA_BD.hijriYear),
    dayMonth(new Date(`${FITRA_BD.announced}T12:00:00Z`), true),
    num(FITRA_BD.minTaka),
    numberFormat(mloc, {}).format(FITRA_BD.maxTaka)
  );
  const linkClass = 'text-brand-gold underline underline-offset-2';

  // Rows that can be the 30th after a shift: the label and the note.
  const labelRows = possibleLabelRows(plan);
  const row = (d: RamadanDay, { visible, possible, fast }: RowState) => {
    const odd = visible && isOddNightFast(fast);
    return (
      <tr
        key={d.date}
        data-date={d.date}
        data-ramadan-row={d.fast}
        data-fast={visible ? d.fast : undefined}
        data-possible={possible ? '' : undefined}
        data-odd={odd ? '' : undefined}
        hidden={!visible}
        className="border-t border-brand-border/60 text-white data-[possible]:text-white/70 data-[odd]:bg-brand-gold/[0.07]"
      >
        <th scope="row" className="py-2 ps-3 pe-1 text-start font-bold whitespace-nowrap">
          <span data-fast-num="">{visible ? num(d.fast) : ''}</span>
          <span data-odd-star="" aria-hidden="true" hidden={!odd} className="ms-1 text-brand-gold">
            ★
          </span>
          {labelRows.includes(d.fast) && (
            <span data-possible-note="" hidden={!possible} className="sr-only">
              {' '}
              ({possible30Label})
            </span>
          )}
        </th>
        <td className="px-2 py-2 whitespace-nowrap">
          {shortDate(d)} <small className="text-[11px] text-white/60">{weekday(d)}</small>
        </td>
        <td className="px-2 py-2 text-center font-semibold text-brand-emerald">
          {clock(d.times.sehri)}
        </td>
        <td className="px-2 py-2 pe-3 text-center font-semibold text-brand-gold">
          {clock(d.times.maghrib)}
        </td>
      </tr>
    );
  };
  const sehriHead = bd
    ? RAMADAN_BD[textLang].columns.sehri
    : sehriBeforeFajr
      ? t.ramadan.suhoorEndsLabel
      : t.ramadan.imsakLabel;
  const iftarHead = bd ? RAMADAN_BD[textLang].columns.iftar : t.ramadan.iftarLabel;
  const masjid = bd ? (
    <p>
      {MONTHLY[textLang].mosqueNote[0]}
      <a
        href={ISLAMIC_FOUNDATION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        {MONTHLY[textLang].mosqueNote[1]}
      </a>
      {MONTHLY[textLang].mosqueNote[2]}
    </p>
  ) : (
    <p>{RAMADAN_WORLD.masjidNote}</p>
  );
  const aboutItems: AboutItem[] = [
    {
      title: sh.aboutDates,
      body: (
        <RamadanNotice
          lang={textLang}
          plan={plan}
          bd={bd}
          country={country}
          linkClassName={linkClass}
        />
      ),
    },
    { title: sh.aboutTimes, body: <p>{timesNote}</p> },
    // Until the Shawwal moon fixes the month's length.
    ...(plan.endSettled ? [] : [{ title: sh.about30, body: <p>{sh.about30Body}</p> }]),
    { title: sh.aboutOdd, body: <p>{sh.aboutOddBody}</p> },
    { title: sh.aboutMasjid, body: masjid },
    ...(bd
      ? [
          {
            title: sh.aboutFitra,
            body: (
              <p>
                {sh.aboutFitraBody}{' '}
                <a
                  href={FITRA_BD.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {fitraLine}
                </a>
              </p>
            ),
          },
        ]
      : []),
  ];
  const barePath = `/ramadan-calendar/${city.slug}/${gregorianYear}`;

  return (
    <Layout
      lang={lang}
      look="bustan"
      printable
      barePath={barePath}
      langs={cityLangs(city)}
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbRamadan },
        { label: cityLabel(city, lang) },
      ]}
    >
      <header className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-9 pb-5 text-center">
        <span className="inline-flex text-brand-gold">
          <LeafMark />
        </span>
        <p className="mt-1 text-xs font-semibold tracking-wide text-brand-gold">{country}</p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
          {t.ramadan.heading(cityName(city, lang), gregorianYear)}
        </h1>
        <p className="mt-2 text-sm text-white/70">
          {t.ramadan.subheading(cityName(city, lang), country)}
        </p>
      </header>

      <FastingLengthTiles lang={textLang} length={fastingLength(plan, shortDate)} num={num} />

      <RamadanShiftNotes
        lang={textLang}
        plan={plan}
        className="mt-3 text-sm font-semibold text-white"
      />
      <RamadanShiftControl lang={textLang} barePath={barePath} look="bustan" />

      <RamadanDownloads lang={textLang} className="mt-4" />
      <OtherTownLink lang={lang} className="mt-2" />

      <div className="mt-4 overflow-x-auto rounded-card border border-brand-border bg-brand-deep shadow-elev-2">
        <table
          className="w-full border-collapse text-sm tabular-nums"
          {...ramadanTableAttrs(plan, textLang)}
        >
          <thead>
            <tr className="text-xs font-semibold text-white/70">
              <th scope="col" className="py-2.5 ps-3 pe-1 text-start">
                {bd ? RAMADAN_BD[textLang].columns.fast : t.ramadan.dayLabel}
              </th>
              <th scope="col" className="px-2 py-2.5 text-start">
                {t.ramadan.dateLabel}
              </th>
              <th scope="col" className="px-2 py-2.5 text-center">
                {sehriHead}
              </th>
              <th scope="col" className="px-2 py-2.5 pe-3 text-center">
                {iftarHead}
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

      <RamadanAbout lang={textLang} items={aboutItems} />

      <a
        href="https://bustandeen.com/fasting"
        className="mt-5 inline-flex min-h-11 items-center rounded-control bg-brand-emerald-dim px-4 py-2.5 text-sm font-bold text-on-color no-underline shadow-elev-1"
      >
        {t.ramadan.liveAppCta}
      </a>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <a
          href={langPath(lang, `/prayer-times/${city.slug}`)}
          className="text-brand-emerald no-underline hover:underline"
        >
          {t.ramadan.prayerTimesCta(cityName(city, lang))} →
        </a>
        <a href="/qibla" className="text-brand-emerald no-underline hover:underline">
          {t.qibla.liveAppCta} →
        </a>
      </div>

      <RamadanSheets
        lang={textLang}
        title={sh.title(num(gregorianYear))}
        checklistTitle={sh.checklistTitle(num(gregorianYear))}
        place={`${cityName(city, lang)}, ${country}`}
        sub={sh.sub(
          num(plan.hijriYear),
          dayMonth(plan.days[0].noon),
          dayMonth(plan.days[plan.days.length - 1].noon, true),
          plan.possible30 && dayMonth(plan.possible30.noon)
        )}
        url={url}
        qr={qr}
        rows={sheetRows(plan, { fast: num, dateLabel: shortDate, weekday, clock })}
        labelRows={labelRows}
        possible30Label={possible30Label}
        tableAttrs={ramadanTableAttrs(plan, textLang)}
        sehriBeforeFajr={bd || sehriBeforeFajr}
        eid={eidDays(plan)
          .map((d) => dayMonth(d))
          .join(` ${sh.or} `)}
        fitra={
          bd
            ? {
                line: fitraLine,
                pending: FITRA_BD.pending[textLang](num(plan.hijriYear)),
                source: FITRA_BD.sourceLabel[textLang],
              }
            : undefined
        }
      />

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
