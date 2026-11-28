// Where a reference shows up, in words a reader understands: every source
// file that cites a reference is mapped to the screen and the section it
// renders in (the reference scan adds the card or item title it finds next to
// the citation). The scan (references.test.ts) fails when a file with a
// visible citation has no rule here, so a new screen cannot cite something
// silently. Citations inside code comments are not places: they explain a
// rule in the code and are only counted.

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
  about: { label: 'About', labelBn: 'আমাদের সম্পর্কে', path: '/about' },
  bayan: {
    label: 'Bayān help site (Credits, How we calculate)',
    labelBn: 'বায়ান হেল্প সাইট (কৃতজ্ঞতা, হিসাব পদ্ধতি)',
  },
  admin: { label: 'Admin site', labelBn: 'অ্যাডমিন সাইট' },
  email: { label: 'Welcome email', labelBn: 'স্বাগত ইমেইল' },
} satisfies Record<string, RefPage>;

export type RefPageKey = keyof typeof REF_PAGES;

/** One place a reference appears: a screen, the section on it, and the item. */
export interface RefPlace {
  page: RefPageKey;
  /** Deep link when it is more exact than the page's own path. */
  path?: string;
  section: string;
  sectionBn: string;
  /** The card or item the citation sits in, as the app names it. */
  item?: string;
  /** The citation as written there ("Quran 2:148"): the link highlights it. */
  text?: string;
}

interface Rule {
  pages: RefPageKey[];
  section: string;
  sectionBn: string;
  /** The nearest title in the code is not a reader-facing item here. */
  noItem?: boolean;
}

const noItem = (rule: Rule): Rule => ({ ...rule, noItem: true });

const r = (pages: RefPageKey | RefPageKey[], section: string, sectionBn: string): Rule => ({
  pages: Array.isArray(pages) ? pages : [pages],
  section,
  sectionBn,
});

