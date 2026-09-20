import type { CityEntry } from '../data/cities.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd, faqJsonLd } from '../components/JsonLd.js';
import { calcQiblaBearing } from '../../utils/qibla.js';
import { distanceToKaabaKm } from '../utils/calc.js';

interface Props {
  lang: SeoLang;
  city: CityEntry;
}

function CompassDiagram({ bearing }: { bearing: number }) {
  const rad = (bearing * Math.PI) / 180;
  const cx = 90;
  const cy = 90;
  const r = 68;
  const x = cx + r * Math.sin(rad);
  const y = cy - r * Math.cos(rad);
  return (
    <svg
      viewBox="0 0 180 180"
      width="180"
      height="180"
      role="img"
      aria-label={`Qibla bearing ${Math.round(bearing)} degrees`}
    >
      <circle cx={cx} cy={cy} r="78" fill="#0d1520" stroke="#1e2d42" strokeWidth="2" />
      <text x={cx} y="18" textAnchor="middle" fill="#94a3b8" fontSize="11">
        N
      </text>
      <text x={cx} y="168" textAnchor="middle" fill="#94a3b8" fontSize="11">
        S
      </text>
      <text x="14" y={cy + 4} textAnchor="middle" fill="#94a3b8" fontSize="11">
        W
      </text>
      <text x="166" y={cy + 4} textAnchor="middle" fill="#94a3b8" fontSize="11">
        E
      </text>
      <line x1={cx} y1={cy} x2={x} y2={y} stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
      <circle cx={x} cy={y} r="6" fill="#f59e0b" />
      <circle cx={cx} cy={cy} r="3" fill="#f1f5f9" />
    </svg>
  );
}

export default function QiblaCityPage({ lang, city }: Props) {
  const t = CHROME[lang];
  const bearing = calcQiblaBearing(city.lat, city.lng);
  const distance = distanceToKaabaKm(city.lat, city.lng);
  const url = `https://bustandeen.com${langPath(lang, `/qibla/${city.slug}`)}`;

  return (
    <Layout
      lang={lang}
      barePath={`/qibla/${city.slug}`}
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbQibla, path: 'https://bustandeen.com/qibla' },
        { label: `${city.name}, ${city.country}` },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">
        {t.qibla.heading(city.name)}
      </h1>
      <p className="text-[#94a3b8] mt-2">{t.qibla.subheading(city.name, city.country)}</p>

      <div className="mt-6 flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-6">
        <CompassDiagram bearing={bearing} />
        <div className="space-y-3 text-center sm:text-start">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#94a3b8]">
              {t.qibla.bearingLabel}
            </p>
            <p className="text-3xl font-black text-[#10b981] tabular-nums">{bearing.toFixed(1)}°</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-[#94a3b8]">
              {t.qibla.distanceLabel}
            </p>
            <p className="text-xl font-bold text-[#f1f5f9] tabular-nums">
              {distance.toLocaleString()} km
            </p>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-[#f1f5f9]">{t.qibla.howToFindTitle}</h2>
        <p className="text-[#94a3b8] text-sm mt-2">{t.qibla.howToFindBody}</p>
      </section>

      <a
        href="https://bustandeen.com/qibla"
        className="mt-5 inline-block rounded-xl bg-[#10b981] text-[#080c12] font-bold text-sm px-4 py-2.5 no-underline"
      >
        {t.qibla.liveAppCta}
      </a>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <a
          href={langPath(lang, `/prayer-times/${city.slug}`)}
          className="text-[#10b981] no-underline hover:underline"
        >
          {t.qibla.prayerTimesCta(city.name)} →
        </a>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-[#f1f5f9]">{t.qibla.faqTitle}</h2>
        <dl className="mt-3 space-y-4">
          {t.qibla.faq.map((f, i) => (
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
          { name: t.breadcrumbQibla, url: 'https://bustandeen.com/qibla' },
          { name: `${city.name}, ${city.country}`, url },
        ])}
      />
      <JsonLd data={faqJsonLd(t.qibla.faq)} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t.qibla.heading(city.name),
          description: t.qibla.subheading(city.name, city.country),
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
