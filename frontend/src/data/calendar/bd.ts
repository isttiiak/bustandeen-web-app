// Bangladesh: government holidays and national days for the Islamic calendar
// (Library). Curated by hand from official sources, one year at a time; pure
// data so the static pages can use it too.
//
// Sources, checked 2026-10-15:
// - 2026 holiday list: Ministry of Public Administration notification issued
//   9 Nov 2025, as reported by The Daily Star Bangla ("২০২৬ সালে কোন মাসে কয়দিন
//   ছুটি জানালো সরকার", https://bangla.thedailystar.net/news/bangladesh/news-712741).
//   That report says 14 general holidays but lists 12 dates, and it lists
//   20 March both as Jumatul Bidaa (general) and as a day before Eid
//   (executive order). Entered exactly as listed; check against the gazette
//   PDF before the calendar shows holidays.
// - 22 Oct 2026: added by gazette (Dhaka Tribune, "Gazette issued declaring
//   3-day holiday for Durga Puja").
// - National days that are not holidays: Armed Forces Day 21 Nov (The
//   Financial Express, "Armed Forces Day today"); Martyred Intellectuals' Day
//   14 Dec (Wikipedia, "Martyred Intellectuals Day").
// Moon-dependent holidays (`moon`) can move by a day when the committee
// announces. Optional holidays are not listed.
//
// Upkeep: the next year's list is published around November; add it as a new
// entry in BD_HOLIDAY_YEARS with its source.

export type HolidayKind = 'general' | 'executive';

export interface Holiday {
  date: string; // YYYY-MM-DD
  kind: HolidayKind;
  en: string;
  bn: string;
  /** For a calendar's day box when the name is long. */
  shortEn?: string;
  shortBn?: string;
  /** Depends on the moon (Islamic or other lunar dates). */
  moon?: boolean;
}

export interface HolidayYear {
  year: number;
  sources: { title: string; url: string }[];
  holidays: Holiday[];
}

export interface NationalDay {
  monthDay: string; // MM-DD, every year
  en: string;
  bn: string;
  shortEn?: string;
  shortBn?: string;
}

const EID_FITR = { en: 'Eid al-Fitr holiday', bn: 'ঈদুল ফিতরের ছুটি', moon: true } as const;
const EID_ADHA = { en: 'Eid al-Adha holiday', bn: 'ঈদুল আজহার ছুটি', moon: true } as const;

