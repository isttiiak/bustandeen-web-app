// Strings for the three Ramadan print sheets and the page parts around them
// (R2-R4, prototype docs/design/ramadan-print-sheet.html approved 2026-10-17):
// 1. timetable (with the Laylat al-Qadr duʿā and the Zakat al-Fitr reminder),
// 2. timetable + checklist, 3. a separate Ramadan checklist; each in colour
// or black and white. English and Bangla (worldwide pages are English only).

export type SheetLang = 'en' | 'bn';
export type SheetVariant = 'timetable' | 'combined' | 'checklist';
export type SheetInk = 'color' | 'bw';

export const SHEET_VARIANTS: readonly SheetVariant[] = ['timetable', 'combined', 'checklist'];

export interface RamadanSheetStrings {
  /** "Ramadan 2027 Suhoor & Iftar" (BD: সেহরি ও ইফতার). */
  title: (year: string) => string;
  checklistTitle: (year: string) => string;
  bangladesh: string;
  /** "Ramadan 1448 AH · 9 February to 9 March 2027 (10 March if Ramadan has 30 days)" */
  sub: (hijri: string, from: string, to: string, if30?: string) => string;
  columns: {
    fast: string;
    date: string;
    day: string;
    sehri: string;
    sehriShort: string;
    iftar: string;
    iftarShort: string;
  };
  prayers: readonly string[];
  prayersGroup: string;
  tarawih: string;
  quranPages: string;
  nafl: string;
  tahajjud: string;
  duha: string;
  adhkarAm: string;
  adhkarPm: string;
  sadaqah: string;
  fasted: string;
  footnote: string;
  footnoteChecklist: string;
  scan: string;
  scanApp: string;
  name: string;
  juz: string;
  intentions: string;
  zakatGiven: string;
  duaTitle: string;
  zakatTitle: string;
  zakat: (eid: string) => string;
  zakatAskMasjid: string;
  or: string;
  /** Download panel. */
  downloadTitle: string;
  download: Record<SheetVariant, string>;
  downloadHelp: Record<SheetVariant, string>;
  ink: Record<SheetInk, string>;
  inkLabel: string;
  hint: string;
  /** Fasting-length tiles. */
  shortest: string;
  longest: string;
  grows: string;
  hoursMinutes: (h: string, m: string) => string;
  minutesOnly: (m: string) => string;
  durationLine: (first: string, last: string) => string;
  /** "About these dates and times". */
  aboutTitle: string;
  aboutDates: string;
  aboutTimes: string;
  about30: string;
  about30Body: string;
  aboutOdd: string;
  aboutOddBody: string;
  aboutMasjid: string;
  aboutFitra: string;
  aboutFitraBody: string;
}

