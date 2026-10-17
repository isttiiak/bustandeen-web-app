// Strings for the Ramadan calendars of Bangladesh (audit T4.4), English and
// Bangla: the 64 district sheets, and the notes on the other Bangladesh towns.
import type { MonthlyLang } from './monthly.js';

export interface RamadanBdStrings {
  heading: (district: string) => string;
  subheading: (hijriYear: string, year: string) => string;
  title: (district: string, year: string) => string;
  description: (district: string, year: string) => string;
  columns: { fast: string; date: string; sehri: string; iftar: string };
  caption: (district: string, year: string) => string;
  possible30: string;
  /** No Bangladesh record at all: Umm al-Qura's date, subject to the committee. */
  estimateNotice: (start: string) => string;
  /** No record for this Ramadan yet: the latest record (`month` began on
   * `since`) carried forward, subject to the committee. */
  forecastNotice: (start: string, month: string, since: string) => string;
  /** The committee announced the start (a T4.1 record). */
  announcedNotice: (start: string) => string;
  sourceLink: string;
  eidNote: string;
  timesNote: string;
  allDistrictsCta: string;
  monthlyCta: (district: string) => string;
  indexSection: string;
}

export const RAMADAN_BD: Record<MonthlyLang, RamadanBdStrings> = {
  en: {
    heading: (d) => `${d} District Sehri & Iftar Timetable`,
    subheading: (h, y) => `Ramadan ${h} AH · ${y}`,
    title: (d, y) => `Ramadan ${y} Sehri & Iftar Times in ${d} District`,
    description: (d, y) =>
      `Sehri end and iftar time for every day of Ramadan ${y} in ${d} district, Bangladesh, with the expected first fast.`,
    columns: { fast: 'Fast', date: 'Date', sehri: 'Sehri ends', iftar: 'Iftar' },
    caption: (d, y) => `${d}, Ramadan ${y}: sehri and iftar times`,
    possible30: 'If Ramadan has 30 days',
    estimateNotice: (s) =>
      `Expected first fast: ${s}, by the Umm al-Qura calendar. In Bangladesh, Ramadan begins on the announcement of the National Moon Sighting Committee, so the date may differ by a day. Once the committee announces, this calendar will follow its date.`,
    forecastNotice: (s, m, since) =>
      `Expected first fast: ${s}, based on Bangladesh's latest moon sighting (${m} began on ${since}). Ramadan begins on the announcement of the National Moon Sighting Committee, so the date may still change by a day. Once the committee announces, this calendar will follow its date.`,
    announcedNotice: (s) =>
      `First fast in Bangladesh: ${s}, as announced by the National Moon Sighting Committee.`,
    sourceLink: 'Announcement',
    eidNote: 'The last fast and Eid al-Fitr depend on the sighting of the Shawwal moon.',
    timesNote:
      'Sehri ends when Fajr begins (Karachi method, 18°); iftar is at sunset (Maghrib). No minutes of caution are added: many calendars end sehri a few minutes earlier.',
    allDistrictsCta: 'Ramadan calendars for all 64 districts',
    monthlyCta: (d) => `Monthly prayer timetable for ${d}`,
    indexSection: 'Bangladesh: all 64 districts',
  },
  bn: {
    heading: (d) => `${d} জেলার সেহরি ও ইফতারের সময়সূচি`,
    subheading: (h, y) => `রমজান ${h} হিজরি · ${y}`,
    title: (d, y) => `রমজান ${y}: ${d} জেলার সেহরি ও ইফতারের সময়সূচি`,
    description: (d, y) =>
      `${y} সালের রমজানে ${d} জেলার প্রতিদিনের সেহরির শেষ সময় ও ইফতারের সময়, সম্ভাব্য প্রথম রোজার তারিখসহ।`,
    columns: { fast: 'রোজা', date: 'তারিখ', sehri: 'সেহরির শেষ', iftar: 'ইফতার' },
    caption: (d, y) => `${d}, রমজান ${y}: সেহরি ও ইফতারের সময়`,
    possible30: 'রমজান ৩০ দিনের হলে',
    estimateNotice: (s) =>
      `সম্ভাব্য প্রথম রোজা: ${s}, উম্মুল কুরা ক্যালেন্ডার অনুযায়ী। বাংলাদেশে রমজান শুরু হয় জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী, তাই তারিখে এক দিনের পার্থক্য হতে পারে। কমিটির ঘোষণার পর এই ক্যালেন্ডার সেই তারিখ অনুসরণ করবে।`,
    forecastNotice: (s, m, since) =>
      `সম্ভাব্য প্রথম রোজা: ${s}, বাংলাদেশের সর্বশেষ চাঁদ দেখা অনুযায়ী (${m} মাস শুরু হয়েছে ${since})। রমজান শুরু হয় জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী, তাই তারিখ এক দিন বদলাতে পারে। কমিটির ঘোষণার পর এই ক্যালেন্ডার সেই তারিখ অনুসরণ করবে।`,
    announcedNotice: (s) => `জাতীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী বাংলাদেশে প্রথম রোজা ${s}।`,
    sourceLink: 'ঘোষণা',
    eidNote: 'শেষ রোজা ও ঈদুল ফিতর শাওয়ালের চাঁদ দেখার ওপর নির্ভর করে।',
    timesNote:
      'ফজরের ওয়াক্ত শুরু হলে সেহরির সময় শেষ (করাচি পদ্ধতি, ১৮°); ইফতার সূর্যাস্তে (মাগরিব)। সতর্কতার জন্য বাড়তি মিনিট যোগ করা হয়নি; অনেক ক্যালেন্ডারে সেহরি কয়েক মিনিট আগে শেষ ধরা হয়।',
    allDistrictsCta: 'সব ৬৪ জেলার রমজান ক্যালেন্ডার',
    monthlyCta: (d) => `${d} জেলার মাসিক নামাজের সময়সূচি`,
    indexSection: 'বাংলাদেশ: সব ৬৪ জেলা',
  },
};
