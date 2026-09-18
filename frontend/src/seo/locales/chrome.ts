// UI chrome strings for the standalone SEO page tree (frontend/src/seo/).
// Deliberately separate from the app-wide src/i18n.ts (see CLAUDE.md-style
// note in Phase E of the SEO plan) — these three languages back only the
// /prayer-times, /qibla, /ramadan-calendar, /duas, /adhkar and
// /hijri-date-converter static pages, not the authenticated app.
export type SeoLang = 'en' | 'bn' | 'ar';
export const SEO_LANGS: SeoLang[] = ['en', 'bn', 'ar'];
export const RTL_LANGS: SeoLang[] = ['ar'];

export interface ChromeStrings {
  siteName: string;
  tagline: string;
  home: string;
  backToLiveApp: string;
  languageLabel: string;
  breadcrumbPrayerTimes: string;
  breadcrumbQibla: string;
  breadcrumbRamadan: string;
  breadcrumbDuas: string;
  breadcrumbAdhkar: string;
  breadcrumbHijri: string;
  breadcrumbAsmaUlHusna: string;
  breadcrumbZakat: string;

  prayerTimes: {
    heading: (city: string) => string;
    subheading: (city: string, country: string) => string;
    todayLabel: string;
    methodNote: string;
    hanafiAsrNote: string;
    liveAppCta: string;
    qiblaCta: (city: string) => string;
    ramadanCta: (city: string) => string;
    faqTitle: string;
    faq: { q: string; a: string }[];
    nearbyTitle: string;
  };

  qibla: {
    heading: (city: string) => string;
    subheading: (city: string, country: string) => string;
    bearingLabel: string;
    distanceLabel: string;
    howToFindTitle: string;
    howToFindBody: string;
    liveAppCta: string;
    prayerTimesCta: (city: string) => string;
    faqTitle: string;
    faq: { q: string; a: string }[];
  };

  ramadan: {
    indexHeading: (year: number) => string;
    indexSubheading: string;
    searchPlaceholder: string;
    popularCitiesLabel: string;
    noResults: string;
    heading: (city: string, year: number) => string;
    subheading: (city: string, country: string) => string;
    imsakLabel: string;
    iftarLabel: string;
    dayLabel: string;
    dateLabel: string;
    liveAppCta: string;
    prayerTimesCta: (city: string) => string;
    qiblaCta: (city: string) => string;
    note: string;
  };

  duas: {
    heading: string;
    subheading: string;
    allSituations: string;
    arabicLabel: string;
    transliterationLabel: string;
    translationLabel: string;
    sourceLabel: string;
    pageHeading: (situation: string) => string;
  };

  adhkar: {
    morningTitle: string;
    eveningTitle: string;
    morningSubtitle: string;
    eveningSubtitle: string;
    switchToMorning: string;
    switchToEvening: string;
    repeatLabel: (n: number) => string;
    sourceLabel: string;
  };

  hijri: {
    title: string;
    subtitle: string;
    gregorianLabel: string;
    hijriLabel: string;
    todayLabel: string;
    convertHint: string;
    adjustmentLabel: string;
    adjustmentNone: string;
    adjustmentNote: string;
  };

  asmaUlHusna: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    noResults: string;
    sourceNote: string;
    liveAppCta: string;
  };

  zakat: {
    title: string;
    subtitle: string;
    nisabTitle: string;
    nisabGoldLabel: string;
    nisabSilverLabel: string;
    nisabStandardHint: string;
    madhabTitle: string;
    madhabNote: string;
    jewelryLabel: string;
    jewelryNote: string;
    assetsTitle: string;
    cashLabel: string;
    goldValueLabel: string;
    silverValueLabel: string;
    businessLabel: string;
    receivablesLabel: string;
    liabilitiesLabel: string;
    totalLabel: string;
    netZakatableLabel: string;
    belowNisabMsg: string;
    aboveNisabMsg: (amount: string) => string;
    zakatDueLabel: string;
    rateNote: string;
    hawlTitle: string;
    hawlStartLabel: string;
    hawlNote: string;
    hawlNotSetMsg: string;
    hawlDaysLeftMsg: (n: number) => string;
    hawlPastDueMsg: (date: string) => string;
    hawlDueDateLabel: string;
    pricesAsOfLabel: (date: string) => string;
    disclaimerTitle: string;
    disclaimer: string;
    liveAppCta: string;
    faqTitle: string;
    faq: { q: string; a: string }[];
  };
}

