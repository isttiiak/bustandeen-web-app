import { cityCountry, cityLabel, cityName, type CityEntry } from '../data/cities.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { DownloadPdfButton, PrintSheetHead } from '../components/PrintSheet.js';
import type { QrPath } from '../utils/qr.js';
import { computePrayerTimes, formatTimeInZone, ramadanRangeForHijriYear } from '../utils/calc.js';

const LOCALE_BY_LANG: Record<SeoLang, string> = { en: 'en-US', bn: 'bn-BD', ar: 'ar-SA' };

interface Props {
  lang: SeoLang;
  city: CityEntry;
  hijriYear: number;
  /** QR of the page URL for the A4 sheet (build time only). */
  qr?: QrPath;
}

export default function RamadanCalendarPage({ lang, city, hijriYear, qr }: Props) {
  const t = CHROME[lang];
  const locale = LOCALE_BY_LANG[lang];
  const { start, end } = ramadanRangeForHijriYear(hijriYear);
  const gregorianYear = start.getUTCFullYear();

  const days: { day: number; date: Date; imsak: Date; iftar: Date }[] = [];
  let cursor = new Date(start);
  let day = 1;
  while (cursor.getTime() <= end.getTime()) {
    // Noon UTC on the calendar day avoids DST-boundary date-shift surprises
    // when computing prayer times for that day at the city's coordinates.
    const noon = new Date(
      Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate(), 12)
    );
    const times = computePrayerTimes(city.lat, city.lng, noon, city.countryCode);
    days.push({ day, date: cursor, imsak: times.fajr, iftar: times.maghrib });
    cursor = new Date(cursor.getTime() + 86_400_000);
    day++;
  }

  const url = `https://bustandeen.com${langPath(lang, `/ramadan-calendar/${city.slug}/${gregorianYear}`)}`;

  return (
    <Layout
      lang={lang}
      printable
      barePath={`/ramadan-calendar/${city.slug}/${gregorianYear}`}
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
      <p className="text-xs text-[#94a3b8] mt-3 bg-[#0d1520] border border-[#1e2d42] rounded-xl p-3 print:mt-0 print:mb-2 print:p-0 print:border-0 print:text-[8pt]">
        {t.ramadan.note}
      </p>

      <DownloadPdfButton lang={lang} className="mt-5 text-[#94a3b8]" />

      <div className="mt-6 print:mt-0 rounded-2xl border border-[#1e2d42] bg-[#0d1520] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2d42] text-[#94a3b8] text-xs uppercase tracking-wide">
              <th className="text-start px-4 py-2.5">{t.ramadan.dayLabel}</th>
              <th className="text-start px-4 py-2.5">{t.ramadan.dateLabel}</th>
              <th className="text-end px-4 py-2.5">{t.ramadan.imsakLabel}</th>
              <th className="text-end px-4 py-2.5">{t.ramadan.iftarLabel}</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.day} className="border-b border-[#1e2d42] last:border-0">
                <td className="px-4 py-2 text-[#f1f5f9] font-semibold tabular-nums">{d.day}</td>
                <td className="px-4 py-2 text-[#94a3b8]">
                  {new Intl.DateTimeFormat(locale, {
                    month: 'short',
                    day: 'numeric',
                    timeZone: city.timezone,
                  }).format(d.date)}
                </td>
                <td className="px-4 py-2 text-end text-[#10b981] font-bold tabular-nums">
                  {formatTimeInZone(d.imsak, city.timezone, locale)}
                </td>
                <td className="px-4 py-2 text-end text-[#f59e0b] font-bold tabular-nums">
                  {formatTimeInZone(d.iftar, city.timezone, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <a
          href={langPath(lang, `/qibla/${city.slug}`)}
          className="text-[#10b981] no-underline hover:underline"
        >
          {t.ramadan.qiblaCta(cityName(city, lang))} →
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
