import { useState } from 'react';
import { ASMA_UL_HUSNA } from '../content/asmaUlHusna.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';

interface Props {
  lang: SeoLang;
}

export default function AsmaUlHusnaPage({ lang }: Props) {
  const t = CHROME[lang];
  const [query, setQuery] = useState('');
  const url = `https://bustandeen.com${langPath(lang, '/asma-ul-husna')}`;

  const normalized = query.trim().toLowerCase();
  const filtered = normalized
    ? ASMA_UL_HUSNA.filter(
        (n) =>
          n.transliteration.toLowerCase().includes(normalized) ||
          n.meaning.en.toLowerCase().includes(normalized) ||
          n.meaning.bn.includes(normalized) ||
          n.arabic.includes(normalized)
      )
    : ASMA_UL_HUSNA;

  return (
    <Layout
      lang={lang}
      barePath="/asma-ul-husna"
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbAsmaUlHusna },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">{t.asmaUlHusna.title}</h1>
      <p className="text-[#94a3b8] mt-2">{t.asmaUlHusna.subtitle}</p>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.asmaUlHusna.searchPlaceholder}
        className="mt-6 w-full rounded-xl bg-[#0d1520] border border-[#1e2d42] text-[#f1f5f9] px-4 py-3 text-sm placeholder:text-[#94a3b8]"
      />

      {filtered.length === 0 ? (
        <p className="text-[#94a3b8] text-sm mt-8 text-center">{t.asmaUlHusna.noResults}</p>
      ) : (
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {filtered.map((n) => (
            <div
              key={n.id}
              className="rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-4 flex items-center gap-4"
            >
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#10b981]/10 text-[#10b981] text-xs font-bold flex items-center justify-center">
                {n.number}
              </span>
              <div className="min-w-0">
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-xl leading-relaxed text-[#f1f5f9]"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {n.arabic}
                </p>
                <p className="text-sm font-bold text-[#f1f5f9] mt-1">{n.transliteration}</p>
                <p className="text-xs text-[#94a3b8] mt-0.5">
                  {lang === 'bn' ? n.meaning.bn : n.meaning.en}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-4">
        <p dir={lang === 'ar' ? 'rtl' : 'ltr'} className="text-xs text-[#94a3b8] leading-relaxed">
          {t.asmaUlHusna.sourceNote}
        </p>
      </div>

      <a
        href="https://bustandeen.com/"
        className="mt-5 inline-block rounded-xl bg-[#10b981] text-[#080c12] font-bold text-sm px-4 py-2.5 no-underline"
      >
        {t.asmaUlHusna.liveAppCta}
      </a>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          { name: t.breadcrumbAsmaUlHusna, url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t.asmaUlHusna.title,
          description: t.asmaUlHusna.subtitle,
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
