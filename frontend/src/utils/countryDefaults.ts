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

// ─── National timetable calibration (audit R0a) ─────────────────────────────

export interface TimeAdjustments {
  /** Minutes from Fajr at which sehri ends (negative = before Fajr). Only
   * the end of sehri moves: an earlier Fajr would be the unsafe side for the
   * prayer. */
  sehri?: number;
  /** Minutes added to Maghrib (= iftar) on top of the method's own, through
   * adhan `methodAdjustments`. */
  maghrib?: number;
  /** The country's own Fajr angle, where its authority uses another one than
   * the method (Malaysia: 18°). */
  fajrAngle?: number;
  /** Minutes added to the Fajr prayer time, so it never begins before the
   * official time (only ever later). */
  fajr?: number;
  /** Minutes added to sunrise (the end of Fajr), only ever earlier
   * (negative), so Fajr never ends after the official sunrise. */
  sunrise?: number;
  /** Minutes added to the Dhuhr, Asr and Isha prayer times, only ever
   * later, so none begins before the official time. Asr moves the same for
   * both schools. */
  dhuhr?: number;
  asr?: number;
  isha?: number;
  /** The timetable these minutes were checked against, as the world Ramadan
   * pages name it (English). */
  checkedAgainst: string;
  /** Only iftar was matched (no national timetable for suhoor). */
  iftarOnly?: boolean;
  /** One more line for the world Ramadan pages (English). */
  pageNote?: string;
  /** The method's name on the pages, where the country's own parameters
   * make it another method in effect (Malaysia: JAKIM). */
  methodName?: string;
}

/**
 * Where a country's official timetable runs a little apart from its method,
 * the country default is moved onto it, always to the safe side: sehri never
 * ends later, iftar never comes earlier, a prayer never begins earlier than
 * the official time, sunrise (the end of Fajr) never comes later. Each row is
 * the fewest whole minutes that keep every compared official day on that
 * side.
 *
 * Bangladesh: suhoor ends 3 minutes before Fajr; iftar is 3 minutes after
 * sunset; matched to Islamic Foundation Bangladesh's timetable. That is IF's
 * own rule (sehri ends 3 min before subh sadiq, iftar 3 min after sunset, "as
 * a precaution": Dhaka Tribune, Ramadan 2025). Against IF's Dhaka Ramadan
 * table for 2026 (19 Feb - 20 Mar, dbcnews.tv/ramadan-2026, "source: Islamic
 * Foundation Bangladesh") plain Karachi ended sehri 0-1 min later and put
 * iftar 1-2 min earlier on all 30 days. IF's permanent Dhaka timetable shows
 * the gap about a minute wider from April to August; flat -3/+3 all year
 * stays on the safe side there too (utils/countryDefaults.test.ts). Decision:
 * Istiak, 2026-10-17.
 *
 * Malaysia: JAKIM moved Subuh from 20° to 18° (116th MKI Muzakarah, November
 * 2019); adhan's Singapore method still uses 20°, which put our Fajr prayer
 * 8-12 min before JAKIM's Subuh on every day of 2026. At 18° it is 0-3 min
 * before (JAKIM adds a few minutes of caution), so Fajr +3: never before
 * Subuh. Sehri ends 3 min before that Fajr, at or before JAKIM's Subuh on
 * every day. Iftar: Maghrib was 0-3 min before JAKIM's on 355 days, so
 * Maghrib +3. The other prayers (v5.186.0): JAKIM adds about 2 min of
 * caution (ihtiyat) to every prayer and takes it off syuruk, so the method's
 * Dhuhr was 1-2 min, Asr and Isha 0-3 min before JAKIM's, and sunrise 1-2 min
 * after syuruk. Dhuhr +2, Asr +3 (both schools), Isha +3: never before JAKIM
 * (0-3 min after); sunrise -2: never after syuruk (0-1 min before). Checked
 * against JAKIM e-Solat zone WLY01 (e-solat.gov.my takwimsolat, period=year),
 * all 365 days of 2026 (utils/countryCalibration.test.ts). Decision: Istiak,
 * 2026-10-17.
 *
 * Other countries (audit R0c, read 2026-10-17, approved by Istiak the same
 * day), official days and sources in utils/countryCalibration.test.ts:
 * - TR Diyanet, Istanbul, 366 days: Fajr up to 1 min later, Akşam up to
 *   1 min earlier (outside Ramadan).
 * - SG MUIS, all of 2026: both up to 1 min on the unsafe side.
 * - ID Kemenag, Jakarta, Ramadan 2026: Maghrib 1-2 min earlier.
 * - SA Umm al-Qura (KACST), Makkah + Riyadh, 1448: Fajr up to 1 later,
 *   Maghrib up to 2 earlier.
 * - QA Ministry of Awqaf, 2026: Fajr 0-2 later, Maghrib 1-3 earlier.
 * - AE IACAD Dubai / Awqaf: both 1 min on the unsafe side.
 * - EG Cairo, as printed in the press: Fajr up to 1 later.
 * - MA Ministry of Habous, Rabat, 56 days from January 2025 to November
 *   2026: Morocco's own convention, Fajr at 19° (then 0-1 min after Habous,
 *   so sehri -1) and Maghrib a few minutes after sunset (+4: 0-1 min after).
 * - GB East London Mosque: Maghrib up to 1 earlier. Suhoor stays at the
 *   Moonsighting Committee's Fajr: the UK has no national timetable.
 * Suhoor ends at the official Fajr, not at a printed imsak (Malaysia,
 * Indonesia). Countries not listed were not checked against an official
 * table.
 *
 * The app (utils/prayerTimes.ts) and the static pages (seo/utils/calc.ts)
 * both read this table, so they always show the same minute.
 */