/** Ordered: the first matching rule wins. */
const FILE_RULES: [RegExp, Rule][] = [
  [
    /components\/DaifExplainer\.tsx$/,
    r(
      ['ramadan', 'calendar', 'quran'],
      'Weak-narration explainer (“Why is this marked ḍaʿīf?”)',
      'দুর্বল বর্ণনার ব্যাখ্যা (“কেন যঈফ?”)'
    ),
  ],
  [
    /components\/(EditZikrModal|ZikrSuggestForm)\.tsx$/,
    r(
      'zikr',
      'Add or suggest a zikr form: example reference',
      'যিকির যোগ বা প্রস্তাবের ফর্ম: উদাহরণ রেফারেন্স'
    ),
  ],
  [
    /components\/ExcusedCard\.tsx$/,
    r(['salat', 'fasting'], 'Excused days card (Rayhanah)', 'অব্যাহতির দিনের কার্ড (রায়হানাহ)'),
  ],
  [
    /components\/MusafirBanner\.tsx$/,
    r('salat', 'Musafir banner (fasting while travelling)', 'মুসাফির ব্যানার (সফরে রোজা)'),
  ],
  [
    /components\/QuranAudioPlayer\.tsx$/,
    noItem(r(['quranListen', 'quranReader'], 'Recitation audio', 'তিলাওয়াতের অডিও')),
  ],
  [
    /components\/QuranSettings\.tsx$/,
    r('quranReader', 'Quran settings: text source', 'কুরআন সেটিংস: পাঠের উৎস'),
  ],
  [/components\/quran\//, r('quranReader', 'Āyah panel: text source', 'আয়াত প্যানেল: পাঠের উৎস')],
  [
    /components\/library\/adhkar/,
    r('adhkar', 'Adhkar routine: Quran text source', 'যিকিরের রুটিন: কুরআনের পাঠের উৎস'),
  ],
  [/components\/RamadanSalatCard\.tsx$/, r('ramadan', 'Ramadan salat card', 'রমজানের সালাত কার্ড')],
  [/components\/cycle\/CycleAnalytics/, r('cycleAnalytics', 'Patterns', 'প্যাটার্ন')],
  [
    /components\/cycle\/RayhanahFiqhCompanion/,
    r(
      'rayhanah',
      'Fiqh companion (what is excused, what stays open)',
      'ফিকহ সহায়িকা (কী মাফ, কী খোলা)'
    ),
  ],
  [
    /components\/cycle\/(RayhanahAdhkar|RayhanahGarden|rayhanahShared)/,
    r('rayhanah', 'Adhkar garden (duʿā you can recite now)', 'যিকিরের বাগান (এখন পড়ার দুআ)'),
  ],
  [
    /components\/cycle\/RayhanahDialogs/,
    r('rayhanah', 'Period ended: ghusl and welcome back to salat', 'মাসিক শেষ: গোসল ও সালাতে ফেরা'),
  ],
  [
    /components\/cycle\/RayhanahFastingMakeup/,
    r('rayhanah', 'Ramadan fasts to make up', 'রমজানের কাযা রোজা'),
  ],
  [
    /components\/cycle\/RayhanahArch/,
    r(
      'rayhanah',
      'Day card: beyond the maximum (istiḥāḍah)',
      'দিনের কার্ড: সর্বোচ্চ সীমার পর (ইস্তিহাযা)'
    ),
  ],
  [/components\/cycle\/RayhanahTodayNote/, r('rayhanah', "Today's note", 'আজকের নোট')],
  [/components\/cycle\//, r('rayhanah', 'Rayhanah', 'রায়হানাহ')],
  [
    /components\/fasting\/FastingSettingsSheet/,
    r('fasting', 'Make-up fasts: qaḍāʾ, kaffārah, nadhr', 'কাযা, কাফফারা ও মানতের রোজা'),
  ],
  [/components\/fasting\//, r('fasting', 'Learn: missed fasts', 'জানুন: ছুটে যাওয়া রোজা')],
  [
    /components\/friends\/FriendsInviteSheet/,
    r('friends', 'Invite a friend: share text', 'বন্ধুকে আমন্ত্রণ: শেয়ারের লেখা'),
  ],
  [
    /components\/friends\//,
    r('friends', 'Noor circle: why Noor counts consistency', 'নূর সার্কেল: নূর কেন ধারাবাহিকতা গোনে'),
  ],
  [
    /components\/home\/HomeSpecialBlock/,
    r(
      'home',
      'Special day card (Friday hour, Sūrat al-Kahf)',
      'বিশেষ দিনের কার্ড (জুমার সময়, সূরা কাহফ)'
    ),
  ],
  [
    /components\/home\//,
    r('home', 'Prayer hero (Islamic midnight)', 'নামাযের সময় (ইসলামিক মধ্যরাত)'),
  ],
  [/components\/landing\//, r('landing', 'Features', 'ফিচার')],
  [
    /components\/prayerTimes\/PrayerSources/,
    r('prayerTimes', 'Sources (bottom of the page)', 'সূত্র (পাতার নিচে)'),
  ],
  [/components\/prayerTimes\//, r('prayerTimes', 'Day timeline cards', 'দিনের টাইমলাইন কার্ড')],
  [
    /components\/ramadan\/RamadanDayArch/,
    r('ramadan', 'Today: suḥūr and ifṭār', 'আজ: সাহরি ও ইফতার'),
  ],
  [
    /components\/ramadan\/RamadanLastTen|components\/ramadan\/ramadanShared/,
    r('ramadan', 'The last ten nights', 'শেষ দশ রাত'),
  ],
  [
    /components\/ramadan\/RamadanCountdown/,
    r('ramadan', 'Countdown to Ramadan', 'রমজানের কাউন্টডাউন'),
  ],
  [
    /components\/ramadan\/RamadanMonthGrid/,
    r(
      'ramadan',
      'Month grid: the three ʿashras and Rayhanah days',
      'মাসের ছক: তিন আশরা ও রায়হানাহর দিন'
    ),
  ],
  [
    /components\/ramadan\/RamadanWorshipStrip/,
    r('ramadan', 'Worship strip: the month’s virtue', 'ইবাদতের সারি: মাসের ফযীলত'),
  ],
  [/components\/salat\/SalatAnalytics/, r('salatAnalytics', 'Summary', 'সারাংশ')],
  [
    /components\/salat\/SalatCardGuidance/,
    r(
      'salat',
      'Prayer card guidance (sunnah after a shortened prayer, Witr)',
      'নামাযের কার্ডের নির্দেশনা (কসরের পর সুন্নত, বিতর)'
    ),
  ],
  [
    /components\/salat\/SalatCardJoining/,
    r('salat', 'Prayer card: join two prayers (jamʿ)', 'নামাযের কার্ড: দুই নামায একসাথে (জমা)'),
  ],
  [/components\/salat\/SalatFridayTravel/, r('salat', 'Friday while travelling', 'সফরে শুক্রবার')],
  [
    /components\/salat\/SalatLegend/,
    r('salat', 'How it works (legend)', 'যেভাবে কাজ করে (ব্যাখ্যা)'),
  ],
  [/components\/salat\//, r('salat', 'Prayer card: mosque toast', 'নামাযের কার্ড: মসজিদের বার্তা')],
  [
    /components\/zikr\/zikrCounterData/,
    r('zikr', 'Counter: “Full text & reference” card', 'কাউন্টার: “পূর্ণ পাঠ ও রেফারেন্স” কার্ড'),
  ],
  [/components\/zikr\//, r('zikr', 'Counter: counting on the fingertips', 'কাউন্টার: আঙুলে গোনা')],
  [/hooks\/useSalatLog\.ts$/, r('salat', 'Nafl prayers list', 'নফল নামাযের তালিকা')],
  [/pages\/About\.tsx$/, r('about', 'Top of the page', 'পাতার উপরে')],
  [
    /pages\/Admin/,
    r('admin', 'Zikr requests: example reference', 'যিকিরের অনুরোধ: উদাহরণ রেফারেন্স'),
  ],
  [/pages\/FastingTracker\.tsx$/, r('fasting', 'Travelling while fasting', 'সফরে রোজা')],
  [/pages\/Friends\.tsx$/, r('friends', 'Page heading', 'পাতার শিরোনাম')],
  [/pages\/QuranHabit\.tsx$/, r('quran', 'Virtue footer', 'ফযীলতের নোট')],
  [/pages\/QuranKhatam\.tsx$/, r('quranKhatam', 'Khatam page note', 'খতম পাতার নোট')],
  [/pages\/QuranListen\.tsx$/, r('quranListen', 'Listening note', 'শোনার নোট')],
  [
    /pages\/RamadanAnalytics\.tsx$/,
    r('ramadanAnalytics', 'Last ten nights and Rayhanah days', 'শেষ দশ রাত ও রায়হানাহর দিন'),
  ],
  [/pages\/SalatTracker\.tsx$/, r('salat', 'Friday: hour of response', 'জুমার দিন: দুআ কবুলের সময়')],
  [/seo\/content\/adhkar\.ts$/, r('adhkar', 'Adhkar list', 'যিকিরের তালিকা')],
  [/seo\/content\/asmaUlHusna\.ts$/, r('asma', 'Source note', 'সূত্রের নোট')],
  [/seo\/content\/duas\.ts$/, r('duas', 'Duʿā by situation', 'পরিস্থিতি অনুযায়ী দুআ')],
  [/seo\/content\/ramadanDuas\.ts$/, r('ramadanCalendar', 'Ramadan duʿās', 'রমজানের দুআ')],
  [/seo\/locales\/chrome\.ts$/, noItem(r(['asma', 'ramadanCalendar'], 'Page notes', 'পাতার নোট'))],
  [
    /seo\/locales\/(ramadanSheet|ramadanBd|ramadanWorld)\.ts$/,
    noItem(r('ramadanCalendar', 'Printable Ramadan sheet notes', 'প্রিন্টযোগ্য রমজান শিটের নোট')),
  ],
  [/seo\/locales\/monthly\.ts$/, r('prayerTimesPublic', 'Source line', 'সূত্রের লাইন')],
  [/seo\/utils\/calc\.ts$/, r(['prayerTimesPublic', 'ramadanCalendar'], 'Calculation', 'হিসাব')],
  [/seo\/bayan\/releases/, r('bayan', "What's new (release notes)", 'নতুন কী (রিলিজ নোট)')],
  [/seo\/bayan\//, noItem(r('bayan', 'Credits and How we calculate', 'কৃতজ্ঞতা ও হিসাব পদ্ধতি'))],
  [/src\/sw\.ts$/, r('quranReader', 'Offline cache of translations', 'অনুবাদের অফলাইন ক্যাশ')],
  [
    /utils\/countryDefaults\.ts$/,
    r('prayerTimes', 'Calculation method by country', 'দেশ অনুযায়ী হিসাব পদ্ধতি'),
  ],
  [/utils\/(quranData|tafsir)\.ts$/, r('quranReader', 'Translations and tafsīr', 'অনুবাদ ও তাফসীর')],
  [/utils\/fastingRules\.ts$/, r('fasting', 'Fasting guide', 'রোজার নির্দেশিকা')],
  [/utils\/fridayHour\.ts$/, r('home', 'Friday hour reminder', 'জুমার সময়ের রিমাইন্ডার')],
  [/utils\/islamicCalendar\.ts$/, r('calendar', 'Special day page', 'বিশেষ দিনের পাতা')],
  [/utils\/musafir\.ts$/, r('musafir', 'Musafir guide', 'মুসাফির নির্দেশিকা')],
  [
    /utils\/postSalatQuran\.ts$/,
    r('salat', 'After each prayer: “Read now”', 'প্রতি নামাযের পর: “এখন পড়ুন”'),
  ],
  [/utils\/prayerTimes\.ts$/, r('prayerTimes', 'Islamic midnight', 'ইসলামিক মধ্যরাত')],
  [
    /utils\/quranMeta\.ts$/,
    r('quran', 'Suggested sūrahs, āyahs and Quranic duʿās', 'প্রস্তাবিত সূরা, আয়াত ও কুরআনের দুআ'),
  ],
  [/utils\/ramadan\.ts$/, r('ramadan', 'Ramadan dates', 'রমজানের তারিখ')],
  [/utils\/sadaqahVirtueDays\.ts$/, r('sadaqah', 'Blessed days to give', 'দানের বরকতময় দিন')],
  [
    /utils\/salatPrefs\.ts$/,
    r('salat', 'Salat settings: tasbīḥ after prayer', 'সালাত সেটিংস: নামাযের পর তাসবীহ'),
  ],
  [/utils\/sunnahGuide\.ts$/, r('salat', 'Sunnah prayers guide', 'সুন্নত নামাযের নির্দেশিকা')],
  [
    /utils\/todayTimeline\.ts$/,
    r('home', 'Today timeline: adhkar times', 'আজকের টাইমলাইন: যিকিরের সময়'),
  ],
  [/utils\/zikrLibrary\.ts$/, r('zikr', 'Zikr library', 'যিকির লাইব্রেরি')],
  [
    /backend\/src\/(models\/CycleProfile|services\/cycle\.service)\.ts$/,
    r('rayhanah', 'Server rule: cycle limits', 'সার্ভারের নিয়ম: চক্রের সীমা'),
  ],
  [
    /backend\/src\/services\/fasting\.service\.ts$/,
    r('fasting', 'Server rule: kaffārah', 'সার্ভারের নিয়ম: কাফফারা'),
  ],
  [
    /backend\/src\/services\/quran\.service\.ts$/,
    r('quranReader', 'Tafsīr panel', 'তাফসীর প্যানেল'),
  ],
  [/backend\/src\/services\/salat\.service\.ts$/, r('salat', 'Server rule', 'সার্ভারের নিয়ম')],
  [
    /backend\/src\/services\/welcomeEmail\.templates\.ts$/,
    r('email', 'Closing hadith', 'শেষের হাদিস'),
  ],
  [
    /backend\/src\/controllers\/connectPreview\.controller\.ts$/,
    r('friends', 'Friend link preview', 'বন্ধু লিংকের প্রিভিউ'),
  ],
];

/** Locale keys (frontend/src/locales/en/common.json) → section. First match wins. */
const LOCALE_RULES: [RegExp, Rule][] = [
  [/^specialDays\.[^.]+\.references/, r('calendar', 'References', 'রেফারেন্স')],
  [/^specialDays\.[^.]+\.todos/, r('calendar', 'What to do', 'যা করবেন')],
  [/^specialDays\./, r('calendar', 'About the day', 'দিনটি সম্পর্কে')],
  [/^prayerTimes\./, r('prayerTimes', 'Day timeline cards', 'দিনের টাইমলাইন কার্ড')],
  [/^salatTracker\.legend/, r('salat', 'How it works (legend)', 'যেভাবে কাজ করে (ব্যাখ্যা)')],
  [/^salatTracker\.travelFriday/, r('salat', 'Friday while travelling', 'সফরে শুক্রবার')],
  [/^salatTracker\./, r('salat', 'Prayer card: mosque toast', 'নামাযের কার্ড: মসজিদের বার্তা')],
  [/^ramadanAnalytics\./, r('ramadanAnalytics', 'The three ʿashras', 'তিন আশরা')],
  [/^ramadan\.laylatalQadr/, r('ramadan', 'The last ten nights', 'শেষ দশ রাত')],
  [
    /^ramadan\./,
    r(
      'ramadan',
      'Month grid: the three ʿashras and Rayhanah days',
      'মাসের ছক: তিন আশরা ও রায়হানাহর দিন'
    ),
  ],
  [
    /^(fasting|fastingRules)\./,
    r('fasting', 'Make-up fasts: qaḍāʾ, kaffārah, nadhr', 'কাযা, কাফফারা ও মানতের রোজা'),
  ],
  [/^friends\.quranRef/, r('friends', 'Page heading', 'পাতার শিরোনাম')],
  [
    /^friends\./,
    r('friends', 'Noor circle: why Noor counts consistency', 'নূর সার্কেল: নূর কেন ধারাবাহিকতা গোনে'),
  ],
  [/^home\./, r('home', 'Friends card', 'বন্ধুদের কার্ড')],
  [/^landing\./, r('landing', 'Features', 'ফিচার')],
  [/^library\./, r('asma', 'Source note', 'সূত্রের নোট')],
  [
    /^zikr\.(meanings|translit)/,
    r('zikr', 'Counter: Āyat al-Kursī card', 'কাউন্টার: আয়াতুল কুরসি কার্ড'),
  ],
  [/^zikr\./, r('zikr', 'Counter: counting on the fingertips', 'কাউন্টার: আঙুলে গোনা')],
  [
    /^(zikrAnalytics|zikrLibrary)\./,
    r('zikr', 'Add a custom zikr: example reference', 'নিজের যিকির যোগ: উদাহরণ রেফারেন্স'),
  ],
];

export function ruleForFile(file: string): Rule | null {
  for (const [rx, rule] of FILE_RULES) if (rx.test(file)) return rule;
  return null;
}

export function ruleForLocaleKey(key: string): Rule | null {
  for (const [rx, rule] of LOCALE_RULES) if (rx.test(key)) return rule;
  return null;
}

/** Percent-encode text for a URL text fragment (`#:~:text=`): `-`, `,` and `&`
 * have their own meaning inside the directive, so they are encoded too. */
export function encodeTextFragment(text: string): string {
  return encodeURIComponent(text.replace(/\s+/g, ' ').trim()).replace(/-/g, '%2D');
}

/**
 * The link for one place: the screen (or the deeper special-day page), with a
 * text fragment so the browser scrolls to the citation and highlights it, as
 * `https://bustandeen.com/friends#:~:text=Quran%202%3A148` does. Text
 * fragments work on a full page load, so render it as a plain <a>, not a
 * router Link. `shownBn` is the Bangla form when the page is in Bangla; the
 * English form is kept as a second directive, and the browser highlights the
 * ones it finds.
 */
export function placeHref(place: RefPlace, shownBn?: string): string | undefined {
  const base = place.path ?? (REF_PAGES[place.page] as RefPage).path;
  if (!base) return undefined;
  if (!place.text) return base;
  const texts = [shownBn, place.text].filter(
    (t, i, all): t is string => !!t && all.indexOf(t) === i
  );
  return `${base}#:~:${texts.map((t) => `text=${encodeTextFragment(t)}`).join('&')}`;
}
