import { BD_DISTRICTS, BD_DIVISIONS, type BdDivisionId } from '../data/bdDistricts.js';
import { CHROME } from '../locales/chrome.js';
import { MONTHLY, MONTHLY_LANGS, type MonthlyLang } from '../locales/monthly.js';
import Layout, { langPath } from '../components/Layout.js';
import JsonLd, { breadcrumbJsonLd } from '../components/JsonLd.js';
import { LeafMark, monthPagePath } from './PrayerTimesMonthPage.js';
import type { YearMonth } from '../utils/monthTable.js';

interface Props {
  lang: MonthlyLang;
  /** The month the district links open on (the current one). */
  ym: YearMonth;
}

const SITE = 'https://bustandeen.com';

/** /prayer-times/bangladesh: the 64 district timetables, by division. */
export default function BdDistrictsIndexPage({ lang, ym }: Props) {
  const t = CHROME[lang];
  const m = MONTHLY[lang];
  const url = `${SITE}${langPath(lang, '/prayer-times/bangladesh')}`;
  const divisions = (Object.keys(BD_DIVISIONS) as BdDivisionId[]).sort((a, b) =>
    BD_DIVISIONS[a][lang].localeCompare(BD_DIVISIONS[b][lang], m.locale)
  );

  return (
    <Layout
      lang={lang}
      langs={MONTHLY_LANGS}
      look="bustan"
      barePath="/prayer-times/bangladesh"
      breadcrumbs={[{ label: t.home, path: `${SITE}/` }, { label: t.breadcrumbPrayerTimes }]}
    >
      <header className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 pt-9 pb-6 text-center">
        <span className="inline-flex text-brand-gold">
          <LeafMark />
        </span>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-white leading-snug">
          {m.indexHeading}
        </h1>
        <p className="mt-2 text-sm text-white/70">{m.indexSubheading}</p>
      </header>

      <div className="mt-6 space-y-6">
        {divisions.map((div) => {
          const districts = BD_DISTRICTS.filter((d) => d.division === div).sort((a, b) =>
            a[lang].localeCompare(b[lang], m.locale)
          );
          return (
            <section key={div} aria-labelledby={`div-${div}`}>
              <h2 id={`div-${div}`} className="font-display text-lg font-bold text-white">
                {m.division(BD_DIVISIONS[div][lang])}
              </h2>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {districts.map((d) => (
                  <li key={d.id}>
                    <a
                      href={langPath(lang, monthPagePath(d.citySlug, ym))}
                      className="block rounded-control border border-brand-border bg-brand-deep px-3 py-2.5 text-sm font-semibold text-white no-underline shadow-elev-1 hover:border-brand-emerald/40"
                    >
                      {d[lang]}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <JsonLd
        data={breadcrumbJsonLd([
          { name: t.home, url: `${SITE}/` },
          { name: t.breadcrumbPrayerTimes, url },
        ])}
      />
    </Layout>
  );
}
