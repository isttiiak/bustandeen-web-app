// Bayan's page chrome, "How we calculate" and "Credits", English and Bangla.
// "How we calculate" says what the app does and which source it follows: it is
// a description, never a ruling.
import type { BayanLang } from './guides.js';

export const BAYAN_ORIGIN = 'https://bayan.bustandeen.com';
export const APP_ORIGIN = 'https://bustandeen.com';

export interface BayanChrome {
  siteTag: string;
  home: string;
  guides: string;
  news: string;
  calc: string;
  credits: string;
  /** The globe menu (2026-10-15): its label and "Request a language". */
  language: string;
  requestLanguage: string;
  openApp: string;
  heroTitle: string;
  heroText: string;
  filterLabel: string;
  filterPlaceholder: string;
  noMatch: string;
  latest: string;
  allUpdates: string;
  calcCardText: string;
  creditsCardText: string;
  updated: (date: string) => string;
  nextGuide: (title: string) => string;
  newsIntro: string;
  added: string;
  fixed: string;
  calcIntro: string;
  calcWhat: string;
  calcHow: string;
  calcNote: string;
  creditsIntro: string;
  footer: { about: string; privacy: string; status: string; contact: string };
  homeDescription: string;
  newsDescription: string;
  calcDescription: string;
  creditsDescription: string;
  menu: string;
  formatDate: (iso: string) => string;
}

// By hand, not Intl: src/seo avoids per-call Intl objects (build time).
const EN_MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const enDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${EN_MONTHS[m! - 1]} ${y}`;
};
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const BN_MONTHS = [
  'জানু',
  'ফেব্রু',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টে',
  'অক্টো',
  'নভে',
  'ডিসে',
];
const bnNum = (n: number | string) => String(n).replace(/\d/g, (d) => BN_DIGITS[Number(d)]!);
const bnDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${bnNum(d!)} ${BN_MONTHS[m! - 1]} ${bnNum(y!)}`;
};