const en: ChromeStrings = {
  siteName: 'Bustandeen',
  tagline: 'Nourish Your Deen',
  home: 'Home',
  backToLiveApp: 'Open the live, on-device calculator in the app',
  languageLabel: 'Language',
  breadcrumbPrayerTimes: 'Prayer Times',
  breadcrumbQibla: 'Qibla Direction',
  breadcrumbRamadan: 'Ramadan Calendar',
  breadcrumbDuas: "Du'a Library",
  breadcrumbAdhkar: 'Adhkar',
  breadcrumbHijri: 'Hijri Date Converter',
  breadcrumbAsmaUlHusna: '99 Names of Allah',
  breadcrumbZakat: 'Zakat Calculator',
  prayerTimes: {
    heading: (city) => `Prayer Times in ${city} Today`,
    subheading: (city, country) =>
      `Fajr, Dhuhr, Asr, Maghrib and Isha prayer times for ${city}, ${country}.`,
    todayLabel: "Today's prayer times",
    methodNote:
      'Calculated on-device using standard astronomical formulas (the same method the Bustandeen app uses for every prayer-time calculation).',
    hanafiAsrNote:
      "Asr time shown uses the standard (Shafi'i/Maliki/Hanbali) convention; the app lets you switch to the Hanafi convention.",
    liveAppCta: 'Open the live prayer-time tracker for exact, auto-updating times',
    qiblaCta: (city) => `Qibla direction from ${city}`,
    ramadanCta: (city) => `Ramadan calendar for ${city}`,
    faqTitle: 'Common questions',
    faq: [
      {
        q: 'How are these prayer times calculated?',
        a: "Prayer times are computed from the city's exact coordinates using standard astronomical formulas for sun position — the same on-device calculation the Bustandeen app uses, with no third-party prayer-time API involved.",
      },
      {
        q: 'Do these times account for daylight saving or local timezone changes?',
        a: "Yes — times are shown in the city's own local time. For guaranteed live accuracy on any date, open the app's prayer-time tracker, which recalculates on your device.",
      },
      {
        q: 'What calculation method and Asr convention are used?',
        a: 'A standard calculation method with the majority-view Asr convention is shown by default; the in-app tracker lets you choose from multiple calculation methods and switch to the Hanafi Asr convention.',
      },
    ],
    nearbyTitle: 'Nearby',
  },
  qibla: {
    heading: (city) => `Qibla Direction from ${city}`,
    subheading: (city, country) =>
      `The compass bearing to face the Kaaba in Makkah from ${city}, ${country}.`,
    bearingLabel: 'Qibla bearing (from true North)',
    distanceLabel: 'Distance to Makkah',
    howToFindTitle: 'How to find the Qibla without a compass',
    howToFindBody:
      "Stand facing the bearing shown above, measured clockwise from true North (not magnetic North — most phone compasses need calibration to show true North accurately). The Bustandeen app's live Qibla compass uses your device's orientation sensor and current location to point automatically, with no manual calculation needed.",
    liveAppCta: 'Open the live Qibla compass in the app',
    prayerTimesCta: (city) => `Prayer times for ${city}`,
    faqTitle: 'Common questions',
    faq: [
      {
        q: 'How is the Qibla direction calculated?',
        a: "The bearing is the great-circle direction from the city's coordinates to the Kaaba in Makkah (21.4225°N, 39.8262°E), calculated using standard spherical trigonometry.",
      },
      {
        q: 'Why does the Qibla direction not point toward Makkah on a flat map?',
        a: 'Because the Earth is a sphere, the shortest path (great-circle route) often looks like a curve on a flat map projection — the bearing shown here is the correct compass direction to face, not a straight line on a 2D map.',
      },
      {
        q: 'What is a Qibla compass and how is it different from this bearing?',
        a: 'A Qibla compass (also called a Kaaba compass or Mecca compass) is a physical or app-based compass marked with the Qibla direction for your location. The bearing shown on this page is that same direction, in degrees from true North - enter it into any standard compass, or open the Bustandeen app for a live Qibla compass that points automatically using your device.',
      },
    ],
  },
  ramadan: {
    indexHeading: (year) => `Ramadan ${year} Calendar`,
    indexSubheading:
      'Suhoor (Imsak) and Iftar times for Ramadan, for any city worldwide. Search for your city or pick one below.',
    searchPlaceholder: 'Search for a city or country...',
    popularCitiesLabel: 'Popular cities',
    noResults: 'No cities match your search.',
    heading: (city, year) => `Ramadan ${year} Calendar for ${city}`,
    subheading: (city, country) =>
      `Suhoor (Imsak) and Iftar times for every day of Ramadan in ${city}, ${country}.`,
    imsakLabel: 'Imsak / Suhoor ends (Fajr)',
    iftarLabel: 'Iftar (Maghrib)',
    dayLabel: 'Day',
    dateLabel: 'Date',
    liveAppCta: 'Track your fasts day-by-day in the app',
    prayerTimesCta: (city) => `Year-round prayer times for ${city}`,
    qiblaCta: (city) => `Qibla direction from ${city}`,
    note: 'The Ramadan start date follows the Umm al-Qura (islamic-umalqura) calendar estimate and may shift by a day depending on local moon-sighting announcements — always confirm with your local moon-sighting authority.',
  },
  duas: {
    heading: "Du'a Library",
    subheading: "Authentic du'as for everyday situations, with source and grading for every entry.",
    allSituations: 'All situations',
    arabicLabel: 'Arabic',
    transliterationLabel: 'Transliteration',
    translationLabel: 'Translation',
    sourceLabel: 'Source',
    pageHeading: (situation) => `Dua for ${situation}`,
  },
  adhkar: {
    morningTitle: 'Morning Adhkar',
    eveningTitle: 'Evening Adhkar',
    morningSubtitle: "Adhkār aṣ-Ṣabāḥ — the Prophet's ﷺ remembrances for the start of the day.",
    eveningSubtitle: "Adhkār al-Masā' — the Prophet's ﷺ remembrances for the end of the day.",
    switchToMorning: 'Morning',
    switchToEvening: 'Evening',
    repeatLabel: (n) => (n > 1 ? `Recite ${n} times` : 'Recite once'),
    sourceLabel: 'Source',
  },
  hijri: {
    title: 'Hijri Date Converter',
    subtitle: 'Convert between the Gregorian and Islamic (Hijri) calendars.',
    gregorianLabel: 'Gregorian date',
    hijriLabel: 'Hijri date',
    todayLabel: "Today's date",
    convertHint: 'Open Bustandeen for prayer times, fasting tracking and more',
    adjustmentLabel: 'Moon-sighting adjustment',
    adjustmentNone: 'Standard',
    adjustmentNote:
      "The Hijri month's start can genuinely differ by a day between regions depending on local moon-sighting announcements — adjust here if your local authority differs from the standard calculation.",
  },
  asmaUlHusna: {
    title: '99 Names of Allah',
    subtitle:
      'Al-Asma al-Husna: the Most Beautiful Names, with Arabic, transliteration and meaning.',
    searchPlaceholder: 'Search a name or meaning...',
    noResults: 'No names match your search.',
    sourceNote:
      "The Prophet ﷺ said Allah has 99 names and whoever preserves them will enter Paradise (Sahih al-Bukhari 7392, Sahih Muslim 2677 - authentic). This specific 99-name list, commonly cited from Jami' at-Tirmidhi 3507, is the list in widest circulation today; many hadith scholars, including Ibn Taymiyyah, note the enumerated list itself is a later addition rather than the Prophet's ﷺ own wording, though the names themselves are all drawn from the Quran and authentic Sunnah. Different reputable compilations order or spell a handful of names slightly differently.",
    liveAppCta: 'Open Bustandeen for zikr, salat and Quran tracking',
  },
  zakat: {
    title: 'Zakat Calculator',
    subtitle:
      'Work out your zakat: nisab by gold or silver standard, your assets and debts, and when your hawl is due.',
    nisabTitle: 'Nisab threshold',
    nisabGoldLabel: 'Gold standard (87.48g)',
    nisabSilverLabel: 'Silver standard (612.36g)',
    nisabStandardHint: 'Pick which nisab standard to use - see the madhab note below.',
    madhabTitle: 'Which standard should I use?',
    madhabNote:
      "Scholars differ. The silver standard gives a lower threshold, so more people qualify to pay - this is the view many Hanafi scholars favour, since it benefits more of the poor. The gold standard gives a higher threshold and is what many other contemporary scholars and zakat bodies recommend for cash savings, so as not to obligate people with modest means. This calculator lets you choose; if you're unsure, ask a local scholar you trust.",
    jewelryLabel: 'Include personal-use gold/silver jewelry?',
    jewelryNote:
      "Hanafi view: zakat is due on gold/silver jewelry regardless of use. Majority view (Shafi'i, Maliki, Hanbali): jewelry worn/used within customary limits is exempt. Toggle this only if you're following the view that includes it.",
    assetsTitle: 'Your assets and debts',
    cashLabel: 'Cash and bank balances',
    goldValueLabel: 'Gold value (market price)',
    silverValueLabel: 'Silver value (market price)',
    businessLabel: 'Business/trade assets (inventory at current value)',
    receivablesLabel: 'Money owed to you (expected to be repaid)',
    liabilitiesLabel: 'Debts you owe (due now)',
    totalLabel: 'Total assets',
    netZakatableLabel: 'Net zakatable wealth',
    belowNisabMsg:
      'Your net wealth is below the nisab threshold - no zakat is due this year, but keep tracking in case it grows.',
    aboveNisabMsg: (amount) =>
      `Your net wealth is above the nisab threshold. Estimated zakat due (2.5%): ${amount}`,
    zakatDueLabel: 'Zakat due (2.5%)',
    rateNote:
      'Zakat on cash, gold, silver, business and receivable wealth is 2.5% (1/40th) of the net zakatable amount, once a full lunar year (ḥawl) has passed above nisab.',
    hawlTitle: 'Ḥawl tracker',
    hawlStartLabel: 'Date your wealth first reached nisab',
    hawlNote:
      'Zakat becomes due after one full Hijri (lunar) year of your wealth staying at or above nisab - not the Gregorian calendar year.',
    hawlNotSetMsg: 'Enter a start date to see your hawl anniversary.',
    hawlDaysLeftMsg: (n) =>
      n === 1 ? '1 day until your hawl completes.' : `${n} days until your hawl completes.`,
    hawlPastDueMsg: (date) =>
      `Your hawl completed on ${date}. If your wealth has stayed above nisab since, zakat is due now.`,
    hawlDueDateLabel: 'Hawl completes on',
    pricesAsOfLabel: (date) =>
      `Gold/silver prices last checked ${date} - not live, for estimation only.`,
    disclaimerTitle: 'Important',
    disclaimer:
      'This calculator gives an estimate to help you plan, not a fatwa. Nisab weights, jewelry rulings and asset treatment genuinely differ between madhabs, and getting zakat wrong is a real responsibility - please verify your specific situation with a qualified local scholar or a trusted zakat organization before paying, especially for business assets, debts, or unusual holdings.',
    liveAppCta: 'Open Bustandeen for zikr, salat and Quran tracking',
    faqTitle: 'Common questions',
    faq: [
      {
        q: 'Is this calculator a fatwa or religious ruling?',
        a: 'No. It is a calculation aid using commonly cited nisab figures and the standard 2.5% rate. For your specific situation - especially business assets, debts, or mixed-madhab households - confirm with a qualified scholar.',
      },
      {
        q: 'Why do gold-standard and silver-standard nisab give different answers?',
        a: "The two metals' market values have drifted apart over time, so the silver nisab (612.36g) is usually a much lower cash threshold than the gold nisab (87.48g) today. Scholars differ on which to apply to cash and mixed wealth - see the note above.",
      },
      {
        q: 'What if my wealth drops below nisab before a full year passes?',
        a: 'Most scholars hold that the hawl resets - you would need to reach nisab again and complete a fresh lunar year before zakat becomes due on that wealth.',
      },
    ],
  },
};

