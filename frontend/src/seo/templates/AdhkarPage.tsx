import { MORNING_ADHKAR, EVENING_ADHKAR, type AdhkarItem } from '../content/adhkar.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';

interface Props {
  lang: SeoLang;
  period: 'morning' | 'evening';
}

export default function AdhkarPage({ lang, period }: Props) {
  const t = CHROME[lang];
  const items: AdhkarItem[] = period === 'morning' ? MORNING_ADHKAR : EVENING_ADHKAR;
  const title = period === 'morning' ? t.adhkar.morningTitle : t.adhkar.eveningTitle;
  const subtitle = period === 'morning' ? t.adhkar.morningSubtitle : t.adhkar.eveningSubtitle;
  const url = `https://bustandeen.com${langPath(lang, `/adhkar/${period}`)}`;

  return (
    <Layout
      lang={lang}
      barePath={`/adhkar/${period}`}
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbAdhkar, path: langPath(lang, '/adhkar/morning') },
        { label: title },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">{title}</h1>
      <p className="text-[#94a3b8] mt-2">{subtitle}</p>

      <div className="mt-4 flex gap-2 text-sm">
        <a
          href={langPath(lang, '/adhkar/morning')}
          className={`rounded-lg px-3 py-1.5 no-underline font-semibold ${
            period === 'morning'
              ? 'bg-[#10b981] text-[#080c12]'
              : 'bg-[#0d1520] border border-[#1e2d42] text-[#94a3b8]'
          }`}
        >
          {t.adhkar.switchToMorning}
        </a>
        <a
          href={langPath(lang, '/adhkar/evening')}
          className={`rounded-lg px-3 py-1.5 no-underline font-semibold ${
            period === 'evening'
              ? 'bg-[#10b981] text-[#080c12]'
              : 'bg-[#0d1520] border border-[#1e2d42] text-[#94a3b8]'
          }`}
        >
          {t.adhkar.switchToEvening}
        </a>
      </div>

      <div className="mt-6 space-y-5">
        {items.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            className="rounded-2xl border border-[#1e2d42] bg-[#0d1520] p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-[#f1f5f9] text-sm">{item.title[lang]}</h2>
              <span className="text-xs rounded-full bg-[#10b981]/10 text-[#10b981] px-2.5 py-0.5 font-semibold whitespace-nowrap">
                {t.adhkar.repeatLabel(item.repeat)}
              </span>
            </div>
            <p
              dir="rtl"
              lang="ar"
              className="text-xl leading-loose text-[#f1f5f9]"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              {item.arabic}
            </p>
            <p className="italic text-[#94a3b8] text-xs">{item.transliteration}</p>
            <p className="text-[#f1f5f9] text-sm leading-relaxed">
              {lang === 'bn' ? item.translation.bn : item.translation.en}
            </p>
            {lang === 'ar' && (
              <p dir="rtl" className="text-[#f1f5f9] text-sm leading-relaxed">
                {item.arabicNote}
              </p>
            )}
            <div className="pt-2 border-t border-[#1e2d42] flex items-center justify-between text-xs">
              <span className="text-[#94a3b8]">{t.adhkar.sourceLabel}</span>
              <a href={item.reference.url} className="text-[#10b981] no-underline hover:underline">
                {item.reference.text} · {item.reference.grade}
              </a>
            </div>
          </div>
        ))}
      </div>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          {
            name: t.breadcrumbAdhkar,
            url: `https://bustandeen.com${langPath(lang, '/adhkar/morning')}`,
          },
          { name: title, url },
        ])}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: title,
          description: subtitle,
          url,
          inLanguage: lang,
          isPartOf: { '@type': 'WebSite', name: 'Bustandeen', url: 'https://bustandeen.com/' },
        }}
      />
    </Layout>
  );
}
