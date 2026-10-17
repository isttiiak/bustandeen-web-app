// Strings for the Ramadan calendars of cities outside Bangladesh (v5.178.0).
// Those pages are English only (2026-10-15), so there is no other language.

const minutes = (n: number) => `${n} minute${n === 1 ? '' : 's'}`;

export const RAMADAN_WORLD = {
  possible30: 'If Ramadan has 30 days',
  /** No record for the country: Umm al-Qura's date, subject to the moon sighting. */
  estimateNotice: (start: string) =>
    `Expected first fast: ${start}, by the Umm al-Qura calendar. Ramadan begins with the sighting of the new moon, so where you live it may begin a day earlier or later. Follow the announcement of your local masjid or moon-sighting authority.`,
  /** No record for this Ramadan yet: the country's latest record carried forward. */
  forecastNotice: (start: string, country: string, month: string, since: string) =>
    `Expected first fast: ${start}, based on the latest moon sighting in ${country} (${month} began on ${since}). Ramadan begins with the sighting of the new moon, so the date may still change by a day. Follow the announcement of your local masjid or moon-sighting authority.`,
  announcedNotice: (start: string, country: string) =>
    `First fast in ${country}: ${start}, as announced after the moon sighting.`,
  sourceLink: 'Announcement',
  eidNote: 'The last fast and Eid al-Fitr depend on the sighting of the Shawwal moon.',
  /**
   * How the two times are found. `maghribMinutes`: minutes after sunset in
   * all (the method's own plus the country calibration); `sehriMinutes`:
   * minutes from Fajr at which suhoor ends (negative = before);
   * `seasonal`: the Moonsighting Committee's seasonal Fajr; `country`: set
   * when the method is that country's usual convention; `checkedAgainst` /
   * `iftarOnly`: the official timetable the country default was matched to;
   * `fajrMinutes`, `pageNote`: the country's Fajr caution and extra line
   * (utils/countryDefaults.ts, audits R0c/R0d).
   */
  timesNote: (o: {
    method: string;
    fajrAngle: number;
    fajrMinutes?: number;
    maghribMinutes: number;
    maghribAngle?: number;
    sehriMinutes: number;
    seasonal: boolean;
    country?: string;
    checkedAgainst?: string;
    iftarOnly?: boolean;
    pageNote?: string;
  }) =>
    [
      `${
        o.sehriMinutes < 0
          ? `Suhoor ends ${minutes(-o.sehriMinutes)} before Fajr`
          : 'Suhoor ends when Fajr begins'
      } (${o.method} method, Fajr at ${o.fajrAngle}°${
        o.fajrMinutes ? ` and ${minutes(o.fajrMinutes)} of caution` : ''
      }${o.seasonal ? ", or the committee's seasonal time when that is later" : ''}).`,
      o.maghribAngle
        ? `Iftar is at Maghrib, which this method sets when the sun is ${o.maghribAngle}° below the horizon, some minutes after sunset.`
        : o.maghribMinutes > 0
          ? o.checkedAgainst
            ? `Iftar is at Maghrib, ${minutes(o.maghribMinutes)} after sunset.`
            : `Iftar is at Maghrib, which this method sets ${o.maghribMinutes} minutes after sunset.`
          : 'Iftar is at Maghrib, which this method puts at sunset with no minutes added.',
      o.country ? `This is the convention most masjids in ${o.country} follow.` : '',
      o.checkedAgainst
        ? o.iftarOnly
          ? `Iftar is checked against ${o.checkedAgainst} and never comes earlier than it.`
          : `Checked against ${o.checkedAgainst} and kept on the safe side: suhoor never ends later and iftar never comes earlier.`
        : 'We add no minutes of caution of our own: many timetables end suhoor a few minutes earlier.',
      o.pageNote ?? '',
    ]
      .filter(Boolean)
      .join(' '),
  masjidNote:
    "Times may differ by a few minutes from your local masjid's timetable. For suhoor, iftar and congregational prayer, follow your local masjid.",
};
