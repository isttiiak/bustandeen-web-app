import type { CityEntry } from '../data/cities.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd, faqJsonLd } from '../components/JsonLd.js';
import { computePrayerTimes, formatTimeInZone } from '../utils/calc.js';

const LOCALE_BY_LANG: Record<SeoLang, string> = { en: 'en-US', bn: 'bn-BD', ar: 'ar-SA' };

interface Props {
  lang: SeoLang;
  city: CityEntry;
  buildDate: Date;
}

const PRAYER_ROWS: {
  key: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  icon: string;
}[] = [
  { key: 'fajr', icon: '🌅' },
  { key: 'sunrise', icon: '🌄' },
  { key: 'dhuhr', icon: '☀️' },
  { key: 'asr', icon: '🌤️' },
  { key: 'maghrib', icon: '🌆' },
  { key: 'isha', icon: '🌙' },
];

export default function PrayerTimesCityPage({ lang, city, buildDate }: Props) {
  const t = CHROME[lang];
  const locale = LOCALE_BY_LANG[lang];
  const times = computePrayerTimes(city.lat, city.lng, buildDate);
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
        { label: `${city.name}, ${city.country}` },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">
        {t.prayerTimes.heading(city.name)}
      </h1>
      <p className="text-[#94a3b8] mt-2">{t.prayerTimes.subheading(city.name, city.country)}</p>
      <p className="text-xs text-[#94a3b8] mt-1">{dateStr}</p>

      <div className="mt-6 rounded-2xl border border-[#1e2d42] bg-[#0d1520] divide-y divide-[#1e2d42] overflow-hidden">
        {PRAYER_ROWS.map(({ key, icon }) => (
          <div key={key} className="flex items-center justify-between px-4 py-3">
            <span className="flex items-center gap-2 text-[#f1f5f9] font-semibold capitalize">
              <span aria-hidden>{icon}</span> {key}
            </span>
            <span className="text-[#10b981] font-black tabular-nums">
              {formatTimeInZone(times[key], city.timezone, locale)}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[#94a3b8] mt-3">{t.prayerTimes.methodNote}</p>
      <p className="text-xs text-[#94a3b8] mt-1">{t.prayerTimes.hanafiAsrNote}</p>

      <a
        href="https://bustandeen.com/prayer-times"
        className="mt-5 inline-block rounded-xl bg-[#10b981] text-[#080c12] font-bold text-sm px-4 py-2.5 no-underline"
      >
        {t.prayerTimes.liveAppCta}
      </a>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a
          href={langPath(lang, `/qibla/${city.slug}`)}
          className="text-[#10b981] no-underline hover:underline"
        >
          {t.prayerTimes.qiblaCta(city.name)} →
        </a>
        <a
          href={langPath(lang, `/ramadan-calendar/${city.slug}`)}
          className="text-[#10b981] no-underline hover:underline"
        >
          {t.prayerTimes.ramadanCta(city.name)} →
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
          { name: `${city.name}, ${city.country}`, url },
        ])}
      />
      <JsonLd data={faqJsonLd(faq)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t.prayerTimes.heading(city.name),
          description: t.prayerTimes.subheading(city.name, city.country),
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