export const CHROME: Record<BayanLang, BayanChrome> = {
  en: {
    siteTag: 'Bayan',
    home: 'Home',
    guides: 'Guides',
    news: 'What’s new',
    calc: 'How we calculate',
    credits: 'Credits',
    language: 'Language',
    requestLanguage: 'Request a language',
    openApp: 'Open the app',
    heroTitle: 'Help & updates',
    heroText:
      'Short guides for every part of Bustandeen, what changed in each release, and exactly how prayer times, the Hijri date and kaza are worked out.',
    filterLabel: 'Find a guide',
    filterPlaceholder: 'Search the guides',
    noMatch: 'No guide matches. Try another word.',
    latest: 'Latest releases',
    allUpdates: 'All updates',
    calcCardText: 'Prayer times, the day boundary, the Hijri date, qaṣr and kaza.',
    creditsCardText: 'The Quran text, audio, libraries and people this is built on.',
    updated: (date) => `Updated ${date}`,
    nextGuide: (title) => `Next: ${title}`,
    newsIntro: 'Every release in plain words. Newest first.',
    added: 'New',
    fixed: 'Fixed',
    calcIntro: 'Everything below is worked out on your device. Your location never leaves it.',
    calcWhat: 'What',
    calcHow: 'How',
    calcNote:
      'These describe how the app works, not religious rulings. Ask a scholar you trust about your own case.',
    creditsIntro: 'With thanks to everyone whose work makes this possible.',
    footer: { about: 'About', privacy: 'Privacy', status: 'Status', contact: 'Contact' },
    homeDescription:
      'Guides for Bustandeen: salat and kaza, fasting, zikr, the Quran habit, Musafir, Rayhanah and friends, plus what is new and how prayer times are worked out.',
    newsDescription: 'What changed in each Bustandeen release, in plain words.',
    calcDescription:
      'How Bustandeen works out prayer times, the start of your day, the Hijri date, travel prayers and kaza.',
    creditsDescription: 'The Quran text, audio, libraries and fonts Bustandeen is built on.',
    menu: 'Menu',
    formatDate: enDate,
  },
  bn: {
    siteTag: 'বায়ান',
    home: 'হোম',
    guides: 'নির্দেশিকা',
    news: 'নতুন কী',
    calc: 'হিসাব যেভাবে হয়',
    credits: 'কৃতজ্ঞতা',
    language: 'ভাষা',
    requestLanguage: 'ভাষার অনুরোধ',
    openApp: 'অ্যাপ খুলুন',
    heroTitle: 'সাহায্য ও আপডেট',
    heroText:
      'Bustandeen-এর প্রতিটি অংশের ছোট নির্দেশিকা, প্রতিটি আপডেটে কী বদলেছে, আর নামাযের সময়, হিজরি তারিখ ও কাযা ঠিক কীভাবে হিসাব হয়।',
    filterLabel: 'নির্দেশিকা খুঁজুন',
    filterPlaceholder: 'নির্দেশিকায় খুঁজুন',
    noMatch: 'কোনো নির্দেশিকা মেলেনি। অন্য শব্দ দিয়ে চেষ্টা করুন।',
    latest: 'সাম্প্রতিক আপডেট',
    allUpdates: 'সব আপডেট',
    calcCardText: 'নামাযের সময়, দিনের শুরু, হিজরি তারিখ, কসর ও কাযা।',
    creditsCardText: 'কুরআনের পাঠ, অডিও, লাইব্রেরি ও যাদের কাজের ওপর এটি গড়া।',
    updated: (date) => `হালনাগাদ ${date}`,
    nextGuide: (title) => `পরের নির্দেশিকা: ${title}`,
    newsIntro: 'প্রতিটি আপডেট সহজ ভাষায়। নতুনগুলো আগে।',
    added: 'নতুন',
    fixed: 'ঠিক করা হয়েছে',
    calcIntro: 'নিচের সবকিছু আপনার ডিভাইসেই হিসাব হয়। আপনার অবস্থান ডিভাইসের বাইরে যায় না।',
    calcWhat: 'কী',
    calcHow: 'কীভাবে',
    calcNote:
      'এগুলো অ্যাপ কীভাবে কাজ করে তার বর্ণনা, কোনো শরঈ ফতোয়া নয়। নিজের বিষয়ে আস্থাভাজন কোনো আলেমকে জিজ্ঞেস করুন।',
    creditsIntro: 'যাদের কাজে এটি সম্ভব হয়েছে, সবার প্রতি কৃতজ্ঞতা।',
    footer: { about: 'পরিচিতি', privacy: 'গোপনীয়তা', status: 'স্ট্যাটাস', contact: 'যোগাযোগ' },
    homeDescription:
      'Bustandeen-এর নির্দেশিকা: নামায ও কাযা, রোজা, যিকির, কুরআন অভ্যাস, মুসাফির, রায়হানাহ ও বন্ধু, সাথে নতুন কী আর নামাযের সময় যেভাবে হিসাব হয়।',
    newsDescription: 'Bustandeen-এর প্রতিটি আপডেটে কী বদলেছে, সহজ ভাষায়।',
    calcDescription:
      'Bustandeen যেভাবে নামাযের সময়, দিনের শুরু, হিজরি তারিখ, সফরের নামায ও কাযা হিসাব করে।',
    creditsDescription: 'যে কুরআনের পাঠ, অডিও, লাইব্রেরি ও ফন্টের ওপর Bustandeen গড়া।',
    menu: 'মেনু',
    formatDate: bnDate,
  },
};

export interface Row {
  what: string;
  how: string;
}

