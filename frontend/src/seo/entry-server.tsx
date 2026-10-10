import { renderToStaticMarkup } from 'react-dom/server';
import { CHROME, type SeoLang } from './locales/chrome.js';
import { CITIES, cityBySlug, cityCountry, cityName } from './data/cities.js';
import { DUAS } from './content/duas.js';
import { currentHijriYear, ramadanRangeForHijriYear } from './utils/calc.js';
import PrayerTimesCityPage from './templates/PrayerTimesCityPage.js';
import QiblaCityPage from './templates/QiblaCityPage.js';
import RamadanCalendarPage from './templates/RamadanCalendarPage.js';
import RamadanCalendarIndexPage from './templates/RamadanCalendarIndexPage.js';
import DuaSituationPage from './templates/DuaSituationPage.js';
import DuasIndexPage from './templates/DuasIndexPage.js';
import AdhkarPage from './templates/AdhkarPage.js';
import HijriConverterPage from './templates/HijriConverterPage.js';
import AsmaUlHusnaPage from './templates/AsmaUlHusnaPage.js';
import ZakatCalculatorPage from './templates/ZakatCalculatorPage.js';
import PrayerTimesMonthPage from './templates/PrayerTimesMonthPage.js';
import BdDistrictsIndexPage from './templates/BdDistrictsIndexPage.js';
import BdRamadanPage from './templates/BdRamadanPage.js';
import { RAMADAN_BD } from './locales/ramadanBd.js';
import { ramadanPlan } from './utils/ramadanBd.js';
import type { MoonSightingRecord } from '../utils/hijriOffset.js';
import { BD_DISTRICTS } from './data/bdDistricts.js';
import { MONTHLY, formatMonth, formatNumber, type MonthlyLang } from './locales/monthly.js';
import { expiredMonths, monthWindow, ymInZone } from './utils/monthTable.js';
import LandingPage, { landingT, type LandingLang } from './templates/LandingPage.js';
import { LANDING_FAQ, POPULAR_CITY_LINKS } from '../components/LandingSeoSections.js';
import type { SeoClientPage } from './entry-client.js';

export type RouteKind =
  | { kind: 'prayer-times'; citySlug: string }
  | { kind: 'qibla'; citySlug: string }
  | { kind: 'ramadan-calendar'; citySlug: string; hijriYear: number }
  | { kind: 'ramadan-calendar-index' }
  | { kind: 'dua'; duaId: string }
  | { kind: 'duas-index' }
  | { kind: 'adhkar'; period: 'morning' | 'evening' }
  | { kind: 'hijri-converter' }
  | { kind: 'asma-ul-husna' }
  | { kind: 'zakat-calculator' }
  // Bangladesh district timetables (T4.4): English and Bangla only.
  | { kind: 'prayer-times-month'; citySlug: string; ym: string }
  | { kind: 'bd-districts' };

export interface RenderInput {
  route: RouteKind;
  lang: SeoLang;
  buildDate: string; // ISO — passed as a string across the SSR/CLI boundary
  /** Active moon-sighting records (T4.1), fetched by prerender.mjs: the
   * Bangladesh district Ramadan calendars follow the BD ones. */
  moonSighting?: readonly MoonSightingRecord[];
}

// Route-list building data, re-exported here so scripts/prerender.mjs can
// get everything it needs (city list, du'a ids, the Ramadan Hijri→Gregorian
// year mapping) from this one compiled SSR bundle instead of separately
// re-parsing the TS source files in plain Node.
export { CITIES };
export const DUA_IDS = DUAS.map((d) => d.id);
export function currentRamadanHijriYear(): number {
  return currentHijriYear();
}
/** The BD district timetable pages to build at `buildDate`, and the months
 * that fell out of the window (prerender.mjs writes redirects for those). */
export function bdMonthRoutes(buildDate: string): {
  citySlugs: string[];
  months: string[];
  expired: string[];
} {
  const date = new Date(buildDate);
  return {
    citySlugs: BD_DISTRICTS.map((d) => d.citySlug),
    months: monthWindow(date),
    expired: expiredMonths(date),
  };
}
/** The well-formed Bangladesh records from GET /api/calendar/moon-sighting
 * (anything else in the response is ignored). */