export const COUNTRY_TIME_ADJUSTMENTS: Record<string, TimeAdjustments> = {
  BD: { sehri: -3, maghrib: 3, checkedAgainst: "Islamic Foundation Bangladesh's timetable" },
  MY: {
    fajrAngle: 18,
    fajr: 3,
    sehri: -3,
    sunrise: -2,
    dhuhr: 2,
    asr: 3,
    maghrib: 3,
    isha: 3,
    checkedAgainst: "JAKIM's timetable",
    methodName: 'JAKIM',
    pageNote:
      "JAKIM's timetable also shows imsak, 10 minutes before Subuh, as a caution; the fast itself begins at Subuh.",
  },
  TR: { sehri: -1, maghrib: 1, checkedAgainst: "Diyanet's timetable" },
  SG: { sehri: -1, maghrib: 1, checkedAgainst: "MUIS's timetable" },
  ID: {
    maghrib: 2,
    checkedAgainst: "Kemenag's timetable",
    pageNote:
      "Kemenag's timetable also shows imsak, 10 minutes before Subuh, as a caution; the fast itself begins at Subuh.",
  },
  SA: { sehri: -1, maghrib: 2, checkedAgainst: 'the Umm al-Qura calendar' },
  QA: { sehri: -2, maghrib: 3, checkedAgainst: "the Ministry of Awqaf's timetable" },
  AE: { sehri: -1, maghrib: 1, checkedAgainst: 'the timetables of IACAD Dubai and Awqaf' },
  EG: { sehri: -1, checkedAgainst: 'the published Cairo timetable' },
  MA: {
    fajrAngle: 19,
    sehri: -1,
    maghrib: 4,
    checkedAgainst: "the Ministry of Habous's timetable",
    methodName: 'Moroccan (Ministry of Habous)',
  },
  GB: {
    maghrib: 1,
    checkedAgainst: "East London Mosque's timetable",
    iftarOnly: true,
    pageNote:
      'Many UK masjids, for example East London Mosque, end suhoor earlier than this: follow your local masjid.',
  },
};

/** The calibration for times computed at a place in `countryCode` with
 * `method`, or null. Only the country's own default method is calibrated:
 * someone who picked another method gets that method's own numbers. */