export const CALC_ROWS: Record<BayanLang, Row[]> = {
  en: [
    {
      what: 'Prayer times',
      how: 'Worked out by the adhan library with the method most mosques in your country use (Bangladesh, Pakistan, India: Karachi with Ḥanafī ʿAṣr; Saudi Arabia: Umm al-Qura; and so on). Both can be changed in Salat settings.',
    },
    {
      what: 'Your day',
      how: 'Starts at Fajr at your saved place by default, so night prayers and suhoor belong to the day before. Midnight or Maghrib if you prefer. Without a saved place it starts at midnight.',
    },
    {
      what: 'Hijri date',
      how: 'Your own adjustment comes first, then the moon-sighting record for your country (when a month was announced to begin), then the Umm al-Qura calendar.',
    },
    {
      what: 'Travel (qaṣr)',
      how: 'Musafir shortens four-rakʿah prayers while you are on a journey and offers to join prayers on the move, following the madhab you choose. The distance and stay rules for each school are shown there with their sources.',
    },
    {
      what: 'Kaza',
      how: 'When a day ends with a prayer still unmarked, it is marked Miss and added to your make-up count. Ramadan days not fasted go to your fasting make-up count. On days Rayhanah marks as excused, no kaza is added.',
    },
  ],
  bn: [
    {
      what: 'নামাযের সময়',
      how: 'adhan লাইব্রেরি দিয়ে হিসাব হয়, আপনার দেশের বেশিরভাগ মসজিদ যে পদ্ধতি মেনে চলে সেই অনুযায়ী (বাংলাদেশ, পাকিস্তান, ভারত: করাচি ও হানাফি আসর; সৌদি আরব: উম্মুল কুরা; এভাবে)। দুটোই নামাযের সেটিংসে বদলানো যায়।',
    },
    {
      what: 'আপনার দিন',
      how: 'স্বাভাবিকভাবে আপনার সংরক্ষিত স্থানের ফজরে শুরু হয়, তাই রাতের নামায ও সাহরি আগের দিনের। চাইলে মধ্যরাত বা মাগরিব। কোনো স্থান সংরক্ষিত না থাকলে মধ্যরাতে শুরু হয়।',
    },
    {
      what: 'হিজরি তারিখ',
      how: 'প্রথমে আপনার নিজের সমন্বয়, তারপর আপনার দেশের চাঁদ দেখার রেকর্ড (মাস কবে শুরু বলে ঘোষণা হয়েছে), তারপর উম্মুল কুরা ক্যালেন্ডার।',
    },
    {
      what: 'সফর (কসর)',
      how: 'মুসাফির সফরের সময় চার রাকাতের নামায সংক্ষেপ করে এবং চলার পথে দুই নামায একসাথে পড়ার সুযোগ দেখায়, আপনার বেছে নেওয়া মাযহাব অনুযায়ী। প্রতিটি মাযহাবের দূরত্ব ও থাকার নিয়ম সেখানে সূত্রসহ দেখানো হয়।',
    },
    {
      what: 'কাযা',
      how: 'দিন শেষে কোনো নামাযে চিহ্ন না থাকলে সেটি ছুটে গেছে হিসেবে চিহ্নিত হয়ে কাযার হিসাবে যোগ হয়। রমজানে রাখা হয়নি এমন দিন কাযা রোজার হিসাবে যায়। রায়হানাহ যে দিনগুলোকে মাফ হিসেবে চিহ্নিত করে, সেদিন কোনো কাযা যোগ হয় না।',
    },
  ],
};

export interface Credit {
  what: string;
  who: string;
  href?: string;
}

export const CREDITS: Record<BayanLang, Credit[]> = {
  en: [
    {
      what: 'Quran text',
      who: 'Tanzil Project, Uthmani text v1.1, shown exactly as published',
      href: 'https://tanzil.net',
    },
    {
      what: 'Translations and recitation',
      who: 'Al Quran Cloud, Islamic Network, mp3quran',
      href: 'https://alquran.cloud',
    },
    { what: 'Tafsir', who: 'Quran.com', href: 'https://quran.com' },
    { what: 'Hadith references', who: 'sunnah.com', href: 'https://sunnah.com' },
    {
      what: 'Prayer times',
      who: 'adhan by Batoul Apps, open source',
      href: 'https://github.com/batoulapps/adhan-js',
    },
    {
      what: 'Place names (only if you turn it on)',
      who: 'OpenStreetMap contributors',
      href: 'https://www.openstreetmap.org/copyright',
    },
    { what: 'Country flags', who: 'Flagpedia (flagcdn.com)', href: 'https://flagpedia.net' },
    {
      what: 'Fonts',
      who: 'El Messiri, Plus Jakarta Sans, Hind Siliguri, Amiri and Scheherazade New, under the SIL Open Font License',
    },
  ],
  bn: [
    {
      what: 'কুরআনের পাঠ',
      who: 'তানজিল প্রজেক্ট, উসমানি পাঠ v1.1, প্রকাশিত রূপেই দেখানো',
      href: 'https://tanzil.net',
    },
    {
      what: 'অনুবাদ ও তিলাওয়াত',
      who: 'Al Quran Cloud, Islamic Network, mp3quran',
      href: 'https://alquran.cloud',
    },
    { what: 'তাফসীর', who: 'Quran.com', href: 'https://quran.com' },
    { what: 'হাদিসের সূত্র', who: 'sunnah.com', href: 'https://sunnah.com' },
    {
      what: 'নামাযের সময়',
      who: 'Batoul Apps-এর adhan, ওপেন সোর্স',
      href: 'https://github.com/batoulapps/adhan-js',
    },
    {
      what: 'স্থানের নাম (শুধু চালু করলে)',
      who: 'OpenStreetMap অবদানকারীরা',
      href: 'https://www.openstreetmap.org/copyright',
    },
    { what: 'দেশের পতাকা', who: 'Flagpedia (flagcdn.com)', href: 'https://flagpedia.net' },
    {
      what: 'ফন্ট',
      who: 'El Messiri, Plus Jakarta Sans, Hind Siliguri, Amiri ও Scheherazade New, SIL Open Font License-এর অধীনে',
    },
  ],
};