export function bdMoonSighting(body: unknown): MoonSightingRecord[] {
  const records = (body as { records?: unknown } | null)?.records;
  if (!Array.isArray(records)) return [];
  return records.filter(
    (r): r is MoonSightingRecord =>
      !!r &&
      r.country === 'BD' &&
      typeof r.effectiveFrom === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(r.effectiveFrom) &&
      (r.offset === -1 || r.offset === 0 || r.offset === 1)
  );
}
export function ramadanGregorianYear(hijriYear: number): number {
  return ramadanRangeForHijriYear(hijriYear).start.getUTCFullYear();
}

export interface RenderResult {
  html: string;
  title: string;
  description: string;
  /** Set for the pages that depend on today's date or are interactive: what
   * prerender.mjs embeds for src/seo/entry-client.tsx. Every other page is
   * complete as HTML and loads no React at all. */
  client?: SeoClientPage;
}

export function renderRoute({
  route,
  lang,
  buildDate,
  moonSighting = [],
}: RenderInput): RenderResult {
  const date = new Date(buildDate);
  const t = CHROME[lang];

  switch (route.kind) {
    case 'prayer-times': {
      const city = cityBySlug(route.citySlug);
      if (!city) throw new Error(`Unknown city slug: ${route.citySlug}`);
      return {
        html: renderToStaticMarkup(
          <PrayerTimesCityPage lang={lang} city={city} buildDate={date} />
        ),
        title: `${t.prayerTimes.heading(cityName(city, lang))} | ${t.siteName}`,
        description: t.prayerTimes.subheading(cityName(city, lang), cityCountry(city, lang)),
        client: { kind: 'prayer-times', city },
      };
    }
    case 'qibla': {
      const city = cityBySlug(route.citySlug);
      if (!city) throw new Error(`Unknown city slug: ${route.citySlug}`);
      return {
        html: renderToStaticMarkup(<QiblaCityPage lang={lang} city={city} />),
        title: `${t.qibla.heading(cityName(city, lang))} | ${t.siteName}`,
        description: t.qibla.subheading(cityName(city, lang), cityCountry(city, lang)),
      };
    }
    case 'ramadan-calendar': {
      const city = cityBySlug(route.citySlug);
      if (!city) throw new Error(`Unknown city slug: ${route.citySlug}`);
      const district = BD_DISTRICTS.find((d) => d.citySlug === city.slug);
      if (district && lang !== 'ar') {
        const plan = ramadanPlan(city, route.hijriYear, moonSighting);
        const name = lang === 'bn' ? district.bn : district.en;
        const year = formatNumber(plan.days[0].noon.getUTCFullYear(), lang);
        return {
          html: renderToStaticMarkup(
            <BdRamadanPage
              lang={lang}
              district={district}
              city={city}
              plan={plan}
              ym={ymInZone(date)}
            />
          ),
          title: `${RAMADAN_BD[lang].title(name, year)} | ${t.siteName}`,
          description: RAMADAN_BD[lang].description(name, year),
        };
      }
      const gYear = ramadanRangeForHijriYear(route.hijriYear).start.getUTCFullYear();
      return {
        html: renderToStaticMarkup(
          <RamadanCalendarPage lang={lang} city={city} hijriYear={route.hijriYear} />
        ),
        title: `${t.ramadan.heading(cityName(city, lang), gYear)} | ${t.siteName}`,
        description: t.ramadan.subheading(cityName(city, lang), cityCountry(city, lang)),
      };
    }
    case 'ramadan-calendar-index': {
      const gYear = ramadanRangeForHijriYear(currentHijriYear()).start.getUTCFullYear();
      return {
        html: renderToStaticMarkup(<RamadanCalendarIndexPage lang={lang} gregorianYear={gYear} />),
        title: `${t.ramadan.indexHeading(gYear)} | ${t.siteName}`,
        description: t.ramadan.indexSubheading,
        client: { kind: 'ramadan-calendar-index' },
      };
    }
    case 'dua': {
      const dua = DUAS.find((d) => d.id === route.duaId);
      if (!dua) throw new Error(`Unknown dua id: ${route.duaId}`);
      return {
        html: renderToStaticMarkup(<DuaSituationPage lang={lang} dua={dua} />),
        title: `${t.duas.pageHeading(dua.situation[lang])} | ${t.siteName}`,
        description: lang === 'bn' ? dua.translation.bn : dua.translation.en,
      };
    }
    case 'duas-index':
      return {
        html: renderToStaticMarkup(<DuasIndexPage lang={lang} />),
        title: `${t.duas.heading} | ${t.siteName}`,
        description: t.duas.subheading,
      };
    case 'adhkar': {
      const title = route.period === 'morning' ? t.adhkar.morningTitle : t.adhkar.eveningTitle;
      const subtitle =
        route.period === 'morning' ? t.adhkar.morningSubtitle : t.adhkar.eveningSubtitle;
      return {
        html: renderToStaticMarkup(<AdhkarPage lang={lang} period={route.period} />),
        title: `${title} | ${t.siteName}`,
        description: subtitle,
      };
    }
    case 'hijri-converter':
      return {
        html: renderToStaticMarkup(<HijriConverterPage lang={lang} buildDate={date} />),
        title: `${t.hijri.title} | ${t.siteName}`,
        description: t.hijri.subtitle,
        client: { kind: 'hijri-converter' },
      };
    case 'asma-ul-husna':
      return {
        html: renderToStaticMarkup(<AsmaUlHusnaPage lang={lang} />),
        title: `${t.asmaUlHusna.title} | ${t.siteName}`,
        description: t.asmaUlHusna.subtitle,
        client: { kind: 'asma-ul-husna' },
      };
    case 'prayer-times-month': {
      const district = BD_DISTRICTS.find((d) => d.citySlug === route.citySlug);
      const city = cityBySlug(route.citySlug);
      if (!district || !city) throw new Error(`Unknown district page: ${route.citySlug}`);
      if (lang === 'ar') throw new Error('District timetables have no Arabic version');
      const m = MONTHLY[lang as MonthlyLang];
      const name = lang === 'bn' ? district.bn : district.en;
      const month = formatMonth(route.ym, lang as MonthlyLang);
      return {
        html: renderToStaticMarkup(
          <PrayerTimesMonthPage
            lang={lang as MonthlyLang}
            district={district}
            city={city}
            ym={route.ym}
            months={monthWindow(date)}
            ramadanYear={ramadanGregorianYear(currentRamadanHijriYear())}
          />
        ),
        title: `${m.title(name, month)} | ${t.siteName}`,
        description: m.description(name, month),
      };
    }
    case 'bd-districts': {
      if (lang === 'ar') throw new Error('District timetables have no Arabic version');
      const m = MONTHLY[lang as MonthlyLang];
      return {
        html: renderToStaticMarkup(
          <BdDistrictsIndexPage lang={lang as MonthlyLang} ym={ymInZone(date)} />
        ),
        title: `${m.indexTitle} | ${t.siteName}`,
        description: m.indexSubheading,
      };
    }
    case 'zakat-calculator':
      return {
        html: renderToStaticMarkup(<ZakatCalculatorPage lang={lang} />),
        title: `${t.zakat.title} | ${t.siteName}`,
        description: t.zakat.subtitle,
        client: { kind: 'zakat-calculator' },
      };
  }
}

/** The prerendered `/` (written into dist/index.html by prerender.mjs), plus
 * what the script needs around it: the FAQ text for FAQPage JSON-LD in the
 * <head> (outside #root, so the React app never removes it) and the city
 * slugs the page links to, which the script checks against the dataset. */
export function renderLanding(lang: LandingLang = 'en'): {
  html: string;
  title: string;
  description: string;
  faq: { q: string; a: string }[];
  citySlugs: string[];
} {
  const t = landingT(lang);
  return {
    html: renderToStaticMarkup(<LandingPage lang={lang} />),
    title: t('landing.seoTitle', 'Bustandeen - Nourish Your Deen'),
    description: t('landing.seoDescription', ''),
    faq: LANDING_FAQ.map(({ q, a }) => ({ q: t(q[0], q[1]), a: t(a[0], a[1]) })),
    citySlugs: POPULAR_CITY_LINKS.map((c) => c.slug),
  };
}
