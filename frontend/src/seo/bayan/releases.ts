// "What's new" on bayan.bustandeen.com: each release in plain words, newest
// first. Written for the people who use the app, not copied from CHANGELOG.md
// (that one is for developers). EVERY version bump adds an entry here, in
// English and Bangla: the newest entry must be the app's version (the footer
// shows it), and bayan.test.ts fails the build otherwise.
import type { BayanLang } from './guides.js';

export interface ReleaseText {
  title: string;
  added?: string[];
  fixed?: string[];
}

export interface Release {
  /** The full app version, as the app's footer shows it (e.g. 5.164.1). */
  version: string;
  date: string; // YYYY-MM-DD
  text: Record<BayanLang, ReleaseText>;
}

export const RELEASES: Release[] = [
  {
    version: '5.166.2',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Faster notice when sync has trouble',
        added: [
          'Our status page now also checks the database itself, so if saving and syncing ever stop working, we hear about it within minutes.',
        ],
      },
      bn: {
        title: 'সিঙ্কে সমস্যা হলে দ্রুত জানা যায়',
        added: [
          'আমাদের স্ট্যাটাস পাতা এখন ডেটাবেসও সরাসরি পরীক্ষা করে, তাই কখনো সংরক্ষণ ও সিঙ্ক বন্ধ হয়ে গেলে আমরা কয়েক মিনিটের মধ্যেই জানতে পারি।',
        ],
      },
    },
  },
  {
    version: '5.166.1',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Your data is now backed up every week',
        added: [
          "Once a week, the app's database is copied, locked with strong encryption, and kept in a private place. Each copy is opened and checked right after it is made, so we know it can be brought back if something goes wrong.",
        ],
      },
      bn: {
        title: 'আপনার ডেটার এখন প্রতি সপ্তাহে ব্যাকআপ হয়',
        added: [
          'সপ্তাহে একবার অ্যাপের ডেটাবেসের একটি কপি তৈরি হয়, শক্ত এনক্রিপশনে তালাবদ্ধ করে একটি ব্যক্তিগত জায়গায় রাখা হয়। প্রতিটি কপি তৈরির পরপরই খুলে পরীক্ষা করা হয়, যাতে কোনো সমস্যা হলে তা ফিরিয়ে আনা যায়।',
        ],
      },
    },
  },
  {
    version: '5.166.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Monthly page refresh made more reliable',
        fixed: [
          'The district prayer timetables and Ramadan calendars refresh on the 1st of every month. That refresh now runs on our own hosting, so it keeps going even in months with no app update.',
        ],
      },
      bn: {
        title: 'মাসিক পাতা হালনাগাদ আরও নির্ভরযোগ্য',
        fixed: [
          'জেলার নামাযের সময়সূচি ও রমজানের ক্যালেন্ডার প্রতি মাসের ১ তারিখে হালনাগাদ হয়। এই কাজ এখন আমাদের নিজের হোস্টিং থেকে চলে, তাই যে মাসে অ্যাপের কোনো আপডেট নেই সে মাসেও তা চলতে থাকে।',
        ],
      },
    },
  },
  {
    version: '5.165.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'One look for every on/off switch',
        fixed: [
          'Every on/off switch in the app now looks the same, in the dark and light themes, and is easier to tap.',
          'The cards on Salat analytics now match the rest of the app.',
        ],
      },
      bn: {
        title: 'সব চালু/বন্ধ সুইচ এক রকম',
        fixed: [
          'অ্যাপের প্রতিটি চালু/বন্ধ সুইচ এখন গাঢ় ও হালকা দুই থিমেই এক রকম দেখায়, আর চাপতেও সহজ।',
          'সালাত বিশ্লেষণের কার্ডগুলো এখন অ্যাপের বাকি অংশের সাথে মিলে যায়।',
        ],
      },
    },
  },
  {
    version: '5.164.2',
    date: '2026-10-14',
    text: {
      en: {
        title: 'What’s new lists every release',
        added: [
          'This page now has an entry for every version of the app, so the newest one here always matches the version in the app’s footer.',
        ],
      },
      bn: {
        title: 'নতুন কী পাতায় এখন প্রতিটি আপডেট',
        added: [
          'এই পাতায় এখন অ্যাপের প্রতিটি সংস্করণের জন্য একটি করে লেখা থাকে, তাই এখানকার সবচেয়ে নতুনটি সবসময় অ্যাপের ফুটারের সংস্করণের সাথে মেলে।',
        ],
      },
    },
  },
  {
    version: '5.164.1',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Clear “not found” on this help site',
        fixed: [
          'A mistyped address on bayan.bustandeen.com now shows “not found” instead of an empty app page.',
        ],
      },
      bn: {
        title: 'সাহায্য সাইটে স্পষ্ট “পাওয়া যায়নি”',
        fixed: [
          'bayan.bustandeen.com-এ ভুল ঠিকানা লিখলে এখন খালি অ্যাপ পাতার বদলে “পাওয়া যায়নি” দেখায়।',
        ],
      },
    },
  },
  {
    version: '5.164.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Help & updates',
        added: [
          'This site: short guides for every part of Bustandeen, what changed in each release, how prayer times, the Hijri date and kaza are worked out, and credits. In English and Bangla.',
          'A “Help & updates” link in the app’s footer and on the About page.',
        ],
      },
      bn: {
        title: 'সাহায্য ও আপডেট',
        added: [
          'এই সাইট: Bustandeen-এর প্রতিটি অংশের ছোট নির্দেশিকা, প্রতিটি আপডেটে কী বদলেছে, নামাযের সময়, হিজরি তারিখ ও কাযা কীভাবে হিসাব হয়, আর কৃতজ্ঞতা। ইংরেজি ও বাংলায়।',
          'অ্যাপের ফুটার ও পরিচিতি পাতায় “সাহায্য ও আপডেট” লিংক।',
        ],
      },
    },
  },
  {
    version: '5.163.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'The admin panel has its own address',
        added: [
          'The team’s admin panel moved to its own site, so its sign-ins are kept fully apart from yours. Nothing changes in the app for you.',
        ],
      },
      bn: {
        title: 'অ্যাডমিন প্যানেলের নিজস্ব ঠিকানা',
        added: [
          'দলের অ্যাডমিন প্যানেল নিজস্ব সাইটে সরে গেছে, তাই এর সাইন ইন আপনার সাইন ইন থেকে পুরোপুরি আলাদা থাকে। আপনার জন্য অ্যাপে কিছুই বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.162.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Quran habit and Ramadan open before signing in',
        added: [
          'The Quran habit, Khatam, Hifz, Bookmarks and Ramadan pages can be explored before you sign in. You are asked to sign in when you first save something.',
          'A Status link in the footer and on About shows whether the app, the website and the server are up.',
        ],
      },
      bn: {
        title: 'সাইন ইনের আগেই কুরআন অভ্যাস ও রমজান',
        added: [
          'কুরআন অভ্যাস, খতম, হিফয, বুকমার্ক ও রমজান পাতা সাইন ইনের আগেই ঘুরে দেখা যায়। প্রথমবার কিছু সংরক্ষণ করতে গেলে সাইন ইন চাওয়া হয়।',
          'ফুটার ও পরিচিতি পাতায় একটি স্ট্যাটাস লিংক দেখায় অ্যাপ, ওয়েবসাইট ও সার্ভার চালু আছে কি না।',
        ],
      },
    },
  },
  {
    version: '5.161.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Explore freely, sign in to save',
        added: [
          'Look around every page before you sign up. You are asked to sign in only when you save something, with a short reason why an account helps.',
          'The surah list is now at /quran/read, next to each surah.',
        ],
        fixed: ['Zikr counts made before signing in are no longer lost.'],
      },
      bn: {
        title: 'ঘুরে দেখুন, সংরক্ষণে সাইন ইন',
        added: [
          'সাইন আপের আগেই প্রতিটি পাতা ঘুরে দেখুন। কিছু সংরক্ষণ করতে গেলেই শুধু সাইন ইন চাওয়া হয়, সাথে ছোট করে বলা হয় অ্যাকাউন্ট কেন কাজে আসে।',
          'সূরার তালিকা এখন /quran/read এ, প্রতিটি সূরার পাশেই।',
        ],
        fixed: ['সাইন ইনের আগে করা যিকিরের গণনা আর হারায় না।'],
      },
    },
  },
  {
    version: '5.160.0',
    date: '2026-10-13',
    text: {
      en: {
        title: 'Your saved place sets the day everywhere',
        added: [
          'If you saved a place far from your phone clock, its day is used everywhere: zikr, salat and Quran.',
        ],
        fixed: [
          'A zikr day could look split in two after a time zone change; today’s total and the charts now count the whole day.',
        ],
      },
      bn: {
        title: 'সংরক্ষিত স্থানই সব জায়গায় দিন ঠিক করে',
        added: [
          'ফোনের ঘড়ি থেকে দূরের কোনো স্থান সংরক্ষণ করলে যিকির, নামায ও কুরআন সব জায়গায় সেই স্থানের দিন ধরা হয়।',
        ],
        fixed: [
          'সময় অঞ্চল বদলানোর পর যিকিরের একটি দিন দুই ভাগ হয়ে যেতে পারত; এখন আজকের মোট ও চার্ট পুরো দিনটাই গোনে।',
        ],
      },
    },
  },
  {
    version: '5.159.0',
    date: '2026-10-12',
    text: {
      en: {
        title: 'Prayer times right wherever your phone clock is set',
        fixed: [
          'With a saved place in another time zone than your phone, prayer times, the Hijri date and Friday now follow that place’s day.',
          'The Hijri date no longer jumps two days on the night clocks change.',
        ],
      },
      bn: {
        title: 'ফোনের ঘড়ি যেখানেই থাকুক, নামাযের সময় ঠিক',
        fixed: [
          'ফোনের চেয়ে ভিন্ন সময় অঞ্চলের কোনো স্থান সংরক্ষণ করলে নামাযের সময়, হিজরি তারিখ ও জুমা এখন সেই স্থানের দিন অনুযায়ী চলে।',
          'ঘড়ির সময় বদলানোর রাতে হিজরি তারিখ আর দুই দিন লাফিয়ে যায় না।',
        ],
      },
    },
  },
  {
    version: '5.157.0',
    date: '2026-10-11',
    text: {
      en: {
        title: 'Hijri months start on the announced sighting',
        added: [
          'A moon-sighting record now says when a month began in your country, so a 30th day of Ramadan can show when the month has 30 days.',
        ],
      },
      bn: {
        title: 'ঘোষিত চাঁদ দেখা থেকেই হিজরি মাস শুরু',
        added: [
          'চাঁদ দেখার রেকর্ড এখন বলে আপনার দেশে মাস কবে শুরু হয়েছে, তাই মাস ৩০ দিনের হলে রমজানের ৩০তম দিনও দেখা যায়।',
        ],
      },
    },
  },
  {
    version: '5.156.0',
    date: '2026-10-11',
    text: {
      en: {
        title: 'Sign up confirms your email first',
        added: [
          'Email sign-up now sends a link first. Your account is created when you open it and choose a password, so no one can sign up with an email that is not theirs.',
        ],
      },
      bn: {
        title: 'সাইন আপে আগে ইমেইল নিশ্চিত করা হয়',
        added: [
          'ইমেইলে সাইন আপ করলে এখন আগে একটি লিংক পাঠানো হয়। লিংক খুলে পাসওয়ার্ড ঠিক করলে তবেই অ্যাকাউন্ট তৈরি হয়, তাই কেউ অন্যের ইমেইল দিয়ে সাইন আপ করতে পারে না।',
        ],
      },
    },
  },
  {
    version: '5.155.0',
    date: '2026-10-11',
    text: {
      en: { title: 'A new Bustandeen logo', added: ['A new logo across the app and the website.'] },
      bn: {
        title: 'Bustandeen-এর নতুন লোগো',
        added: ['অ্যাপ ও ওয়েবসাইট জুড়ে নতুন লোগো।'],
      },
    },
  },
  {
    version: '5.153.0',
    date: '2026-10-11',
    text: {
      en: {
        title: 'Read the Quran without an account',
        added: [
          'Browsing the surahs, reading any surah and the listening room no longer ask for an account.',
        ],
      },
      bn: {
        title: 'অ্যাকাউন্ট ছাড়াই কুরআন পড়ুন',
        added: ['সূরার তালিকা দেখা, যেকোনো সূরা পড়া ও শোনার ঘর এখন আর অ্যাকাউন্ট চায় না।'],
      },
    },
  },
];