export const RAMADAN_SHEET: Record<SheetLang, RamadanSheetStrings> = {
  en: {
    title: (y) => `Ramadan ${y} Suhoor & Iftar`,
    checklistTitle: (y) => `My Ramadan ${y}`,
    bangladesh: 'Bangladesh',
    sub: (h, from, to, if30) =>
      `Ramadan ${h} AH · ${from} to ${to}${if30 ? ` (${if30} if Ramadan has 30 days)` : ''}`,
    columns: {
      fast: 'Fast',
      date: 'Date',
      day: 'Day',
      sehri: 'Suhoor ends (Fajr)',
      sehriShort: 'Suhoor ends',
      iftar: 'Iftar (Maghrib)',
      iftarShort: 'Iftar',
    },
    prayers: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
    prayersGroup: 'Prayers',
    tarawih: 'Tarawih',
    quranPages: 'Quran (pages)',
    nafl: 'Nafl',
    tahajjud: 'Tahajjud',
    duha: 'Duha',
    adhkarAm: 'Morning adhkar',
    adhkarPm: 'Evening adhkar',
    sadaqah: 'Sadaqah',
    fasted: 'Fasted',
    footnote: '★ Odd nights of the last ten · Follow your local masjid',
    footnoteChecklist: '★ Odd nights of the last ten',
    scan: 'Scan to open online',
    scanApp: 'Track it in the app',
    name: 'Name',
    juz: 'Quran khatm: tick each juz you finish',
    intentions: 'My intentions and duʿās this Ramadan',
    zakatGiven: 'Zakat al-Fitr given before the Eid prayer',
    duaTitle: 'Duʿā for Laylat al-Qadr',
    zakatTitle: 'Zakat al-Fitr',
    zakat: (eid) => `Give it before the Eid prayer (Bukhari 1503). Eid is expected on ${eid}.`,
    zakatAskMasjid: "Ask your masjid for this year's amount.",
    or: 'or',
    downloadTitle: 'Print this Ramadan',
    download: {
      timetable: 'Timetable',
      combined: 'Timetable + checklist',
      checklist: 'Ramadan checklist',
    },
    downloadHelp: {
      timetable: 'Suhoor and iftar, the Laylat al-Qadr duʿā and Zakat al-Fitr.',
      combined: 'The same times with boxes for prayers, tarawih, Quran and nafl.',
      checklist: 'A page to tick your fasts, prayers, Quran, adhkar and sadaqah.',
    },
    ink: { color: 'Colour', bw: 'Black and white' },
    inkLabel: 'Ink',
    hint: 'Opens the print window: choose "Save as PDF". A4, one page.',
    shortest: 'Shortest fast',
    longest: 'Longest fast',
    grows: 'The days grow by',
    hoursMinutes: (h, m) => `${h} h ${m} min`,
    minutesOnly: (m) => `${m} min`,
    durationLine: (first, last) =>
      `Fasting time, from the end of suhoor to iftar: ${first} on the first day, ${last} on the last.`,
    aboutTitle: 'About these dates and times',
    aboutDates: 'Where the dates come from',
    aboutTimes: 'How the times are found',
    about30: 'The 30th fast',
    about30Body:
      'Ramadan has 29 or 30 days. If the Shawwal moon is not seen on the evening of the 29th fast, a 30th fast is kept (Bukhari 1909). Once the moon is announced, the row stays or goes.',
    aboutOdd: '★ The odd nights',
    aboutOddBody:
      'Laylat al-Qadr is sought in the odd nights of the last ten (Bukhari 2017). The Islamic night comes before its day: the night of the 21st begins at the iftar of the 20th fast. The star marks the fast that follows each odd night.',
    aboutMasjid: 'Your local masjid',
    aboutFitra: 'Zakat al-Fitr amounts',
    aboutFitraBody:
      "Islamic Foundation's national fitra committee announces the amounts each Ramadan. We show them with the date and a link once they are announced; until then the sheet shows last year's figures, marked as such.",
  },
  bn: {
    title: (y) => `রমজান ${y}: সেহরি ও ইফতার`,
    checklistTitle: (y) => `আমার রমজান ${y}`,
    bangladesh: 'বাংলাদেশ',
    sub: (h, from, to, if30) =>
      `রমজান ${h} হিজরি · ${from} থেকে ${to}${if30 ? ` (রমজান ৩০ দিনের হলে ${if30})` : ''}`,
    columns: {
      fast: 'রোজা',
      date: 'তারিখ',
      day: 'বার',
      sehri: 'সেহরির শেষ',
      sehriShort: 'সেহরির শেষ',
      iftar: 'ইফতার (মাগরিব)',
      iftarShort: 'ইফতার',
    },
    prayers: ['ফজর', 'যুহর', 'আসর', 'মাগরিব', 'ইশা'],
    prayersGroup: 'নামাজ',
    tarawih: 'তারাবীহ',
    quranPages: 'কুরআন (পৃষ্ঠা)',
    nafl: 'নফল',
    tahajjud: 'তাহাজ্জুদ',
    duha: 'দুহা',
    adhkarAm: 'সকালের আযকার',
    adhkarPm: 'সন্ধ্যার আযকার',
    sadaqah: 'সদকা',
    fasted: 'রোজা',
    footnote: '★ শেষ দশকের বেজোড় রাত · স্থানীয় মসজিদ অনুসরণ করুন',
    footnoteChecklist: '★ শেষ দশকের বেজোড় রাত',
    scan: 'স্ক্যান করে অনলাইনে দেখুন',
    scanApp: 'অ্যাপে ট্র্যাক করুন',
    name: 'নাম',
    juz: 'কুরআন খতম: প্রতিটি পারা শেষ হলে টিক দিন',
    intentions: 'এই রমজানে আমার নিয়ত ও দোয়া',
    zakatGiven: 'ঈদের নামাজের আগে সাদাকাতুল ফিতর আদায় করেছি',
    duaTitle: 'লাইলাতুল কদরের দোয়া',
    zakatTitle: 'সাদাকাতুল ফিতর (ফিতরা)',
    zakat: (eid) => `ঈদের নামাজের আগে আদায় করুন (বুখারি ১৫০৩)। সম্ভাব্য ঈদ ${eid}।`,
    zakatAskMasjid: 'এ বছরের পরিমাণ আপনার মসজিদে জেনে নিন।',
    or: 'অথবা',
    downloadTitle: 'এই রমজান প্রিন্ট করুন',
    download: {
      timetable: 'সময়সূচি',
      combined: 'সময়সূচি + চেকলিস্ট',
      checklist: 'রমজান চেকলিস্ট',
    },
    downloadHelp: {
      timetable: 'সেহরি ও ইফতার, লাইলাতুল কদরের দোয়া ও সাদাকাতুল ফিতর।',
      combined: 'একই সময়, সঙ্গে নামাজ, তারাবীহ, কুরআন ও নফলের ঘর।',
      checklist: 'রোজা, নামাজ, কুরআন, আযকার ও সদকায় টিক দেওয়ার পাতা।',
    },
    ink: { color: 'রঙিন', bw: 'সাদা-কালো' },
    inkLabel: 'রং',
    hint: 'প্রিন্ট উইন্ডো খুলবে: "PDF হিসেবে সেভ" বেছে নিন। A4, এক পাতা।',
    shortest: 'সবচেয়ে ছোট রোজা',
    longest: 'সবচেয়ে বড় রোজা',
    grows: 'দিন বাড়ে',
    hoursMinutes: (h, m) => `${h} ঘণ্টা ${m} মিনিট`,
    minutesOnly: (m) => `${m} মিনিট`,
    durationLine: (first, last) =>
      `রোজার সময়, সেহরির শেষ থেকে ইফতার: প্রথম দিন ${first}, শেষ দিন ${last}।`,
    aboutTitle: 'এই তারিখ ও সময় সম্পর্কে',
    aboutDates: 'তারিখ কোথা থেকে',
    aboutTimes: 'সময় কীভাবে হিসাব করা',
    about30: '৩০তম রোজা',
    about30Body:
      'রমজান ২৯ বা ৩০ দিনের হয়। ২৯তম রোজার সন্ধ্যায় শাওয়ালের চাঁদ দেখা না গেলে ৩০তম রোজা রাখা হয় (বুখারি ১৯০৯)। চাঁদ দেখার ঘোষণার পর সারিটি থাকবে বা মুছে যাবে।',
    aboutOdd: '★ বেজোড় রাত',
    aboutOddBody:
      'শেষ দশকের বেজোড় রাতে লাইলাতুল কদর তালাশ করা হয় (বুখারি ২০১৭)। ইসলামি রাত দিনের আগে আসে: ২১তম রাত শুরু হয় ২০তম রোজার ইফতারের পর। তারকা চিহ্ন প্রতিটি বেজোড় রাতের পরের রোজায় দেওয়া।',
    aboutMasjid: 'স্থানীয় মসজিদ',
    aboutFitra: 'ফিতরার হার',
    aboutFitraBody:
      'ইসলামিক ফাউন্ডেশনের জাতীয় ফিতরা নির্ধারণ কমিটি প্রতি রমজানে হার ঘোষণা করে। ঘোষণার পর তারিখ ও লিংকসহ এখানে দেখানো হয়; তার আগে আগের বছরের হার, সেভাবে চিহ্নিত করে।',
  },
};

