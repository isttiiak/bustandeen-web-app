// Strings for the Bangladesh district timetables (audit T4.4): English and
// Bangla only (these pages have no Arabic version). Prayer names follow the
// app's spelling (যুহর, ইশা); Hijri month names are the app's own
// (locales/{en,bn}/common.json hijriMonths).
import { bnOf } from './chrome.js';
import { BD_TZ, type YearMonth } from '../utils/monthTable.js';

export type MonthlyLang = 'en' | 'bn';

export const MONTHLY_LANGS: MonthlyLang[] = ['en', 'bn'];

export const ISLAMIC_FOUNDATION_URL = 'https://islamicfoundation.gov.bd/';

export interface MonthlyStrings {
  locale: string;
  heading: (district: string) => string;
  title: (district: string, month: string) => string;
  description: (district: string, month: string) => string;
  division: (division: string) => string;
  districtCrumb: (district: string) => string;
  columns: {
    date: string;
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  caption: (district: string, month: string) => string;
  prevMonth: (month: string) => string;
  nextMonth: (month: string) => string;
  monthsLabel: string;
  today: string;
  hijriMonths: string[];
  hijriEra: string;
  methodNote: string;
  /** The mosque note, split around the Islamic Foundation link. */
  mosqueNote: [before: string, link: string, after: string];
  hijriNote: string;
  todayCta: (district: string) => string;
  ramadanCta: (district: string) => string;
  allDistrictsCta: string;
  /** On a district's daily page: link to its monthly timetable. */
  monthlyCta: (district: string) => string;
  indexTitle: string;
  indexHeading: string;
  indexSubheading: string;
}

export const MONTHLY: Record<MonthlyLang, MonthlyStrings> = {
  en: {
    locale: 'en-US',
    heading: (d) => `${d} District Prayer Timetable`,
    title: (d, m) => `${d} Prayer Times ${m} (Monthly Timetable)`,
    description: (d, m) =>
      `Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha for every day of ${m} in ${d} district, Bangladesh. Karachi method with Hanafi Asr, as most mosques in Bangladesh use.`,
    division: (v) => `${v} Division`,
    districtCrumb: (d) => `${d} District`,
    columns: {
      date: 'Date',
      fajr: 'Fajr',
      sunrise: 'Sunrise',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
    },
    caption: (d, m) => `${d}, ${m}: daily prayer times`,
    prevMonth: (m) => `Previous month: ${m}`,
    nextMonth: (m) => `Next month: ${m}`,
    monthsLabel: 'Months',
    today: 'Today',
    hijriMonths: [
      'Muharram',
      'Safar',
      "Rabī' al-Awwal",
      "Rabī' al-Ākhir",
      'Jumādā al-Ūlā',
      'Jumādā al-Ākhirah',
      'Rajab',
      "Sha'bān",
      'Ramaḍān',
      'Shawwāl',
      "Dhul Qa'dah",
      'Dhul Ḥijjah',
    ],
    hijriEra: 'AH',
    methodNote:
      'Karachi method (Fajr and Isha at 18°) with Hanafi Asr, the convention most mosques in Bangladesh follow. These are astronomical times: no extra minutes of caution are added.',
    mosqueNote: [
      'Times may differ by a few minutes from your local mosque or the ',
      'Islamic Foundation Bangladesh',
      ' timetable. For congregational prayer, follow your mosque.',
    ],
    hijriNote:
      'Hijri dates follow the Umm al-Qura calendar. In Bangladesh they can differ by a day, depending on the moon sighting.',
    todayCta: (d) => `Today's prayer times in ${d}`,
    ramadanCta: (d) => `Ramadan calendar for ${d}`,
    allDistrictsCta: 'All 64 districts',
    monthlyCta: (d) => `Monthly prayer timetable for ${d}`,
    indexTitle: 'Prayer Times for All 64 Districts of Bangladesh',
    indexHeading: 'Prayer timetables for the 64 districts of Bangladesh',
    indexSubheading:
      'Pick your district for a monthly timetable of Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha.',
  },
  bn: {
    locale: 'bn-BD',
    heading: (d) => `${d} জেলার নামাজের সময়সূচি`,
    title: (d, m) => `${d} জেলার নামাজের সময়সূচি, ${m}`,
    description: (d, m) =>
      `${m} মাসে ${d} জেলার প্রতিদিনের ফজর, সূর্যোদয়, যুহর, আসর, মাগরিব ও ইশার সময়। করাচি পদ্ধতি ও হানাফি আসর, বাংলাদেশের বেশিরভাগ মসজিদ যা অনুসরণ করে।`,
    division: (v) => `${v} বিভাগ`,
    districtCrumb: (d) => `${d} জেলা`,
    columns: {
      date: 'তারিখ',
      fajr: 'ফজর',
      sunrise: 'সূর্যোদয়',
      dhuhr: 'যুহর',
      asr: 'আসর',
      maghrib: 'মাগরিব',
      isha: 'ইশা',
    },
    caption: (d, m) => `${d}, ${m}: প্রতিদিনের নামাজের সময়`,
    prevMonth: (m) => `আগের মাস: ${m}`,
    nextMonth: (m) => `পরের মাস: ${m}`,
    monthsLabel: 'মাস',
    today: 'আজ',
    hijriMonths: [
      'মুহাররম',
      'সফর',
      'রবিউল আউয়াল',
      'রবিউল আখির',
      'জুমাদাল উলা',
      'জুমাদাল আখিরাহ',
      'রজব',
      "শা'বান",
      'রমজান',
      'শাওয়াল',
      'যুলক্বাদাহ',
      'যুলহিজ্জাহ',
    ],
    hijriEra: 'হিজরি',
    methodNote:
      'করাচি পদ্ধতি (ফজর ও ইশা ১৮°) ও হানাফি আসর, বাংলাদেশের বেশিরভাগ মসজিদ যা অনুসরণ করে। এগুলো জ্যোতির্বিদ্যার হিসাব, সতর্কতার জন্য বাড়তি কোনো মিনিট যোগ করা হয়নি।',
    mosqueNote: [
      'স্থানীয় মসজিদ বা ',
      'ইসলামিক ফাউন্ডেশন বাংলাদেশ',
      '-এর সময়সূচির সঙ্গে কয়েক মিনিট পার্থক্য হতে পারে। জামাতের জন্য আপনার মসজিদের সময় অনুসরণ করুন।',
    ],
    hijriNote:
      'হিজরি তারিখ উম্মুল কুরা ক্যালেন্ডার অনুযায়ী। বাংলাদেশে চাঁদ দেখার ওপর নির্ভর করে এক দিন পার্থক্য হতে পারে।',
    todayCta: (d) => `${bnOf(d)} আজকের নামাজের সময়`,
    ramadanCta: (d) => `${bnOf(d)} রমজান ক্যালেন্ডার`,
    allDistrictsCta: 'সব ৬৪ জেলা',
    monthlyCta: (d) => `${bnOf(d)} মাসিক নামাজের সময়সূচি`,
    indexTitle: 'বাংলাদেশের ৬৪ জেলার নামাজের সময়সূচি',
    indexHeading: 'বাংলাদেশের ৬৪ জেলার নামাজের সময়সূচি',
    indexSubheading:
      'আপনার জেলা বেছে নিন: ফজর, সূর্যোদয়, যুহর, আসর, মাগরিব ও ইশার মাসিক সময়সূচি।',
  },
};

/** "October 2026" / "অক্টোবর ২০২৬". */
export function formatMonth(ym: YearMonth, lang: MonthlyLang, withYear = true): string {
  const [y, m] = ym.split('-').map(Number);
  return new Intl.DateTimeFormat(MONTHLY[lang].locale, {
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 15)));
}

/** "4:35" / "৪:৩৫": a timetable column needs no AM/PM. */
export function formatClock(date: Date, lang: MonthlyLang): string {
  const parts = new Intl.DateTimeFormat(MONTHLY[lang].locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: BD_TZ,
  }).formatToParts(date);
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '';
  return `${hour}:${minute}`;
}

export function formatNumber(n: number, lang: MonthlyLang): string {
  return new Intl.NumberFormat(MONTHLY[lang].locale, { useGrouping: false }).format(n);
}

/** Short weekday of a noon-UTC date: "Thu" / "বৃহস্পতি". */
export function formatWeekday(noon: Date, lang: MonthlyLang): string {
  return new Intl.DateTimeFormat(MONTHLY[lang].locale, {
    weekday: 'short',
    timeZone: 'UTC',
  }).format(noon);
}
