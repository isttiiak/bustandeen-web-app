// Which cities get SEO pages (/prayer-times/{city}, /ramadan-calendar/{city}/{year}),
// decided 2026-10-15 (Istiak): about 500 cities, chosen by NEED, not size.
//
// - Bangladesh: every city we have (the home market; the 64 district
//   timetables and Ramadan calendars hang off these pages).
// - Muslim-majority countries: 1 to 3 cities. Local mosques, adhan and printed
//   timetables are everywhere there, so a page per town adds little.
// - Muslim-minority countries with real communities (Europe, North America,
//   Oceania, East Asia...): many cities. This is where a Muslim often has no
//   mosque timetable at hand, so the pages are most useful.
// - Countries with very few Muslims: one city (the largest), or none.
//
// Numbers are the cities per country. PINS are always taken first (in this
// order, by GeoNames name), then the largest remaining cities fill the quota.
// Every country not listed gets 0.

export const ALL = 'all';

export const QUOTA = {
  // Home market
  BD: ALL,

  // Muslim-majority: 1-3
  ID: 3,
  PK: 3,
  NG: 3,
  EG: 3,
  IR: 3,
  TR: 3,
  SA: 3,
  DZ: 2,
  SD: 2,
  IQ: 2,
  AF: 2,
  MA: 2,
  UZ: 2,
  MY: 2,
  SY: 2,
  KZ: 2,
  AE: 2,
  PS: 2,
  YE: 1,
  NE: 1,
  ML: 1,
  BF: 1,
  SN: 1,
  TN: 1,
  AZ: 1,
  JO: 1,
  LY: 1,
  LB: 1,
  OM: 1,
  KW: 1,
  QA: 1,
  BH: 1,
  TJ: 1,
  KG: 1,
  TM: 1,
  AL: 1,
  BA: 1,
  XK: 1,
  SO: 1,
  GN: 1,
  SL: 1,
  TD: 1,
  MR: 1,
  GM: 1,
  DJ: 1,
  KM: 1,
  MV: 1,
  BN: 1,
  GW: 1,

  // Muslim minorities: where the pages are needed most
  // Europe
  GB: 20,
  DE: 20,
  FR: 20,
  IT: 10,
  ES: 10,
  NL: 10,
  BE: 8,
  SE: 8,
  CH: 6,
  AT: 5,
  NO: 5,
  DK: 5,
  FI: 4,
  IE: 3,
  PT: 3,
  GR: 3,
  PL: 3,
  RU: 8,
  UA: 3,
  CY: 2,
  BG: 2,
  RS: 2,
  MK: 2,
  GE: 2,
  CZ: 2,
  HU: 2,
  RO: 2,
  LU: 1,
  IS: 1,
  HR: 1,
  SI: 1,
  SK: 1,
  ME: 1,
  EE: 1,
  LV: 1,
  LT: 1,
  MD: 1,
  AM: 1,
  BY: 1,
  // North America, Oceania
  US: 30,
  CA: 12,
  AU: 10,
  NZ: 3,
  // Asia
  IN: 15,
  JP: 10,
  KR: 6,
  CN: 6,
  TH: 5,
  PH: 5,
  LK: 4,
  SG: 1,
  HK: 1,
  TW: 2,
  MM: 3,
  KH: 2,
  VN: 2,
  NP: 2,
  IL: 3,
  MN: 1,
  LA: 1,
  // Africa (Muslim-minority)
  ZA: 6,
  KE: 4,
  ET: 3,
  TZ: 3,
  GH: 3,
  CI: 3,
  CM: 2,
  UG: 2,
  MZ: 2,
  BJ: 2,
  CD: 2,
  TG: 1,
  MG: 1,
  MW: 1,
  ZM: 1,
  ZW: 1,
  AO: 1,
  CG: 1,
  RW: 1,
  LR: 1,
  GA: 1,
  MU: 1,
  ER: 1,
  SS: 1,
  // Latin America, Caribbean (few Muslims: mostly one city)
  BR: 4,
  AR: 3,
  MX: 3,
  TT: 2,
  CO: 2,
  CL: 2,
  VE: 2,
  GY: 1,
  SR: 1,
  PE: 1,
  EC: 1,
  PA: 1,
  CU: 1,
  DO: 1,
  JM: 1,
  PR: 1,
  FJ: 1,
};

// Taken first, by GeoNames name: capitals and the cities people actually
// search for (the landing page and the Ramadan index link to several).
export const PINS = {
  PK: ['Karachi', 'Lahore', 'Islamabad'],
  SA: ['Mecca', 'Medina', 'Riyadh'],
  AE: ['Dubai', 'Abu Dhabi'],
  IN: ['Mumbai', 'Delhi', 'Hyderabad', 'Lucknow', 'Kolkata', 'Bengaluru', 'Srinagar'],
  MY: ['Kuala Lumpur'],
  PS: ['Gaza', 'Hebron'],
  TR: ['Istanbul', 'Ankara'],
  EG: ['Cairo', 'Alexandria'],
  NG: ['Lagos', 'Kano', 'Abuja'],
  ID: ['Jakarta'],
  MA: ['Casablanca', 'Rabat'],
  KZ: ['Almaty', 'Nur-Sultan'],
  IL: ['Jerusalem'],
  GB: ['London', 'Birmingham', 'Manchester', 'Bradford', 'Leicester'],
  US: ['New York City', 'Dearborn'],
  CA: ['Toronto', 'Mississauga', 'Montréal'],
  AU: ['Sydney', 'Melbourne'],
};

// GeoNames still has the old name; pages show the current one.
export const RENAME = { 'KZ:Nur-Sultan': 'Astana' };

// Never pages of their own: boroughs and districts inside a bigger city.
export const SKIP = new Set([
  'US:Brooklyn',
  'US:Queens',
  'US:Manhattan',
  'US:The Bronx',
  'US:Staten Island',
]);

/** Smallest town to consider, and how close two picks may be (km): a suburb
 *  of a city already picked shares its prayer times within a minute. */
export const MIN_POPULATION = 50_000;
export const MIN_DISTANCE_KM = 25;
