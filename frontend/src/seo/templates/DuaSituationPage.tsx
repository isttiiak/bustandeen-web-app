import type { DuaEntry } from '../content/duas.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';

interface Props {
  lang: SeoLang;
  dua: DuaEntry;
}

export default function DuaSituationPage({ lang, dua }: Props) {
  const t = CHROME[lang];
  const situationName = dua.situation[lang];
  const url = `https://bustandeen.com${langPath(lang, `/duas/${dua.id}`)}`;

  return (
    <Layout
      lang={lang}
      barePath={`/duas/${dua.id}`}
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbDuas, path: langPath(lang, '/duas') },
        { label: situationName },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">
        {t.duas.pageHeading(situationName)}
      </h1>

      <div className="mt-6 rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-6 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-2">
            {t.duas.arabicLabel}
          </p>
          <p
            dir="rtl"
            lang="ar"
            className="text-2xl leading-loose text-[#f1f5f9]"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {dua.arabic}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-1">
            {t.duas.transliterationLabel}
          </p>
          <p className="italic text-[#94a3b8] text-sm">{dua.transliteration}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#94a3b8] mb-1">
            {t.duas.translationLabel}
          </p>
          <p className="text-[#f1f5f9] text-sm leading-relaxed">
            {lang === 'bn' ? dua.translation.bn : dua.translation.en}
          </p>
        </div>
        {lang === 'ar' && (
          <div>
            <p dir="rtl" className="text-[#f1f5f9] text-sm leading-relaxed">
              {dua.arabicNote}
            </p>
          </div>
        )}
        <div className="pt-3 border-t border-[#1e2d42] flex items-center justify-between text-xs">
          <span className="text-[#94a3b8]">{t.duas.sourceLabel}</span>
          <a href={dua.reference.url} className="text-[#10b981] no-underline hover:underline">
            {dua.reference.text} · {dua.reference.grade}
          </a>
        </div>
      </div>

      <div className="mt-6">
        <a
          href={langPath(lang, '/duas')}
          className="text-[#10b981] no-underline hover:underline text-sm"
        >
          ← {t.duas.allSituations}
        </a>
      </div>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          { name: t.breadcrumbDuas, url: `https://bustandeen.com${langPath(lang, '/duas')}` },
          { name: situationName, url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: t.duas.pageHeading(situationName),
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
