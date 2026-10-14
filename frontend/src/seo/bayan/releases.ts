// "What's new" on bayan.bustandeen.com: each release in plain words, newest
// first. Written for the people who use the app, not copied from CHANGELOG.md
// (that one is for developers). Add an entry with every release a user would
// notice; behind-the-scenes releases are left out.
import type { BayanLang } from './guides.js';

export interface ReleaseText {
  title: string;
  added?: string[];
  fixed?: string[];
}

export interface Release {
  version: string; // major.minor shown as "v5.161"
  date: string; // YYYY-MM-DD
  text: Record<BayanLang, ReleaseText>;
}

export const RELEASES: Release[] = [
  {
    version: '5.162',
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
    version: '5.161',
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
    version: '5.160',
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
    version: '5.159',
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
    version: '5.157',
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
    version: '5.156',
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
    version: '5.155',
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
    version: '5.153',
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