const bn: ChromeStrings = {
  siteName: 'Bustandeen',
  tagline: 'আপনার দ্বীনকে সমৃদ্ধ করুন',
  home: 'হোম',
  backToLiveApp: 'অ্যাপে লাইভ, অন-ডিভাইস ক্যালকুলেটর খুলুন',
  languageLabel: 'ভাষা',
  breadcrumbPrayerTimes: 'নামাজের সময়',
  breadcrumbQibla: 'কিবলার দিক',
  breadcrumbRamadan: 'রমজান ক্যালেন্ডার',
  breadcrumbDuas: 'দোয়া সংকলন',
  breadcrumbAdhkar: 'আযকার',
  breadcrumbHijri: 'হিজরি তারিখ কনভার্টার',
  breadcrumbAsmaUlHusna: 'আল্লাহর ৯৯ নাম',
  breadcrumbZakat: 'যাকাত ক্যালকুলেটর',
  prayerTimes: {
    heading: (city) => `${city}-এ আজকের নামাজের সময়`,
    subheading: (city, country) =>
      `${city}, ${country}-এর ফজর, যোহর, আসর, মাগরিব ও এশার নামাজের সময়।`,
    todayLabel: 'আজকের নামাজের সময়',
    methodNote:
      'মান জ্যোতির্বৈজ্ঞানিক সূত্র ব্যবহার করে ডিভাইসেই হিসাব করা হয়েছে (Bustandeen অ্যাপের প্রতিটি নামাজের সময় হিসাবেও একই পদ্ধতি ব্যবহৃত হয়)।',
    hanafiAsrNote:
      'এখানে দেখানো আসরের সময় সাধারণ (শাফেয়ী/মালেকী/হাম্বলী) মত অনুযায়ী; অ্যাপে হানাফি মত অনুযায়ীও পরিবর্তন করা যায়।',
    liveAppCta: 'সঠিক, স্বয়ংক্রিয়ভাবে হালনাগাদ হওয়া সময়ের জন্য লাইভ নামাজ ট্র্যাকার খুলুন',
    qiblaCta: (city) => `${city} থেকে কিবলার দিক`,
    ramadanCta: (city) => `${city}-এর রমজান ক্যালেন্ডার`,
    faqTitle: 'সাধারণ প্রশ্ন',
    faq: [
      {
        q: 'এই নামাজের সময়গুলো কীভাবে হিসাব করা হয়?',
        a: 'শহরের সঠিক স্থানাঙ্ক ব্যবহার করে সূর্যের অবস্থান নির্ণয়ের মান জ্যোতির্বৈজ্ঞানিক সূত্র অনুযায়ী নামাজের সময় হিসাব করা হয় — এটি Bustandeen অ্যাপের একই অন-ডিভাইস হিসাব পদ্ধতি, কোনো তৃতীয়-পক্ষের API ছাড়াই।',
      },
      {
        q: 'এতে কি ডে-লাইট সেভিং বা স্থানীয় টাইমজোন পরিবর্তন হিসাবে ধরা হয়েছে?',
        a: 'হ্যাঁ — সময়গুলো শহরের নিজস্ব স্থানীয় সময় অনুযায়ী দেখানো হয়েছে। যেকোনো তারিখে নিশ্চিতভাবে সঠিক সময়ের জন্য, অ্যাপের নামাজ ট্র্যাকার খুলুন, যা আপনার ডিভাইসে পুনরায় হিসাব করে।',
      },
      {
        q: 'কোন হিসাব পদ্ধতি ও আসরের মত ব্যবহার করা হয়েছে?',
        a: 'ডিফল্টভাবে একটি প্রচলিত হিসাব পদ্ধতি ও সংখ্যাগরিষ্ঠ মত অনুযায়ী আসরের সময় দেখানো হয়েছে; অ্যাপের ভেতরের ট্র্যাকারে একাধিক হিসাব পদ্ধতি থেকে বেছে নেওয়া যায় এবং হানাফি মতে পরিবর্তন করা যায়।',
      },
    ],
    nearbyTitle: 'কাছাকাছি শহর',
  },
  qibla: {
    heading: (city) => `${city} থেকে কিবলার দিক`,
    subheading: (city, country) => `${city}, ${country} থেকে মক্কার কাবার দিকে ফেরার কম্পাস দিক।`,
    bearingLabel: 'কিবলার দিক (সত্যিকারের উত্তর থেকে)',
    distanceLabel: 'মক্কা পর্যন্ত দূরত্ব',
    howToFindTitle: 'কম্পাস ছাড়া কিবলা খুঁজে বের করার উপায়',
    howToFindBody:
      'উপরে দেখানো দিক অনুযায়ী দাঁড়ান, যা সত্যিকারের উত্তর থেকে ঘড়ির কাঁটার দিকে পরিমাপ করা (চৌম্বক উত্তর নয় — বেশিরভাগ ফোনের কম্পাসে সত্যিকারের উত্তর দেখাতে ক্যালিব্রেশন প্রয়োজন)। Bustandeen অ্যাপের লাইভ কিবলা কম্পাস আপনার ডিভাইসের অভিমুখ সেন্সর ও বর্তমান অবস্থান ব্যবহার করে স্বয়ংক্রিয়ভাবে দিক দেখায়, কোনো ম্যানুয়াল হিসাবের প্রয়োজন নেই।',
    liveAppCta: 'অ্যাপে লাইভ কিবলা কম্পাস খুলুন',
    prayerTimesCta: (city) => `${city}-এর নামাজের সময়`,
    faqTitle: 'সাধারণ প্রশ্ন',
    faq: [
      {
        q: 'কিবলার দিক কীভাবে হিসাব করা হয়?',
        a: 'শহরের স্থানাঙ্ক থেকে মক্কার কাবা (২১.৪২২৫°উত্তর, ৩৯.৮২৬২°পূর্ব) পর্যন্ত গ্রেট-সার্কেল দিক মান গোলীয় ত্রিকোণমিতি ব্যবহার করে হিসাব করা হয়।',
      },
      {
        q: 'ফ্ল্যাট মানচিত্রে কিবলার দিক মক্কার দিকে কেন সোজা দেখায় না?',
        a: 'পৃথিবী গোলাকার হওয়ায়, সবচেয়ে সংক্ষিপ্ত পথ (গ্রেট-সার্কেল রুট) সমতল মানচিত্রে বাঁকা দেখাতে পারে — এখানে দেখানো দিকটিই সঠিক কম্পাস দিক, ২ডি মানচিত্রে সরলরেখা নয়।',
      },
      {
        q: 'কিবলা কম্পাস কী এবং এই দিক থেকে এটি কীভাবে আলাদা?',
        a: 'কিবলা কম্পাস (কাবা কম্পাস বা মক্কা কম্পাস নামেও পরিচিত) হলো একটি বাস্তব বা অ্যাপ-ভিত্তিক কম্পাস, যাতে আপনার অবস্থানের জন্য কিবলার দিক চিহ্নিত থাকে। এই পৃষ্ঠায় দেখানো দিকটিই একই দিক, সত্যিকারের উত্তর থেকে ডিগ্রিতে - যেকোনো সাধারণ কম্পাসে এটি প্রবেশ করান, অথবা Bustandeen অ্যাপে লাইভ কিবলা কম্পাস খুলুন যা আপনার ডিভাইস ব্যবহার করে স্বয়ংক্রিয়ভাবে দিক দেখায়।',
      },
    ],
  },
  ramadan: {
    indexHeading: (year) => `রমজান ${year} ক্যালেন্ডার`,
    indexSubheading:
      'বিশ্বের যেকোনো শহরের জন্য রমজানের সেহরি (ইমসাক) ও ইফতারের সময়। আপনার শহর খুঁজুন বা নিচে থেকে বেছে নিন।',
    searchPlaceholder: 'শহর বা দেশ খুঁজুন...',
    popularCitiesLabel: 'জনপ্রিয় শহর',
    noResults: 'আপনার অনুসন্ধানের সাথে মিলে এমন কোনো শহর নেই।',
    heading: (city, year) => `${city}-এর রমজান ${year} ক্যালেন্ডার`,
    subheading: (city, country) =>
      `${city}, ${country}-এ রমজানের প্রতিটি দিনের সেহরি (ইমসাক) ও ইফতারের সময়।`,
    imsakLabel: 'ইমসাক / সেহরি শেষ (ফজর)',
    iftarLabel: 'ইফতার (মাগরিব)',
    dayLabel: 'দিন',
    dateLabel: 'তারিখ',
    liveAppCta: 'অ্যাপে প্রতিদিনের রোজা ট্র্যাক করুন',
    prayerTimesCta: (city) => `${city}-এর সারাবছরের নামাজের সময়`,
    qiblaCta: (city) => `${city} থেকে কিবলার দিক`,
    note: 'রমজানের শুরুর তারিখ উম্মুল কুরা (islamic-umalqura) ক্যালেন্ডারের হিসাব অনুযায়ী দেখানো হয়েছে এবং স্থানীয় চাঁদ দেখা কমিটির ঘোষণা অনুযায়ী এক দিন কমবেশি হতে পারে — সবসময় আপনার স্থানীয় চাঁদ দেখা কর্তৃপক্ষের সাথে নিশ্চিত করুন।',
  },
  duas: {
    heading: 'দোয়া সংকলন',
    subheading: 'প্রতিদিনের পরিস্থিতির জন্য বিশুদ্ধ দোয়া, প্রতিটির উৎস ও মান উল্লেখসহ।',
    allSituations: 'সব পরিস্থিতি',
    arabicLabel: 'আরবি',
    transliterationLabel: 'উচ্চারণ',
    translationLabel: 'অর্থ',
    sourceLabel: 'উৎস',
    pageHeading: (situation) => `${situation}-এর দোয়া`,
  },
  adhkar: {
    morningTitle: 'সকালের আযকার',
    eveningTitle: 'সন্ধ্যার আযকার',
    morningSubtitle: 'আযকারুস সাবাহ — দিন শুরুর জন্য নবী ﷺ-এর শেখানো যিকির।',
    eveningSubtitle: 'আযকারুল মাসা — দিন শেষের জন্য নবী ﷺ-এর শেখানো যিকির।',
    switchToMorning: 'সকাল',
    switchToEvening: 'সন্ধ্যা',
    repeatLabel: (n) => (n > 1 ? `${n} বার পড়ুন` : 'একবার পড়ুন'),
    sourceLabel: 'উৎস',
  },
  hijri: {
    title: 'হিজরি তারিখ কনভার্টার',
    subtitle: 'গ্রেগরিয়ান ও ইসলামিক (হিজরি) ক্যালেন্ডারের মধ্যে রূপান্তর করুন।',
    gregorianLabel: 'গ্রেগরিয়ান তারিখ',
    hijriLabel: 'হিজরি তারিখ',
    todayLabel: 'আজকের তারিখ',
    convertHint: 'নামাজের সময়, রোজা ট্র্যাকিং ও আরও অনেক কিছুর জন্য Bustandeen অ্যাপ খুলুন',
    adjustmentLabel: 'চাঁদ দেখা সমন্বয়',
    adjustmentNone: 'আদর্শ',
    adjustmentNote:
      'স্থানীয় চাঁদ দেখার ঘোষণার উপর নির্ভর করে হিজরি মাসের শুরু বিভিন্ন অঞ্চলে সত্যিই এক দিন কমবেশি হতে পারে — আপনার স্থানীয় কর্তৃপক্ষ আদর্শ হিসাব থেকে ভিন্ন হলে এখানে সমন্বয় করুন।',
  },
  asmaUlHusna: {
    title: 'আল্লাহর ৯৯টি নাম',
    subtitle: 'আসমাউল হুসনা: আল্লাহর সবচেয়ে সুন্দর নামসমূহ, আরবি, উচ্চারণ ও অর্থসহ।',
    searchPlaceholder: 'নাম বা অর্থ খুঁজুন...',
    noResults: 'আপনার অনুসন্ধানের সাথে মিলে এমন কোনো নাম নেই।',
    sourceNote:
      "নবী ﷺ বলেছেন, আল্লাহর ৯৯টি নাম আছে, যে ব্যক্তি এগুলো সংরক্ষণ করবে সে জান্নাতে প্রবেশ করবে (সহীহ বুখারী ৭৩৯২, সহীহ মুসলিম ২৬৭৭ - সহীহ)। জামি' আত-তিরমিযী ৩৫০৭-এ উল্লেখিত এই নির্দিষ্ট ৯৯টি নামের তালিকাটি বর্তমানে সর্বাধিক প্রচলিত; ইবনে তাইমিয়াসহ অনেক হাদীসবিশারদ উল্লেখ করেছেন যে এই তালিকাটি নবী ﷺ-এর নিজের বাক্য নয়, বরং পরবর্তী সংযোজন - যদিও নামগুলো কুরআন ও সহীহ সুন্নাহ থেকে নেওয়া। বিভিন্ন নির্ভরযোগ্য সংকলনে কিছু নামের ক্রম বা বানান সামান্য ভিন্ন হতে পারে।",
    liveAppCta: 'যিকর, সালাত ও কুরআন ট্র্যাকিংয়ের জন্য Bustandeen অ্যাপ খুলুন',
  },
  zakat: {
    title: 'যাকাত ক্যালকুলেটর',
    subtitle:
      'আপনার যাকাত হিসাব করুন: স্বর্ণ বা রৌপ্যের মানদণ্ডে নিসাব, আপনার সম্পদ ও ঋণ, এবং কবে আপনার হাওল পূর্ণ হবে।',
    nisabTitle: 'নিসাবের পরিমাণ',
    nisabGoldLabel: 'স্বর্ণের মানদণ্ড (৮৭.৪৮ গ্রাম)',
    nisabSilverLabel: 'রৌপ্যের মানদণ্ড (৬১২.৩৬ গ্রাম)',
    nisabStandardHint: 'কোন নিসাব মানদণ্ড ব্যবহার করবেন বেছে নিন - নিচে মাযহাবভিত্তিক নোট দেখুন।',
    madhabTitle: 'কোন মানদণ্ড ব্যবহার করব?',
    madhabNote:
      'আলেমদের মধ্যে মতভেদ রয়েছে। রৌপ্যের মানদণ্ডে নিসাবের পরিমাণ কম হয়, ফলে বেশি মানুষ যাকাত দেওয়ার আওতায় আসেন - অনেক হানাফি আলেম এই মতকেই প্রাধান্য দেন, কারণ এতে গরীবদের বেশি উপকার হয়। স্বর্ণের মানদণ্ডে নিসাবের পরিমাণ বেশি হয়, এবং অনেক সমসাময়িক আলেম ও যাকাত প্রতিষ্ঠান নগদ সঞ্চয়ের ক্ষেত্রে এটিই সুপারিশ করেন, যাতে সীমিত সামর্থ্যের মানুষের উপর অহেতুক দায় না পড়ে। এই ক্যালকুলেটরে আপনি বেছে নিতে পারবেন; নিশ্চিত না হলে আপনার এলাকার বিশ্বস্ত আলেমের পরামর্শ নিন।',
    jewelryLabel: 'ব্যক্তিগত ব্যবহারের স্বর্ণ/রৌপ্য গহনা অন্তর্ভুক্ত করবেন?',
    jewelryNote:
      'হানাফি মত: ব্যবহার নির্বিশেষে স্বর্ণ/রৌপ্য গহনার উপর যাকাত ফরজ। সংখ্যাগরিষ্ঠ মত (শাফেয়ী, মালেকী, হাম্বলী): প্রচলিত মাত্রায় ব্যবহৃত গহনা যাকাতমুক্ত। আপনি যে মত অনুসরণ করেন তা গহনা অন্তর্ভুক্ত করলে তবেই এটি চালু করুন।',
    assetsTitle: 'আপনার সম্পদ ও ঋণ',
    cashLabel: 'নগদ ও ব্যাংক জমা',
    goldValueLabel: 'স্বর্ণের মূল্য (বাজারদর)',
    silverValueLabel: 'রৌপ্যের মূল্য (বাজারদর)',
    businessLabel: 'ব্যবসায়িক সম্পদ (বর্তমান মূল্যে মজুদ)',
    receivablesLabel: 'আপনার পাওনা টাকা (ফেরত পাওয়ার প্রত্যাশিত)',
    liabilitiesLabel: 'আপনার দেনা (এখনই পরিশোধযোগ্য)',
    totalLabel: 'মোট সম্পদ',
    netZakatableLabel: 'নিট যাকাতযোগ্য সম্পদ',
    belowNisabMsg:
      'আপনার নিট সম্পদ নিসাবের নিচে - এ বছর যাকাত ফরজ নয়, তবে বৃদ্ধি পেলে খেয়াল রাখুন।',
    aboveNisabMsg: (amount) => `আপনার নিট সম্পদ নিসাবের বেশি। আনুমানিক যাকাত (২.৫%): ${amount}`,
    zakatDueLabel: 'প্রদেয় যাকাত (২.৫%)',
    rateNote:
      'নগদ, স্বর্ণ, রৌপ্য, ব্যবসায়িক ও পাওনা সম্পদের উপর যাকাতের হার নিট যাকাতযোগ্য পরিমাণের ২.৫% (৪০ ভাগের ১ ভাগ), যখন নিসাবের উপরে পূর্ণ এক হিজরি (চন্দ্র) বছর অতিবাহিত হয়।',
    hawlTitle: 'হাওল ট্র্যাকার',
    hawlStartLabel: 'যে তারিখে আপনার সম্পদ প্রথম নিসাবে পৌঁছেছে',
    hawlNote:
      'নিসাবের উপরে সম্পদ পূর্ণ এক হিজরি (চন্দ্র) বছর অবস্থান করলে যাকাত ফরজ হয় - গ্রেগরিয়ান ক্যালেন্ডার বছর নয়।',
    hawlNotSetMsg: 'আপনার হাওলের বার্ষিকী দেখতে একটি শুরুর তারিখ দিন।',
    hawlDaysLeftMsg: (n) =>
      n === 1 ? 'আপনার হাওল পূর্ণ হতে আর ১ দিন বাকি।' : `আপনার হাওল পূর্ণ হতে আর ${n} দিন বাকি।`,
    hawlPastDueMsg: (date) =>
      `আপনার হাওল ${date}-এ পূর্ণ হয়েছে। এরপর থেকে সম্পদ নিসাবের উপরে থাকলে এখন যাকাত ফরজ।`,
    hawlDueDateLabel: 'হাওল পূর্ণ হবে',
    pricesAsOfLabel: (date) =>
      `স্বর্ণ/রৌপ্যের মূল্য সর্বশেষ যাচাই করা হয়েছে ${date} তারিখে - লাইভ নয়, শুধু আনুমানিক হিসাবের জন্য।`,
    disclaimerTitle: 'গুরুত্বপূর্ণ',
    disclaimer:
      'এই ক্যালকুলেটরটি পরিকল্পনায় সহায়তার জন্য একটি আনুমানিক হিসাব দেয়, এটি কোনো ফতোয়া নয়। নিসাবের পরিমাণ, গহনার বিধান ও সম্পদের হিসাব মাযহাবভেদে সত্যিই ভিন্ন হয়, আর যাকাতে ভুল হওয়া একটি বড় দায়িত্বের বিষয় - তাই পরিশোধের আগে, বিশেষত ব্যবসায়িক সম্পদ, ঋণ বা অস্বাভাবিক সম্পদের ক্ষেত্রে, দয়া করে যোগ্য স্থানীয় আলেম বা বিশ্বস্ত যাকাত প্রতিষ্ঠানের সাথে আপনার নির্দিষ্ট পরিস্থিতি যাচাই করুন।',
    liveAppCta: 'যিকর, সালাত ও কুরআন ট্র্যাকিংয়ের জন্য Bustandeen অ্যাপ খুলুন',
    faqTitle: 'সাধারণ প্রশ্ন',
    faq: [
      {
        q: 'এই ক্যালকুলেটর কি কোনো ফতোয়া বা শরীয়াহ রায়?',
        a: 'না। এটি প্রচলিতভাবে উল্লেখিত নিসাবের পরিমাণ ও মানক ২.৫% হার ব্যবহার করে একটি হিসাব-সহায়ক টুল। আপনার নির্দিষ্ট পরিস্থিতির জন্য - বিশেষত ব্যবসায়িক সম্পদ, ঋণ বা মিশ্র-মাযহাব পরিবারের ক্ষেত্রে - একজন যোগ্য আলেমের সাথে নিশ্চিত করুন।',
      },
      {
        q: 'স্বর্ণ-মানদণ্ড ও রৌপ্য-মানদণ্ড ভিন্ন উত্তর দেয় কেন?',
        a: 'সময়ের সাথে দুই ধাতুর বাজারমূল্য অনেকটা আলাদা হয়ে গেছে, তাই আজকের দিনে রৌপ্য নিসাব (৬১২.৩৬ গ্রাম) সাধারণত স্বর্ণ নিসাবের (৮৭.৪৮ গ্রাম) চেয়ে অনেক কম নগদ-সীমা দেয়। নগদ ও মিশ্র সম্পদের ক্ষেত্রে কোনটি প্রযোজ্য তা নিয়ে আলেমদের মধ্যে মতভেদ আছে - উপরের নোট দেখুন।',
      },
      {
        q: 'পূর্ণ এক বছর হওয়ার আগেই যদি সম্পদ নিসাবের নিচে নেমে যায়?',
        a: 'অধিকাংশ আলেমের মতে হাওল পুনরায় শুরু হয় - সেই সম্পদের উপর যাকাত ফরজ হওয়ার জন্য আবার নিসাবে পৌঁছাতে হবে এবং নতুন করে এক পূর্ণ হিজরি বছর পার করতে হবে।',
      },
    ],
  },
};