export const BD_HOLIDAY_YEARS: readonly HolidayYear[] = [
  {
    year: 2026,
    sources: [
      {
        title: 'Ministry of Public Administration notification, 9 Nov 2025 (The Daily Star Bangla)',
        url: 'https://bangla.thedailystar.net/news/bangladesh/news-712741',
      },
      {
        title: 'Durga Puja gazette, Oct 2026 (Dhaka Tribune)',
        url: 'https://www.dhakatribune.com/bangladesh/421533/gazette-issued-declaring-3-day-holiday-for-durga',
      },
    ],
    holidays: [
      { date: '2026-02-04', kind: 'executive', en: 'Shab-e-Barat', bn: 'শবে বরাত', moon: true },
      {
        date: '2026-02-21',
        kind: 'general',
        en: 'Shaheed Day and International Mother Language Day',
        bn: 'শহীদ দিবস ও আন্তর্জাতিক মাতৃভাষা দিবস',
        shortEn: 'Shaheed Day',
        shortBn: 'শহীদ দিবস',
      },
      { date: '2026-03-17', kind: 'executive', en: 'Shab-e-Qadr', bn: 'শবে কদর', moon: true },
      { date: '2026-03-19', kind: 'executive', ...EID_FITR },
      { date: '2026-03-20', kind: 'executive', ...EID_FITR },
      { date: '2026-03-20', kind: 'general', en: 'Jumatul Bidaa', bn: 'জুমাতুল বিদা', moon: true },
      { date: '2026-03-21', kind: 'general', en: 'Eid al-Fitr', bn: 'ঈদুল ফিতর', moon: true },
      { date: '2026-03-22', kind: 'executive', ...EID_FITR },
      { date: '2026-03-23', kind: 'executive', ...EID_FITR },
      {
        date: '2026-03-26',
        kind: 'general',
        en: 'Independence and National Day',
        bn: 'স্বাধীনতা ও জাতীয় দিবস',
        shortEn: 'Independence Day',
        shortBn: 'স্বাধীনতা দিবস',
      },
      {
        date: '2026-04-14',
        kind: 'executive',
        en: 'Bangla New Year (Pohela Boishakh)',
        bn: 'বাংলা নববর্ষ',
        shortEn: 'Pohela Boishakh',
      },
      {
        date: '2026-05-01',
        kind: 'general',
        en: 'May Day and Buddha Purnima',
        bn: 'মে দিবস ও বুদ্ধপূর্ণিমা',
        shortEn: 'May Day',
        shortBn: 'মে দিবস',
      },
      { date: '2026-05-26', kind: 'executive', ...EID_ADHA },
      { date: '2026-05-27', kind: 'executive', ...EID_ADHA },
      { date: '2026-05-28', kind: 'general', en: 'Eid al-Adha', bn: 'ঈদুল আজহা', moon: true },
      { date: '2026-05-29', kind: 'executive', ...EID_ADHA },
      { date: '2026-05-30', kind: 'executive', ...EID_ADHA },
      { date: '2026-05-31', kind: 'executive', ...EID_ADHA },
      { date: '2026-06-26', kind: 'executive', en: 'Ashura', bn: 'আশুরা', moon: true },
      {
        date: '2026-08-05',
        kind: 'general',
        en: 'July Mass Uprising Day',
        bn: 'জুলাই গণঅভ্যুত্থান দিবস',
        shortEn: 'July Uprising Day',
        shortBn: 'গণঅভ্যুত্থান দিবস',
      },
      {
        date: '2026-08-26',
        kind: 'general',
        en: 'Eid-e-Miladunnabi',
        bn: 'ঈদে মিলাদুন্নবী (সা.)',
        shortBn: 'ঈদে মিলাদুন্নবী',
        moon: true,
      },
      { date: '2026-09-04', kind: 'general', en: 'Janmashtami', bn: 'জন্মাষ্টমী', moon: true },
      {
        date: '2026-10-20',
        kind: 'executive',
        en: 'Durga Puja (Mahanabami)',
        bn: 'দুর্গাপূজা (মহানবমী)',
        shortEn: 'Durga Puja',
        shortBn: 'দুর্গাপূজা',
      },
      {
        date: '2026-10-21',
        kind: 'general',
        en: 'Durga Puja (Bijoya Dashami)',
        bn: 'দুর্গাপূজা (বিজয়া দশমী)',
        shortEn: 'Bijoya Dashami',
        shortBn: 'বিজয়া দশমী',
      },
      {
        date: '2026-10-22',
        kind: 'executive',
        en: 'Durga Puja holiday',
        bn: 'দুর্গাপূজার ছুটি',
        shortEn: 'Puja holiday',
        shortBn: 'পূজার ছুটি',
      },
      { date: '2026-12-16', kind: 'general', en: 'Victory Day', bn: 'বিজয় দিবস' },
      { date: '2026-12-25', kind: 'general', en: 'Christmas Day', bn: 'বড়দিন' },
    ],
  },
];

export const BD_NATIONAL_DAYS: readonly NationalDay[] = [
  { monthDay: '11-21', en: 'Armed Forces Day', bn: 'সশস্ত্র বাহিনী দিবস' },
  {
    monthDay: '12-14',
    en: "Martyred Intellectuals' Day",
    bn: 'শহীদ বুদ্ধিজীবী দিবস',
    shortEn: 'Intellectuals Day',
    shortBn: 'বুদ্ধিজীবী দিবস',
  },
];
