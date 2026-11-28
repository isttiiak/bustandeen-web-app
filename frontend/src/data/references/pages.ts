// Where a reference shows up, in words a reader understands: every source
// file that cites a reference is mapped to the app screens it renders on.
// The reference scan (references.test.ts) fails when a file with a citation
// has no rule here, so a new screen cannot cite something silently.

export interface RefPage {
  label: string;
  labelBn: string;
  /** In-app path, when the screen has one. */
  path?: string;
}

export const REF_PAGES = {
  home: { label: 'Home', labelBn: 'হোম', path: '/' },
  landing: { label: 'Landing page', labelBn: 'ল্যান্ডিং পেজ', path: '/' },
  salat: { label: 'Salat tracker', labelBn: 'সালাত ট্র্যাকার', path: '/salat' },
  salatAnalytics: {
    label: 'Salat analytics',
    labelBn: 'সালাত বিশ্লেষণ',
    path: '/salat/analytics',
  },
  prayerTimes: { label: 'Prayer times', labelBn: 'নামাযের সময়', path: '/prayer-times' },
  musafir: { label: 'Musafir (travel)', labelBn: 'মুসাফির (সফর)', path: '/musafir' },
  fasting: { label: 'Fasting', labelBn: 'রোজা', path: '/fasting' },
  ramadan: { label: 'Ramadan', labelBn: 'রমজান', path: '/ramadan' },
  ramadanAnalytics: {
    label: 'Ramadan analytics',
    labelBn: 'রমজান বিশ্লেষণ',
    path: '/ramadan/analytics',
  },
  ramadanCalendar: {
    label: 'Ramadan calendars (public)',
    labelBn: 'রমজান ক্যালেন্ডার (পাবলিক)',
    path: '/ramadan-calendar',
  },
  prayerTimesPublic: {
    label: 'Prayer time pages (public)',
    labelBn: 'নামাযের সময়ের পেজ (পাবলিক)',
    path: '/prayer-times/bangladesh',
  },
  zikr: { label: 'Zikr counter', labelBn: 'যিকির কাউন্টার', path: '/zikr' },
  zikrAnalytics: { label: 'Zikr analytics', labelBn: 'যিকির বিশ্লেষণ', path: '/zikr/analytics' },
  quran: { label: 'Quran habit', labelBn: 'কুরআন অভ্যাস', path: '/quran' },
  quranKhatam: { label: 'Quran khatam', labelBn: 'কুরআন খতম', path: '/quran/khatam' },
  quranListen: { label: 'Quran listen', labelBn: 'কুরআন শোনা', path: '/quran/listen' },
  quranReader: { label: 'Quran reader', labelBn: 'কুরআন রিডার', path: '/quran/read' },
  rayhanah: { label: 'Rayhanah', labelBn: 'রায়হানাহ', path: '/cycle' },
  cycleAnalytics: {
    label: 'Rayhanah analytics',
    labelBn: 'রায়হানাহ বিশ্লেষণ',
    path: '/cycle/analytics',
  },
  friends: { label: 'Friends & Noor', labelBn: 'বন্ধু ও নূর', path: '/friends' },
  calendar: {
    label: 'Islamic calendar & special days',
    labelBn: 'ইসলামিক ক্যালেন্ডার ও বিশেষ দিন',
    path: '/library/calendar',
  },
  duas: { label: 'Duʿā library', labelBn: 'দুআ লাইব্রেরি', path: '/library/duas' },
  adhkar: {
    label: 'Morning & evening adhkar',
    labelBn: 'সকাল-সন্ধ্যার যিকির',
    path: '/library/adhkar',
  },
  asma: {
    label: 'Asmāʾ al-Ḥusnā',
    labelBn: 'আসমাউল হুসনা',
    path: '/library/asma-ul-husna',
  },
  sadaqah: { label: 'Sadaqah', labelBn: 'সদকা', path: '/sadaqah' },
  naseeh: {
    label: 'Naseeh (weekly muḥāsabah)',
    labelBn: 'নাসীহ (সাপ্তাহিক মুহাসাবা)',
    path: '/naseeh',
  },
  about: { label: 'About', labelBn: 'আমাদের সম্পর্কে', path: '/about' },
  bayan: {
    label: 'Bayān help site (Credits, How we calculate)',
    labelBn: 'বায়ান হেল্প সাইট (কৃতজ্ঞতা, হিসাব পদ্ধতি)',
  },
  admin: { label: 'Admin site', labelBn: 'অ্যাডমিন সাইট' },
  email: { label: 'Welcome email', labelBn: 'স্বাগত ইমেইল' },
  code: { label: 'Code notes only', labelBn: 'শুধু কোডের নোট' },
} satisfies Record<string, RefPage>;

export type RefPageKey = keyof typeof REF_PAGES;