export function countryTimeAdjustments(
  countryCode: string | null | undefined,
  method: CalcMethodId
): TimeAdjustments | null {
  if (!countryCode) return null;
  const cc = countryCode.toUpperCase();
  const adjustments = COUNTRY_TIME_ADJUSTMENTS[cc];
  return adjustments && prayerDefaultsForCountry(cc).method === method ? adjustments : null;
}

/** The adhan times a calibration moves by whole minutes. */
const ADJUSTED_TIMES = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

/** Adds the calibration (the Fajr angle and the minutes per time) to adhan
 * calculation parameters, in place. Typed structurally so this file stays
 * free of adhan (pure data, see the top). Sehri is not an adhan time: see
 * `sehriEnd`. */
export function applyTimeAdjustments<
  P extends {
    fajrAngle: number;
    methodAdjustments: Partial<Record<(typeof ADJUSTED_TIMES)[number], number>>;
  },
>(params: P, adjustments: TimeAdjustments | null): P {
  if (adjustments?.fajrAngle) params.fajrAngle = adjustments.fajrAngle;
  for (const time of ADJUSTED_TIMES) {
    const minutes = adjustments?.[time];
    if (minutes) params.methodAdjustments[time] = (params.methodAdjustments[time] ?? 0) + minutes;
  }
  return params;
}

/** When sehri ends: Fajr, moved by the country calibration. */
export function sehriEnd(fajr: Date, adjustments: TimeAdjustments | null): Date {
  return adjustments?.sehri ? new Date(fajr.getTime() + adjustments.sehri * 60_000) : fajr;
}

/** IANA time zone → country, for the countries in the table above. Used in
 * the app, where the device's time zone is the only country hint that never
 * leaves the device. Zones not listed (e.g. most of the Americas outside the
 * US/Canada) return null → fallback defaults. Every zone the place-zone map
 * (@photostructure/tz-lookup) gives inside a listed country must be here, or
 * that country's places get the fallback while its static pages get the
 * country default (salatPrefs.test.ts checks one city per added zone). */
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
  'America/Indiana/Indianapolis': 'US',
  'America/Indiana/Knox': 'US',
  'America/Indiana/Marengo': 'US',
  'America/Indiana/Petersburg': 'US',
  'America/Indiana/Tell_City': 'US',
  'America/Indiana/Vincennes': 'US',
  'America/Kentucky/Louisville': 'US',
  'America/Kentucky/Monticello': 'US',
  'America/Menominee': 'US',
  'America/North_Dakota/Beulah': 'US',
  'America/North_Dakota/New_Salem': 'US',
  'America/Boise': 'US',
  'America/Juneau': 'US',
  'America/Sitka': 'US',
  'America/Yakutat': 'US',
  'America/Nome': 'US',
  'America/Adak': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Halifax': 'CA',
  'America/Regina': 'CA',
  'America/St_Johns': 'CA',
  'America/Moncton': 'CA',
  'America/Glace_Bay': 'CA',
  'America/Goose_Bay': 'CA',
  'America/Blanc-Sablon': 'CA',
  'America/Atikokan': 'CA',
  'America/Iqaluit': 'CA',
  'America/Rankin_Inlet': 'CA',
  'America/Cambridge_Bay': 'CA',
  'America/Inuvik': 'CA',
  'America/Swift_Current': 'CA',
  'America/Creston': 'CA',
  'America/Dawson_Creek': 'CA',
  'America/Fort_Nelson': 'CA',
  'America/Whitehorse': 'CA',
  'America/Dawson': 'CA',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES',
  'Africa/Ceuta': 'ES',
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
  'Asia/Qostanay': 'KZ',
  'Asia/Qyzylorda': 'KZ',
  'Asia/Aqtobe': 'KZ',
  'Asia/Aqtau': 'KZ',
  'Asia/Atyrau': 'KZ',
  'Asia/Oral': 'KZ',
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
