import { cityCountry, cityLabel, cityName, type CityEntry } from '../data/cities.js';
import { bdDistrictForCity } from '../data/bdDistricts.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import { MONTHLY } from '../locales/monthly.js';
import { PRINT } from '../locales/print.js';
import { ymInZone } from '../utils/monthTable.js';
import { monthPagePath } from './PrayerTimesMonthPage.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd, faqJsonLd } from '../components/JsonLd.js';
import { computePrayerTimes, formatTimeInZone } from '../utils/calc.js';
import { countryName } from '../../utils/countryDefaults.js';

const LOCALE_BY_LANG: Record<SeoLang, string> = { en: 'en-US', bn: 'bn-BD', ar: 'ar-SA' };

interface Props {
  lang: SeoLang;
  city: CityEntry;
  buildDate: Date;
}

type RowKey = 'fajr' | 'sunrise' | 'dhuhr' | 'asrStandard' | 'asrHanafi' | 'maghrib' | 'isha';

// ʿAṣr appears twice, once per school: a time that disagrees with the local
// mosque is the fastest way to lose trust (audit SEO-04 / FIQH-01).
const PRAYER_ROWS: { key: RowKey; icon: string }[] = [
  { key: 'fajr', icon: '🌅' },
  { key: 'sunrise', icon: '🌄' },
  { key: 'dhuhr', icon: '☀️' },
  { key: 'asrStandard', icon: '🌤️' },
  { key: 'asrHanafi', icon: '🌤️' },
  { key: 'maghrib', icon: '🌆' },
  { key: 'isha', icon: '🌙' },
];

export default function PrayerTimesCityPage({ lang, city, buildDate }: Props) {
  const t = CHROME[lang];
  const locale = LOCALE_BY_LANG[lang];
  const times = computePrayerTimes(city.lat, city.lng, buildDate, city.countryCode);
  const localCountry = countryName(city.countryCode, locale);
  const bd = bdDistrictForCity(city.slug);
  const partOf = bd && !bd.isHq ? bd.district : undefined;
  // District HQ pages link to the monthly timetable (English and Bangla only).
  const monthly = bd?.isHq && lang !== 'ar' ? bd.district : undefined;
  const rowLabel = (key: RowKey) =>
    key === 'asrStandard'
      ? t.prayerTimes.asrStandardLabel
      : key === 'asrHanafi'
        ? t.prayerTimes.asrHanafiLabel
        : t.prayerTimes.prayerNames[key];
  const isUsualAsr = (key: RowKey) =>
    (key === 'asrStandard' && times.asrSchool === 'standard') ||
    (key === 'asrHanafi' && times.asrSchool === 'hanafi');
  const dateStr = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: city.timezone,
  }).format(buildDate);

  const url = `https://bustandeen.com${langPath(lang, `/prayer-times/${city.slug}`)}`;
  const faq = t.prayerTimes.faq.map((f) => ({
    q: f.q,
    a: f.a,
  }));

  return (
    <Layout
      lang={lang}
      barePath={`/prayer-times/${city.slug}`}
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbPrayerTimes, path: 'https://bustandeen.com/prayer-times' },
        { label: cityLabel(city, lang) },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">
        {t.prayerTimes.heading(cityName(city, lang))}
      </h1>
      <p className="text-[#94a3b8] mt-2">
        {t.prayerTimes.subheading(cityName(city, lang), cityCountry(city, lang))}
      </p>
      <p className="text-xs text-[#94a3b8] mt-1">{dateStr}</p>

      <div className="mt-6 rounded-2xl border border-[#1e2d42] bg-[#0d1520] divide-y divide-[#1e2d42] overflow-hidden">
        {PRAYER_ROWS.map(({ key, icon }) => (
          <div key={key} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-[#f1f5f9] font-semibold">
              <span className="whitespace-nowrap">
                <span aria-hidden>{icon}</span> {rowLabel(key)}
              </span>
              {isUsualAsr(key) && (
                <span className="whitespace-nowrap text-[10px] font-semibold text-[#f59e0b] border border-[#f59e0b]/40 rounded-full px-2 py-0.5">
                  {t.prayerTimes.usualBadge}
                </span>
              )}
            </span>
            <span className="shrink-0 whitespace-nowrap text-[#10b981] font-black tabular-nums">
              {formatTimeInZone(times[key], city.timezone, locale)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#94a3b8] mt-3">
        {t.prayerTimes.methodNote(t.prayerTimes.methodNames[times.method], localCountry)}
      </p>
      <p className="text-xs text-[#94a3b8] mt-1">{t.prayerTimes.asrNote}</p>

      <a
        href="https://bustandeen.com/prayer-times"
        className="mt-5 inline-block rounded-xl bg-[#10b981] text-[#080c12] font-bold text-sm px-4 py-2.5 no-underline"
      >
        {t.prayerTimes.liveAppCta}
      </a>

      {monthly && lang !== 'ar' && (
        <p className="mt-5 flex flex-col gap-2 text-sm">
          <a
            href={langPath(lang, monthPagePath(city.slug, ymInZone(buildDate)))}
            className="text-[#10b981] no-underline hover:underline"
          >
            {MONTHLY[lang].monthlyCta(lang === 'bn' ? monthly.bn : monthly.en)} →
          </a>
          {/* #pdf: the monthly page opens its print window (static-entry.ts) */}
          <a
            href={`${langPath(lang, monthPagePath(city.slug, ymInZone(buildDate)))}#pdf`}
            className="text-[#10b981] no-underline hover:underline"
          >
            {PRINT[lang].monthlyPdf(lang === 'bn' ? monthly.bn : monthly.en)} →
          </a>
        </p>
      )}

      {partOf && (
        <p className="mt-5 text-sm">
          <a
            href={langPath(lang, `/prayer-times/${partOf.citySlug}`)}
            className="text-[#10b981] no-underline hover:underline"
          >
            {t.prayerTimes.partOfDistrict(lang === 'bn' ? partOf.bn : partOf.en)} →
          </a>
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a
          href={langPath(lang, `/qibla/${city.slug}`)}
          className="text-[#10b981] no-underline hover:underline"
        >
          {t.prayerTimes.qiblaCta(cityName(city, lang))} →
        </a>
        <a
          href={langPath(lang, `/ramadan-calendar/${city.slug}`)}
          className="text-[#10b981] no-underline hover:underline"
        >
          {t.prayerTimes.ramadanCta(cityName(city, lang))} →
        </a>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#f1f5f9]">{t.prayerTimes.faqTitle}</h2>
        <dl className="mt-3 space-y-4">
          {faq.map((f, i) => (
            <div key={i}>
              <dt className="font-semibold text-[#f1f5f9] text-sm">{f.q}</dt>
              <dd className="text-[#94a3b8] text-sm mt-1">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          {
            name: t.breadcrumbPrayerTimes,
            url: 'https://bustandeen.com/prayer-times',
          },
          { name: cityLabel(city, lang), url },
        ])}
      />
      <JsonLd data={faqJsonLd(faq)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t.prayerTimes.heading(cityName(city, lang)),
          description: t.prayerTimes.subheading(cityName(city, lang), cityCountry(city, lang)),
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
