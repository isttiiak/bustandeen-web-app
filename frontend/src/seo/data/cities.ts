import raw from '../../data/cities.generated.json';

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

export const CITIES = raw as CityEntry[];

const BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));
export function cityBySlug(slug: string): CityEntry | undefined {
  return BY_SLUG.get(slug);
}