const ar: ChromeStrings = {
  siteName: 'Bustandeen',
  tagline: 'نمِّ دينك',
  home: 'الرئيسية',
  backToLiveApp: 'افتح الحاسبة المباشرة في التطبيق',
  languageLabel: 'اللغة',
  breadcrumbPrayerTimes: 'مواقيت الصلاة',
  breadcrumbQibla: 'اتجاه القبلة',
  breadcrumbRamadan: 'تقويم رمضان',
  breadcrumbDuas: 'مكتبة الأدعية',
  breadcrumbAdhkar: 'الأذكار',
  breadcrumbHijri: 'محول التاريخ الهجري',
  breadcrumbAsmaUlHusna: 'أسماء الله الحسنى',
  breadcrumbZakat: 'حاسبة الزكاة',
  prayerTimes: {
    heading: (city) => `مواقيت الصلاة اليوم في ${city}`,
    subheading: (city, country) =>
      `مواقيت الفجر والظهر والعصر والمغرب والعشاء في ${city}, ${country}.`,
    todayLabel: 'مواقيت الصلاة اليوم',
    methodNote:
      'تُحسب المواقيت على الجهاز مباشرة باستخدام معادلات فلكية قياسية — نفس الطريقة المستخدمة في تطبيق Bustandeen لكل حساب لمواقيت الصلاة.',
    hanafiAsrNote:
      'وقت العصر المعروض هنا وفق المذهب الجمهور (الشافعي/المالكي/الحنبلي)؛ يمكن التبديل إلى المذهب الحنفي داخل التطبيق.',
    liveAppCta: 'افتح متتبع الصلاة المباشر للحصول على مواقيت دقيقة ومحدَّثة تلقائيًا',
    qiblaCta: (city) => `اتجاه القبلة من ${city}`,
    ramadanCta: (city) => `تقويم رمضان لمدينة ${city}`,
    faqTitle: 'أسئلة شائعة',
    faq: [
      {
        q: 'كيف تُحسب مواقيت الصلاة هذه؟',
        a: 'تُحسب المواقيت من الإحداثيات الدقيقة للمدينة باستخدام معادلات فلكية قياسية لموضع الشمس — وهي نفس طريقة الحساب المستخدمة داخل تطبيق Bustandeen، دون الاعتماد على أي واجهة برمجية خارجية.',
      },
      {
        q: 'هل تُراعى هذه المواقيت التوقيت الصيفي أو تغيّر المنطقة الزمنية المحلية؟',
        a: 'نعم — تُعرض المواقيت بالتوقيت المحلي للمدينة نفسها. للحصول على دقة مضمونة ومباشرة في أي تاريخ، افتح متتبع مواقيت الصلاة في التطبيق الذي يعيد الحساب على جهازك.',
      },
      {
        q: 'ما طريقة الحساب ومذهب العصر المستخدمان؟',
        a: 'تُعرض افتراضيًا طريقة حساب قياسية مع مذهب الجمهور للعصر؛ ويتيح متتبع التطبيق اختيار طرق حساب متعددة والتبديل إلى مذهب العصر الحنفي.',
      },
    ],
    nearbyTitle: 'مدن قريبة',
  },
  qibla: {
    heading: (city) => `اتجاه القبلة من ${city}`,
    subheading: (city, country) =>
      `اتجاه البوصلة نحو الكعبة المشرفة في مكة المكرمة من ${city}, ${country}.`,
    bearingLabel: 'زاوية القبلة (من الشمال الحقيقي)',
    distanceLabel: 'المسافة إلى مكة المكرمة',
    howToFindTitle: 'كيف تحدد اتجاه القبلة بدون بوصلة',
    howToFindBody:
      'قف باتجاه الزاوية الموضحة أعلاه، المقاسة باتجاه عقارب الساعة من الشمال الحقيقي (وليس الشمال المغناطيسي — تحتاج معظم بوصلات الهواتف إلى معايرة لعرض الشمال الحقيقي بدقة). تستخدم بوصلة القبلة المباشرة في تطبيق Bustandeen حساس اتجاه جهازك وموقعك الحالي للإشارة تلقائيًا، دون الحاجة لأي حساب يدوي.',
    liveAppCta: 'افتح بوصلة القبلة المباشرة في التطبيق',
    prayerTimesCta: (city) => `مواقيت الصلاة في ${city}`,
    faqTitle: 'أسئلة شائعة',
    faq: [
      {
        q: 'كيف يُحسب اتجاه القبلة؟',
        a: 'الزاوية الموضحة هي اتجاه الدائرة العظمى من إحداثيات المدينة إلى الكعبة المشرفة (21.4225° شمالاً، 39.8262° شرقًا)، محسوبة باستخدام حساب المثلثات الكروية القياسي.',
      },
      {
        q: 'لماذا لا يشير اتجاه القبلة مباشرة نحو مكة على خريطة مسطحة؟',
        a: 'لأن الأرض كروية الشكل، غالبًا ما يبدو أقصر مسار (مسار الدائرة العظمى) منحنيًا على إسقاط خريطة مسطحة — والزاوية الموضحة هنا هي اتجاه البوصلة الصحيح الذي يجب استقباله، وليست خطًا مستقيمًا على خريطة ثنائية الأبعاد.',
      },
      {
        q: 'ما هي بوصلة القبلة وكيف تختلف عن هذه الزاوية؟',
        a: 'بوصلة القبلة (تُعرف أيضًا ببوصلة الكعبة أو بوصلة مكة) هي بوصلة حقيقية أو تطبيق يُظهر اتجاه القبلة من موقعك. الزاوية الموضحة في هذه الصفحة هي نفس الاتجاه، بالدرجات من الشمال الحقيقي - أدخلها في أي بوصلة عادية، أو افتح تطبيق Bustandeen للحصول على بوصلة قبلة مباشرة تشير تلقائيًا باستخدام جهازك.',
      },
    ],
  },
  ramadan: {
    indexHeading: (year) => `تقويم رمضان ${year}`,
    indexSubheading:
      'مواقيت الإمساك (السحور) والإفطار لرمضان، لأي مدينة في العالم. ابحث عن مدينتك أو اختر من القائمة أدناه.',
    searchPlaceholder: 'ابحث عن مدينة أو دولة...',
    popularCitiesLabel: 'مدن شائعة',
    noResults: 'لا توجد مدن مطابقة لبحثك.',
    heading: (city, year) => `تقويم رمضان ${year} لمدينة ${city}`,
    subheading: (city, country) =>
      `مواقيت الإمساك (السحور) والإفطار لكل يوم من رمضان في ${city}, ${country}.`,
    imsakLabel: 'الإمساك / نهاية السحور (الفجر)',
    iftarLabel: 'الإفطار (المغرب)',
    dayLabel: 'اليوم',
    dateLabel: 'التاريخ',
    liveAppCta: 'تابع صيامك يومًا بيوم داخل التطبيق',
    prayerTimesCta: (city) => `مواقيت الصلاة على مدار العام في ${city}`,
    qiblaCta: (city) => `اتجاه القبلة من ${city}`,
    note: 'يعتمد تاريخ بداية رمضان على تقويم أم القرى (islamic-umalqura) وقد يختلف بيوم واحد حسب إعلانات رؤية الهلال المحلية — يُرجى دائمًا التأكد من الجهة الرسمية لرؤية الهلال في بلدك.',
  },
  duas: {
    heading: 'مكتبة الأدعية',
    subheading: 'أدعية صحيحة لمواقف الحياة اليومية، مع ذكر المصدر ودرجة الحديث لكل دعاء.',
    allSituations: 'كل المواقف',
    arabicLabel: 'النص العربي',
    transliterationLabel: 'النطق بالحروف اللاتينية',
    translationLabel: 'المعنى',
    sourceLabel: 'المصدر',
    pageHeading: (situation) => `دعاء ${situation}`,
  },
  adhkar: {
    morningTitle: 'أذكار الصباح',
    eveningTitle: 'أذكار المساء',
    morningSubtitle: 'أذكار الصباح المأثورة عن النبي ﷺ لبداية اليوم.',
    eveningSubtitle: 'أذكار المساء المأثورة عن النبي ﷺ لنهاية اليوم.',
    switchToMorning: 'الصباح',
    switchToEvening: 'المساء',
    repeatLabel: (n) => (n > 1 ? `يُكرر ${n} مرات` : 'مرة واحدة'),
    sourceLabel: 'المصدر',
  },
  hijri: {
    title: 'محول التاريخ الهجري',
    subtitle: 'حوّل بين التقويمين الميلادي والهجري.',
    gregorianLabel: 'التاريخ الميلادي',
    hijriLabel: 'التاريخ الهجري',
    todayLabel: 'تاريخ اليوم',
    convertHint: 'افتح تطبيق Bustandeen لمواقيت الصلاة وتتبع الصيام والمزيد',
    adjustmentLabel: 'تعديل رؤية الهلال',
    adjustmentNone: 'قياسي',
    adjustmentNote:
      'قد يختلف بداية الشهر الهجري فعليًا بيوم واحد بين المناطق حسب إعلانات رؤية الهلال المحلية — عدّل هنا إذا اختلفت جهتك المحلية عن الحساب القياسي.',
  },
  asmaUlHusna: {
    title: 'أسماء الله الحسنى',
    subtitle: 'الأسماء الحسنى: أجمل أسماء الله، مع النص العربي والنطق والمعنى.',
    searchPlaceholder: 'ابحث عن اسم أو معنى...',
    noResults: 'لا توجد أسماء مطابقة لبحثك.',
    sourceNote:
      "قال النبي ﷺ: 'إن لله تسعة وتسعين اسمًا، من أحصاها دخل الجنة' (صحيح البخاري 7392، صحيح مسلم 2677 - حديث صحيح). أما هذه القائمة المحددة المكوّنة من 99 اسمًا، المنقولة غالبًا عن جامع الترمذي 3507، فهي الأكثر تداولًا اليوم؛ وقد نبّه عدد من علماء الحديث، منهم ابن تيمية، إلى أن سرد الأسماء بهذا الترتيب زيادة من الرواة وليس من لفظ النبي ﷺ نفسه، مع أن الأسماء ذاتها كلها واردة في القرآن والسنة الصحيحة. وتختلف بعض المصادر الموثوقة قليلًا في ترتيب أو تهجئة بعض الأسماء.",
    liveAppCta: 'افتح تطبيق Bustandeen للأذكار والصلاة وتتبع القرآن',
  },
  zakat: {
    title: 'حاسبة الزكاة',
    subtitle: 'احسب زكاتك: النصاب بمعيار الذهب أو الفضة، أموالك وديونك، وموعد اكتمال حولك.',
    nisabTitle: 'نصاب الزكاة',
    nisabGoldLabel: 'معيار الذهب (87.48 جرام)',
    nisabSilverLabel: 'معيار الفضة (612.36 جرام)',
    nisabStandardHint: 'اختر معيار النصاب الذي تريد استخدامه - راجع ملاحظة المذاهب أدناه.',
    madhabTitle: 'أي معيار أستخدم؟',
    madhabNote:
      'يختلف العلماء في ذلك. معيار الفضة يعطي حدًا أدنى أقل، فيشمل عددًا أكبر ممن تجب عليهم الزكاة - وهو ما يفضله كثير من علماء الحنفية لما فيه من نفع أوسع للفقراء. أما معيار الذهب فيعطي حدًا أعلى، وهو ما يوصي به كثير من العلماء المعاصرين وهيئات الزكاة بالنسبة للمدخرات النقدية، حتى لا يُلزَم أصحاب الدخل المحدود. تتيح لك هذه الحاسبة الاختيار؛ وإن لم تكن متأكدًا فاسأل عالمًا موثوقًا في منطقتك.',
    jewelryLabel: 'هل تُدرِج الحلي الذهبية/الفضية المستخدمة شخصيًا؟',
    jewelryNote:
      'مذهب الحنفية: تجب الزكاة في حلي الذهب والفضة بغض النظر عن الاستخدام. مذهب الجمهور (الشافعية والمالكية والحنابلة): الحلي المستخدمة ضمن الحدود المعتادة معفاة. فعّل هذا الخيار فقط إن كنت تتبع الرأي القائل بوجوبها.',
    assetsTitle: 'أموالك وديونك',
    cashLabel: 'النقد والأرصدة البنكية',
    goldValueLabel: 'قيمة الذهب (سعر السوق)',
    silverValueLabel: 'قيمة الفضة (سعر السوق)',
    businessLabel: 'أصول تجارية (البضاعة بسعرها الحالي)',
    receivablesLabel: 'أموال مستحقة لك (يُتوقع تحصيلها)',
    liabilitiesLabel: 'ديون عليك (مستحقة الآن)',
    totalLabel: 'إجمالي الأصول',
    netZakatableLabel: 'صافي المال الزكوي',
    belowNisabMsg: 'صافي مالك أقل من النصاب - لا زكاة عليك هذا العام، لكن تابع المتابعة إن زاد.',
    aboveNisabMsg: (amount) =>
      `صافي مالك يتجاوز النصاب. الزكاة التقديرية المستحقة (2.5%): ${amount}`,
    zakatDueLabel: 'الزكاة المستحقة (2.5%)',
    rateNote:
      'زكاة النقد والذهب والفضة والأصول التجارية والديون المستحقة لك هي 2.5% (ربع العشر) من صافي المال الزكوي، بعد مرور حول هجري كامل فوق النصاب.',
    hawlTitle: 'متتبع الحول',
    hawlStartLabel: 'تاريخ بلوغ مالك النصاب لأول مرة',
    hawlNote:
      'تجب الزكاة بعد مرور حول هجري (قمري) كامل يبقى فيه مالك عند النصاب أو أعلى منه - وليس السنة الميلادية.',
    hawlNotSetMsg: 'أدخل تاريخ البداية لمعرفة موعد اكتمال حولك.',
    hawlDaysLeftMsg: (n) =>
      n === 1 ? 'يتبقى يوم واحد لاكتمال حولك.' : `يتبقى ${n} يومًا لاكتمال حولك.`,
    hawlPastDueMsg: (date) =>
      `اكتمل حولك في ${date}. إذا بقي مالك فوق النصاب منذ ذلك الحين، فالزكاة مستحقة الآن.`,
    hawlDueDateLabel: 'يكتمل الحول في',
    pricesAsOfLabel: (date) =>
      `آخر تحقق من أسعار الذهب/الفضة كان في ${date} - ليست أسعارًا مباشرة، للتقدير فقط.`,
    disclaimerTitle: 'تنبيه مهم',
    disclaimer:
      'تقدم هذه الحاسبة تقديرًا يساعدك على التخطيط، وليست فتوى. تختلف أوزان النصاب وأحكام الحلي ومعاملة الأصول فعليًا بين المذاهب، والخطأ في الزكاة مسؤولية حقيقية - لذا يُرجى التحقق من وضعك الخاص مع عالم موثوق أو جهة زكاة موثوقة قبل الدفع، خصوصًا في الأصول التجارية والديون والممتلكات غير المعتادة.',
    liveAppCta: 'افتح تطبيق Bustandeen للأذكار والصلاة وتتبع القرآن',
    faqTitle: 'أسئلة شائعة',
    faq: [
      {
        q: 'هل هذه الحاسبة فتوى أو حكم شرعي؟',
        a: 'لا. هي أداة حسابية تستخدم أرقام النصاب الشائعة ونسبة 2.5% المعتادة. لوضعك الخاص - خصوصًا الأصول التجارية أو الديون أو الأسر متعددة المذاهب - تأكد من عالم مؤهل.',
      },
      {
        q: 'لماذا يعطي معيار الذهب ومعيار الفضة إجابتين مختلفتين؟',
        a: 'تباعدت القيمة السوقية للمعدنين بمرور الوقت، فأصبح نصاب الفضة (612.36 جرام) اليوم غالبًا حدًا نقديًا أقل بكثير من نصاب الذهب (87.48 جرام). يختلف العلماء في أيهما يُطبَّق على النقد والمال المختلط - راجع الملاحظة أعلاه.',
      },
      {
        q: 'ماذا لو انخفض مالي عن النصاب قبل اكتمال السنة؟',
        a: 'يرى معظم العلماء أن الحول ينقطع عندئذ - فتحتاج إلى بلوغ النصاب من جديد وإتمام حول هجري كامل قبل أن تجب الزكاة على ذلك المال.',
      },
    ],
  },
};

export const CHROME: Record<SeoLang, ChromeStrings> = { en, bn, ar };
