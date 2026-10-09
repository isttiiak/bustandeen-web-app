import raw from '../../data/cities.generated.json';
import { BD_DISTRICTS, bdDistrictForCity } from './bdDistricts.js';
import type { SeoLang } from '../locales/chrome.js';

export interface CityEntry {
  slug: string;
  name: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  timezone: string;
  population: number;
}

// GeoNames names two BD district HQ towns by a part of the town ("Pār
// Naogaon") or the old short name; the pages use the district's name.
const NAME_FIX: Record<string, string> = {
  'par-naogaon-bangladesh': 'Naogaon',
  'nawabganj-bangladesh': 'Chapainawabganj',
};

// District HQ towns of Bangladesh missing from the GeoNames city list (T4.4).
const BD_HQ_CITIES: CityEntry[] = BD_DISTRICTS.flatMap((d) =>
  d.hq
    ? [
        {
          slug: d.citySlug,
          name: d.en,
          country: 'Bangladesh',
          countryCode: 'BD',
          lat: d.hq.lat,
          lng: d.hq.lng,
          timezone: 'Asia/Dhaka',
          population: d.hq.population,
        },
      ]
    : []
);

export const CITIES: CityEntry[] = [
  ...(raw as CityEntry[]).map((c) => (NAME_FIX[c.slug] ? { ...c, name: NAME_FIX[c.slug] } : c)),
  ...BD_HQ_CITIES,
];

const BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));
export function cityBySlug(slug: string): CityEntry | undefined {
  return BY_SLUG.get(slug);
}

/** The city's name in the page language: Bangla district names on the
 * Bangla pages of district HQ towns, otherwise the English name. */
export function cityName(city: CityEntry, lang: SeoLang): string {
  if (lang !== 'bn') return city.name;
  const bd = bdDistrictForCity(city.slug);
  return bd?.isHq ? bd.district.bn : city.name;
}

/** The country name to pair with cityName(). */
export function cityCountry(city: CityEntry, lang: SeoLang): string {
  return cityName(city, lang) !== city.name ? 'বাংলাদেশ' : city.country;
}

/** "City, Country" for breadcrumbs. */
export function cityLabel(city: CityEntry, lang: SeoLang): string {
  return `${cityName(city, lang)}, ${cityCountry(city, lang)}`;
}
