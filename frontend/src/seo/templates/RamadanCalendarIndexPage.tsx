import { useMemo, useState } from 'react';
import { CITIES } from '../data/cities.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';

// A fixed, curated shortlist - not algorithmically "top population" (that
// would just re-surface the same handful of megacities already dominating
// crawl attention) but one popular city per major region so the page reads
// as genuinely global, matching the site's actual coverage.
const POPULAR_SLUGS = [
  'dhaka-bangladesh',
  'jakarta-indonesia',
  'istanbul-turkey',
  'cairo-egypt',
  'karachi-pakistan',
  'lagos-nigeria',
  'kuala-lumpur-malaysia',
  'london-united-kingdom',
  'new-york-city-united-states',
  'riyadh-saudi-arabia',
  'mumbai-india',
  'toronto-canada',
];

interface Props {
  lang: SeoLang;
  gregorianYear: number;
}

export default function RamadanCalendarIndexPage({ lang, gregorianYear }: Props) {
  const t = CHROME[lang];
  const [query, setQuery] = useState('');
  const url = `https://bustandeen.com${langPath(lang, '/ramadan-calendar')}`;

  const popularCities = useMemo(
    () => POPULAR_SLUGS.map((slug) => CITIES.find((c) => c.slug === slug)).filter(Boolean),
    []
  );

  const normalized = query.trim().toLowerCase();
  const searchResults = normalized
    ? CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(normalized) || c.country.toLowerCase().includes(normalized)
      ).slice(0, 24)
    : [];

  return (
    <Layout
      lang={lang}
      barePath="/ramadan-calendar"
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbRamadan },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">
        {t.ramadan.indexHeading(gregorianYear)}
      </h1>
      <p className="text-[#94a3b8] mt-2">{t.ramadan.indexSubheading}</p>
      <p className="text-xs text-[#94a3b8] mt-3">{t.ramadan.note}</p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.ramadan.searchPlaceholder}
        className="mt-6 w-full rounded-xl bg-[#0d1520] border border-[#1e2d42] text-[#f1f5f9] px-4 py-3 text-sm placeholder:text-[#94a3b8]"
      />

      {normalized ? (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {searchResults.length === 0 ? (
            <p className="col-span-full text-center text-[#94a3b8] text-sm py-6">
              {t.ramadan.noResults}
            </p>
          ) : (
            searchResults.map((c) => (
              <a
                key={c.slug}
                href={langPath(lang, `/ramadan-calendar/${c.slug}/${gregorianYear}`)}
                className="rounded-xl border border-[#1e2d42] bg-[#0d1520] px-4 py-3 text-sm font-semibold text-[#f1f5f9] no-underline hover:border-[#10b981]/50"
              >
                {c.name}
                <span className="block text-xs text-[#94a3b8] font-normal">{c.country}</span>
              </a>
            ))
          )}
        </div>
      ) : (
        <>
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mt-8 mb-3">
            {t.ramadan.popularCitiesLabel}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {popularCities.map((c) => (
              <a
                key={c!.slug}
                href={langPath(lang, `/ramadan-calendar/${c!.slug}/${gregorianYear}`)}
                className="rounded-xl border border-[#1e2d42] bg-[#0d1520] px-4 py-3 text-sm font-semibold text-[#f1f5f9] no-underline hover:border-[#10b981]/50"
              >
                {c!.name}
                <span className="block text-xs text-[#94a3b8] font-normal">{c!.country}</span>
              </a>
            ))}
          </div>
        </>
      )}

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          { name: t.breadcrumbRamadan, url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t.ramadan.indexHeading(gregorianYear),
          description: t.ramadan.indexSubheading,
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
