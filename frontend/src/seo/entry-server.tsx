import { renderToStaticMarkup } from 'react-dom/server';
import { CHROME, type SeoLang } from './locales/chrome.js';
import { CITIES, cityBySlug } from './data/cities.js';
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
  | { kind: 'zakat-calculator' };

export interface RenderInput {
  route: RouteKind;
  lang: SeoLang;
  buildDate: string; // ISO — passed as a string across the SSR/CLI boundary
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
export function ramadanGregorianYear(hijriYear: number): number {
  return ramadanRangeForHijriYear(hijriYear).start.getUTCFullYear();
}

export interface RenderResult {
  html: string;
  title: string;
  description: string;
}

export function renderRoute({ route, lang, buildDate }: RenderInput): RenderResult {
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
        title: `${t.prayerTimes.heading(city.name)} | ${t.siteName}`,
        description: t.prayerTimes.subheading(city.name, city.country),
      };
    }
    case 'qibla': {
      const city = cityBySlug(route.citySlug);
      if (!city) throw new Error(`Unknown city slug: ${route.citySlug}`);
      return {
        html: renderToStaticMarkup(<QiblaCityPage lang={lang} city={city} />),
        title: `${t.qibla.heading(city.name)} | ${t.siteName}`,
        description: t.qibla.subheading(city.name, city.country),
      };
    }
    case 'ramadan-calendar': {
      const city = cityBySlug(route.citySlug);
      if (!city) throw new Error(`Unknown city slug: ${route.citySlug}`);
      const gYear = ramadanRangeForHijriYear(route.hijriYear).start.getUTCFullYear();
      return {
        html: renderToStaticMarkup(
          <RamadanCalendarPage lang={lang} city={city} hijriYear={route.hijriYear} />
        ),
        title: `${t.ramadan.heading(city.name, gYear)} | ${t.siteName}`,
        description: t.ramadan.subheading(city.name, city.country),
      };
    }
    case 'ramadan-calendar-index': {
      const gYear = ramadanRangeForHijriYear(currentHijriYear()).start.getUTCFullYear();
      return {
        html: renderToStaticMarkup(<RamadanCalendarIndexPage lang={lang} gregorianYear={gYear} />),
        title: `${t.ramadan.indexHeading(gYear)} | ${t.siteName}`,
        description: t.ramadan.indexSubheading,
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
      };
    case 'asma-ul-husna':
      return {
        html: renderToStaticMarkup(<AsmaUlHusnaPage lang={lang} />),
        title: `${t.asmaUlHusna.title} | ${t.siteName}`,
        description: t.asmaUlHusna.subtitle,
      };
    case 'zakat-calculator':
      return {
        html: renderToStaticMarkup(<ZakatCalculatorPage lang={lang} />),
        title: `${t.zakat.title} | ${t.siteName}`,
        description: t.zakat.subtitle,
      };
  }
}
