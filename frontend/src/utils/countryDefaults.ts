// Country-aware prayer-time defaults (audit T1.9 / FIQH-01 / SEO-04).
//
// A timetable that disagrees with the local mosque loses trust, and for a
// Ḥanafī user an early ʿAṣr can mean praying it before its time in their own
// school. So the starting point is "what most mosques in this country use",
// not one worldwide default. It is ONLY a default: a saved choice always
// wins, and the app keeps every method and both ʿAṣr schools available.
//
// Pure data + pure functions (no localStorage), so the static SEO pages can
// use exactly the same table at build time.
//
// Sources for the conventions: adhan.js's own method notes, the national
// bodies named below, and what local mosques publish. Reviewed by Istiak
// (decision D4, 2026-10-01: Bangladesh = Karachi + Ḥanafī). Extend the
// table rather than changing FALLBACK.

/** Same ids as adhan.js `CalculationMethod.*()` (see utils/salatPrefs.ts). */
export type CalcMethodId =
  | 'MoonsightingCommittee'
  | 'MuslimWorldLeague'
  | 'Egyptian'
  | 'Karachi'
  | 'UmmAlQura'
  | 'Dubai'
  | 'NorthAmerica'
  | 'Kuwait'
  | 'Qatar'
  | 'Singapore'
  | 'Tehran'
  | 'Turkey';

export type AsrSchool = 'standard' | 'hanafi';

export interface PrayerDefaults {
  method: CalcMethodId;
  asr: AsrSchool;
}

/** What the app used for everyone before this table existed. */
export const FALLBACK_PRAYER_DEFAULTS: PrayerDefaults = {
  method: 'MoonsightingCommittee',
  asr: 'standard',
};

const group = (codes: string[], d: PrayerDefaults) =>
  Object.fromEntries(codes.map((c) => [c, d])) as Record<string, PrayerDefaults>;

/** ISO 3166-1 alpha-2 → defaults. Countries not listed use the fallback. */
export const COUNTRY_PRAYER_DEFAULTS: Record<string, PrayerDefaults> = {
  // South Asia: University of Islamic Sciences, Karachi; Ḥanafī majority.
  ...group(['BD', 'PK', 'IN', 'AF'], { method: 'Karachi', asr: 'hanafi' }),
  // Arabian Peninsula
  ...group(['SA', 'YE', 'OM', 'BH'], { method: 'UmmAlQura', asr: 'standard' }),
  AE: { method: 'Dubai', asr: 'standard' },
  KW: { method: 'Kuwait', asr: 'standard' },
  QA: { method: 'Qatar', asr: 'standard' },
  // Egyptian General Authority of Survey: Egypt and much of the Levant/Iraq.
  ...group(['EG', 'SD', 'LY', 'SY', 'IQ', 'LB', 'JO', 'PS'], {
    method: 'Egyptian',
    asr: 'standard',
  }),
  // Diyanet publishes the earlier ʿAṣr (asr-ı evvel) as the main time.
  TR: { method: 'Turkey', asr: 'standard' },
  // JAKIM / MUIS / Kemenag all use 20° Fajr, 18° Isha (adhan's Singapore).
  ...group(['MY', 'SG', 'BN', 'ID'], { method: 'Singapore', asr: 'standard' }),
  ...group(['US', 'CA'], { method: 'NorthAmerica', asr: 'standard' }),
  // High-latitude UK/Ireland: the Moonsighting Committee's seasonal rules.
  ...group(['GB', 'IE'], { method: 'MoonsightingCommittee', asr: 'standard' }),
  ...group(['FR', 'DE', 'NL', 'BE', 'ES', 'IT', 'SE', 'NO', 'DK', 'AT', 'CH', 'FI'], {
    method: 'MuslimWorldLeague',
    asr: 'standard',
  }),
  IR: { method: 'Tehran', asr: 'standard' },
  // Central Asia: Ḥanafī majority.
  ...group(['UZ', 'KZ', 'TJ', 'KG', 'TM'], { method: 'MuslimWorldLeague', asr: 'hanafi' }),
  // North and West Africa: Mālikī majority.
  ...group(['MA', 'DZ', 'TN', 'NG', 'SN', 'ML', 'NE'], {
    method: 'MuslimWorldLeague',
    asr: 'standard',
  }),
};

export function prayerDefaultsForCountry(countryCode: string | null | undefined): PrayerDefaults {
  if (!countryCode) return FALLBACK_PRAYER_DEFAULTS;
  return COUNTRY_PRAYER_DEFAULTS[countryCode.toUpperCase()] ?? FALLBACK_PRAYER_DEFAULTS;
}

/** IANA time zone → country, for the countries in the table above. Used in
 * the app, where the device's time zone is the only country hint that never
 * leaves the device. Zones not listed (e.g. most of the Americas outside the
 * US/Canada) return null → fallback defaults. */
const TIMEZONE_COUNTRY: Record<string, string> = {
  'Asia/Dhaka': 'BD',
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Kabul': 'AF',
  'Asia/Riyadh': 'SA',
  'Asia/Aden': 'YE',
  'Asia/Muscat': 'OM',
  'Asia/Bahrain': 'BH',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Africa/Cairo': 'EG',
  'Africa/Khartoum': 'SD',
  'Africa/Tripoli': 'LY',
  'Asia/Damascus': 'SY',
  'Asia/Baghdad': 'IQ',
  'Asia/Beirut': 'LB',
  'Asia/Amman': 'JO',
  'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS',
  'Europe/Istanbul': 'TR',
  'Asia/Istanbul': 'TR',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  'Asia/Singapore': 'SG',
  'Asia/Brunei': 'BN',
  'Asia/Jakarta': 'ID',
  'Asia/Pontianak': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Jayapura': 'ID',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Phoenix': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'America/Detroit': 'US',
  'Pacific/Honolulu': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/Regina': 'CA',
  'America/St_Johns': 'CA',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Stockholm': 'SE',
  'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK',
  'Europe/Vienna': 'AT',
  'Europe/Zurich': 'CH',
  'Europe/Helsinki': 'FI',
  'Asia/Tehran': 'IR',
  'Asia/Tashkent': 'UZ',
  'Asia/Samarkand': 'UZ',
  'Asia/Almaty': 'KZ',
  'Asia/Dushanbe': 'TJ',
  'Asia/Bishkek': 'KG',
  'Asia/Ashgabat': 'TM',
  'Africa/Casablanca': 'MA',
  'Africa/Algiers': 'DZ',
  'Africa/Tunis': 'TN',
  'Africa/Lagos': 'NG',
  'Africa/Dakar': 'SN',
  'Africa/Bamako': 'ML',
  'Africa/Niamey': 'NE',
};

export function countryFromTimeZone(timeZone: string | null | undefined): string | null {
  return (timeZone && TIMEZONE_COUNTRY[timeZone]) || null;
}

/** The device's country, from its time zone (no network, no location). */
export function deviceCountry(): string | null {
  try {
    return countryFromTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return null;
  }
}

/** Human-readable country names for the suggestion card. */
export function countryName(countryCode: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}
