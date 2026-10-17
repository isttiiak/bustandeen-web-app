// Thin client-side wrappers so React Router can take over navigation on
// top of the statically pre-rendered pages (see scripts/prerender.mjs).
// Registered three times each in App.tsx — once per language prefix, with
// `lang` passed explicitly — rather than parsing the URL prefix here.
import { useParams } from 'react-router';
import { CHROME, type SeoLang } from '../locales/chrome.js';
import { cityBySlug, cityLangs } from '../data/cities.js';
import { wireLanguageRequest } from '../langRequest.js';
import { DUAS } from '../content/duas.js';
import {
  hijriYearForRamadanGregorianYear,
  currentHijriYear,
  ramadanRangeForHijriYear,
} from '../utils/calc.js';
import PrayerTimesCityPage from '../templates/PrayerTimesCityPage.js';
import RamadanCalendarPage from '../templates/RamadanCalendarPage.js';
import RamadanCalendarIndexPage from '../templates/RamadanCalendarIndexPage.js';
import DuaSituationPage from '../templates/DuaSituationPage.js';
import DuasIndexPage from '../templates/DuasIndexPage.js';
import AdhkarPage from '../templates/AdhkarPage.js';
import HijriConverterPage from '../templates/HijriConverterPage.js';
import AsmaUlHusnaPage from '../templates/AsmaUlHusnaPage.js';
import ZakatCalculatorPage from '../templates/ZakatCalculatorPage.js';
import PrayerTimesMonthPage from '../templates/PrayerTimesMonthPage.js';
import BdDistrictsIndexPage from '../templates/BdDistrictsIndexPage.js';
import BdRamadanPage from '../templates/BdRamadanPage.js';
import { ramadanPlan } from '../utils/ramadanBd.js';
import { readMoonSightingCache } from '../../utils/islamicCalendar.js';
import { BD_DISTRICTS } from '../data/bdDistricts.js';
import type { MonthlyLang } from '../locales/monthly.js';
import { monthWindow, ymInZone } from '../utils/monthTable.js';

// The pages' globe menu form also works when the app's router draws them.
wireLanguageRequest();

function NotFoundInline({ lang }: { lang: SeoLang }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080c12] text-[#f1f5f9] p-6 text-center">
      <div>
        <p className="text-2xl font-black">404</p>
        <a href={lang === 'en' ? '/' : `/${lang}`} className="text-[#10b981] no-underline">
          {CHROME[lang].home}
        </a>
      </div>
    </div>
  );
}

export function PrayerTimesCityRoute({ lang }: { lang: SeoLang }) {
  const { city: citySlug } = useParams();
  const city = citySlug ? cityBySlug(citySlug) : undefined;
  if (!city || !cityLangs(city).includes(lang)) return <NotFoundInline lang={lang} />;
  return <PrayerTimesCityPage lang={lang} city={city} buildDate={new Date()} />;
}

export function RamadanCalendarIndexRoute({ lang }: { lang: SeoLang }) {
  const gregorianYear = ramadanRangeForHijriYear(currentHijriYear()).start.getUTCFullYear();
  return <RamadanCalendarIndexPage lang={lang} gregorianYear={gregorianYear} />;
}

export function RamadanCalendarRoute({ lang }: { lang: SeoLang }) {
  const { city: citySlug, year } = useParams();
  const city = citySlug ? cityBySlug(citySlug) : undefined;
  const gregorianYear = year ? parseInt(year, 10) : NaN;
  if (!city || Number.isNaN(gregorianYear) || !cityLangs(city).includes(lang)) {
    return <NotFoundInline lang={lang} />;
  }
  const hijriYear = hijriYearForRamadanGregorianYear(gregorianYear);
  const district = BD_DISTRICTS.find((d) => d.citySlug === city.slug);
  // In the app: the records the app has cached (useMoonSighting), as the
  // prerendered page applies the ones it fetched at build time.
  const plan = ramadanPlan(city, hijriYear, readMoonSightingCache());
  if (district && lang !== 'ar') {
    return (
      <BdRamadanPage
        lang={lang}
        district={district}
        city={city}
        plan={plan}
        ym={ymInZone(new Date())}
      />
    );
  }
  return (
    <RamadanCalendarPage
      lang={lang}
      city={city}
      plan={plan}
      gregorianYear={ramadanRangeForHijriYear(hijriYear).start.getUTCFullYear()}
    />
  );
}

export function DuaSituationRoute({ lang }: { lang: SeoLang }) {
  const { situation } = useParams();
  const dua = situation ? DUAS.find((d) => d.id === situation) : undefined;
  if (!dua) return <NotFoundInline lang={lang} />;
  return <DuaSituationPage lang={lang} dua={dua} />;
}

export function DuasIndexRoute({ lang }: { lang: SeoLang }) {
  return <DuasIndexPage lang={lang} />;
}

export function AdhkarMorningRoute({ lang }: { lang: SeoLang }) {
  return <AdhkarPage lang={lang} period="morning" />;
}

export function AdhkarEveningRoute({ lang }: { lang: SeoLang }) {
  return <AdhkarPage lang={lang} period="evening" />;
}

export function HijriConverterRoute({ lang }: { lang: SeoLang }) {
  return <HijriConverterPage lang={lang} buildDate={new Date()} />;
}

export function AsmaUlHusnaRoute({ lang }: { lang: SeoLang }) {
  return <AsmaUlHusnaPage lang={lang} />;
}

export function ZakatCalculatorRoute({ lang }: { lang: SeoLang }) {
  return <ZakatCalculatorPage lang={lang} />;
}

export function PrayerTimesMonthRoute({ lang }: { lang: MonthlyLang }) {
  const { city: citySlug, month } = useParams();
  const district = BD_DISTRICTS.find((d) => d.citySlug === citySlug);
  const city = citySlug ? cityBySlug(citySlug) : undefined;
  const months = monthWindow(new Date());
  if (!district || !city || !month || !months.includes(month)) {
    return <NotFoundInline lang={lang} />;
  }
  return (
    <PrayerTimesMonthPage
      lang={lang}
      district={district}
      city={city}
      ym={month}
      months={months}
      ramadanYear={ramadanRangeForHijriYear(currentHijriYear()).start.getUTCFullYear()}
    />
  );
}

export function BdDistrictsRoute({ lang }: { lang: MonthlyLang }) {
  return <BdDistrictsIndexPage lang={lang} ym={ymInZone(new Date())} />;
}