/** Islamic Foundation's announced fitra (Bangladesh). Update the day the
 * national fitra committee announces the new year's amounts (~late
 * Ramadan's first week), then the static pages rebuild. Source: Prothom Alo,
 * reporting the committee meeting of 25 Feb 2026. */
export const FITRA_BD = {
  hijriYear: 1447,
  announced: '2026-02-25',
  minTaka: 110,
  maxTaka: 2805,
  sourceUrl: 'https://www.prothomalo.com/bangladesh/oc3m03q53j',
  text: {
    en: (y: string, d: string, min: string, max: string) =>
      `Islamic Foundation, ${y} AH (announced ${d}): Tk ${min} to Tk ${max} per person.`,
    bn: (y: string, d: string, min: string, max: string) =>
      `ইসলামিক ফাউন্ডেশন, ${y} হিজরি (ঘোষণা ${d}): জনপ্রতি ${min} টাকা থেকে ${max} টাকা।`,
  },
  pending: {
    en: (y: string) => `The ${y} AH amounts are announced during Ramadan.`,
    bn: (y: string) => `${y} হিজরির হার রমজানে ঘোষণা হবে।`,
  },
  sourceLabel: {
    en: 'Source: Islamic Foundation (Prothom Alo) · islamicfoundation.gov.bd',
    bn: 'সূত্র: ইসলামিক ফাউন্ডেশন (প্রথম আলো) · islamicfoundation.gov.bd',
  },
} as const;
