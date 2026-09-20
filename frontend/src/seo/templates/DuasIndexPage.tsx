import { DUAS } from '../content/duas.js';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';

interface Props {
  lang: SeoLang;
}

export default function DuasIndexPage({ lang }: Props) {
  const t = CHROME[lang];
  const url = `https://bustandeen.com${langPath(lang, '/duas')}`;

  return (
    <Layout
      lang={lang}
      barePath="/duas"
      breadcrumbs={[
        { label: t.home, path: 'https://bustandeen.com/' },
        { label: t.breadcrumbDuas },
      ]}
    >
      <h1 className="text-2xl sm:text-3xl font-black text-[#f1f5f9]">{t.duas.heading}</h1>
      <p className="text-[#94a3b8] mt-2">{t.duas.subheading}</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {DUAS.map((d) => (
          <a
            key={d.id}
            href={langPath(lang, `/duas/${d.id}`)}
            className="rounded-xl border border-[#1e2d42] bg-[#0d1520] px-4 py-3 text-sm font-semibold text-[#f1f5f9] no-underline hover:border-[#10b981]/50"
          >
            {d.situation[lang]}
          </a>
        ))}
      </div>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: 'https://bustandeen.com/' },
          { name: t.breadcrumbDuas, url },
        ])}
      />
    </Layout>
  );
}
