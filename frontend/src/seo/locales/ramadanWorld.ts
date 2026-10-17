// Strings for the Ramadan calendars of cities outside Bangladesh (v5.178.0).
// Those pages are English only (2026-10-15), so there is no other language.

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
   * How the two times are found. `maghribMinutes`: minutes the method itself
   * adds after sunset; `seasonal`: the Moonsighting Committee's seasonal Fajr;
   * `country`: set when the method is that country's usual convention.
   */
  timesNote: (o: {
    method: string;
    fajrAngle: number;
    maghribMinutes: number;
    seasonal: boolean;
    country?: string;
  }) =>
    [
      `Suhoor ends when Fajr begins (${o.method} method, Fajr at ${o.fajrAngle}°${
        o.seasonal ? ", or the committee's seasonal time when that is later" : ''
      }).`,
      o.maghribMinutes > 0
        ? `Iftar is at Maghrib, which this method sets ${o.maghribMinutes} minutes after sunset.`
        : 'Iftar is at Maghrib (sunset).',
      o.country ? `This is the convention most masjids in ${o.country} follow.` : '',
      'We add no minutes of caution of our own: many timetables end suhoor a few minutes earlier.',
    ]
      .filter(Boolean)
      .join(' '),
  masjidNote:
    "Times may differ by a few minutes from your local masjid's timetable. For suhoor, iftar and congregational prayer, follow your local masjid.",
};