/** Ordered: the first matching rule wins. */
const FILE_RULES: [RegExp, RefPageKey[]][] = [
  [/components\/DaifExplainer\.tsx$/, ['ramadan', 'calendar', 'salat']],
  [/components\/(EditZikrModal|ZikrSuggestForm)\.tsx$/, ['zikr']],
  [/components\/ExcusedCard\.tsx$/, ['salat', 'fasting']],
  [/components\/MusafirBanner\.tsx$/, ['salat', 'musafir']],
  [/components\/QuranAudioPlayer\.tsx$/, ['quranListen', 'quranReader']],
  [/components\/QuranSettings\.tsx$/, ['quranReader']],
  [/components\/quran\//, ['quranReader']],
  [/components\/library\/adhkar/, ['adhkar']],
  [/components\/RamadanSalatCard\.tsx$/, ['ramadan']],
  [/components\/cycle\/CycleAnalytics/, ['cycleAnalytics']],
  [/components\/cycle\//, ['rayhanah']],
  [/components\/fasting\//, ['fasting']],
  [/components\/friends\//, ['friends']],
  [/components\/home\//, ['home']],
  [/components\/landing\//, ['landing']],
  [/components\/prayerTimes\//, ['prayerTimes']],
  [/components\/ramadan\//, ['ramadan']],
  [/components\/salat\/SalatAnalytics/, ['salatAnalytics']],
  [/components\/salat\//, ['salat']],
  [/components\/zikr\//, ['zikr']],
  [/hooks\/useSalatLog\.ts$/, ['salat']],
  [/pages\/About\.tsx$/, ['about']],
  [/pages\/Admin/, ['admin']],
  [/pages\/FastingTracker\.tsx$/, ['fasting']],
  [/pages\/Friends\.tsx$/, ['friends']],
  [/pages\/QuranHabit\.tsx$/, ['quran']],
  [/pages\/QuranKhatam\.tsx$/, ['quranKhatam']],
  [/pages\/QuranListen\.tsx$/, ['quranListen']],
  [/pages\/RamadanAnalytics\.tsx$/, ['ramadanAnalytics']],
  [/pages\/SalatTracker\.tsx$/, ['salat']],
  [/seo\/content\/adhkar\.ts$/, ['adhkar']],
  [/seo\/content\/asmaUlHusna\.ts$/, ['asma']],
  [/seo\/content\/duas\.ts$/, ['duas']],
  [/seo\/content\/ramadanDuas\.ts$/, ['ramadanCalendar']],
  [/seo\/locales\/chrome\.ts$/, ['asma']],
  [/seo\/locales\/(ramadanSheet|ramadanBd|ramadanWorld)\.ts$/, ['ramadanCalendar']],
  [/seo\/locales\/monthly\.ts$/, ['prayerTimesPublic']],
  [/seo\/utils\/calc\.ts$/, ['prayerTimesPublic', 'ramadanCalendar']],
  [/seo\/bayan\//, ['bayan']],
  [/src\/sw\.ts$/, ['code']],
  [/utils\/countryDefaults\.ts$/, ['prayerTimes', 'salat']],
  [/utils\/(quranData|tafsir)\.ts$/, ['quranReader']],
  [/utils\/fastingRules\.ts$/, ['fasting', 'ramadan']],
  [/utils\/fridayHour\.ts$/, ['salat', 'home']],
  [/utils\/islamicCalendar\.ts$/, ['calendar', 'home']],
  [/utils\/localeReference\.ts$/, ['code']],
  [/utils\/muhasabahCorpus\.ts$/, ['naseeh']],
  [/utils\/musafir\.ts$/, ['musafir', 'salat']],
  [/utils\/postSalatQuran\.ts$/, ['salat']],
  [/utils\/prayerTimes\.ts$/, ['prayerTimes', 'home']],
  [/utils\/quranMeta\.ts$/, ['quran']],
  [/utils\/ramadan\.ts$/, ['ramadan']],
  [/utils\/sadaqahVirtueDays\.ts$/, ['sadaqah']],
  [/utils\/salatPrefs\.ts$/, ['salat']],
  [/utils\/specialDayRules\.ts$/, ['calendar', 'fasting']],
  [/utils\/sunnahGuide\.ts$/, ['salat']],
  [/utils\/todayTimeline\.ts$/, ['home']],
  [/utils\/zikrLibrary\.ts$/, ['zikr']],
  [/backend\/src\/(models\/CycleProfile|services\/cycle\.service)\.ts$/, ['rayhanah']],
  [/backend\/src\/services\/fasting\.service\.ts$/, ['fasting']],
  [/backend\/src\/services\/quran\.service\.ts$/, ['quranReader']],
  [/backend\/src\/services\/salat\.service\.ts$/, ['salat']],
  [/backend\/src\/services\/welcomeEmail\.templates\.ts$/, ['email']],
  [/backend\/src\/controllers\/connectPreview\.controller\.ts$/, ['friends']],
];

/** Top-level namespace of frontend/src/locales/en/common.json → screens. */
const LOCALE_RULES: Record<string, RefPageKey[]> = {
  fasting: ['fasting'],
  fastingRules: ['fasting'],
  friends: ['friends'],
  home: ['home'],
  landing: ['landing'],
  library: ['asma'],
  prayerTimes: ['prayerTimes'],
  ramadan: ['ramadan'],
  ramadanAnalytics: ['ramadanAnalytics'],
  salatTracker: ['salat'],
  specialDays: ['calendar'],
  zikr: ['zikr'],
  zikrAnalytics: ['zikrAnalytics'],
  zikrLibrary: ['zikr'],
};

export function pagesForFile(file: string): RefPageKey[] {
  for (const [rx, pages] of FILE_RULES) if (rx.test(file)) return pages;
  return [];
}

export function pagesForLocaleKey(key: string): RefPageKey[] {
  return LOCALE_RULES[key.split('.')[0] ?? ''] ?? [];
}
