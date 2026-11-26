// "What's new" on bayan.bustandeen.com: each release in plain words, newest
// first. Written for the people who use the app, not copied from CHANGELOG.md
// (that one is for developers). EVERY version bump adds an entry here, in
// English and Bangla: the newest entry must be the app's version (the footer
// shows it), and bayan.test.ts fails the build otherwise.
import type { BayanLang } from './guides.js';

interface ReleaseText {
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
    version: '5.190.70',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: the Home screen tidied up',
        fixed: [
          'We reorganised the code behind the Home screen into smaller pieces so it is easier to maintain. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: হোম পাতার কোড গোছানো হয়েছে',
        fixed: [
          'হোম পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.69',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: a check that your location stays on your device',
        fixed: [
          'We added an automatic check that fails our build if anything could ever send your saved location to our servers. Prayer times are still worked out on your device, and nothing looks or works differently.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: আপনার অবস্থান আপনার ডিভাইসেই থাকে, তার স্বয়ংক্রিয় যাচাই',
        fixed: [
          'আপনার সংরক্ষিত অবস্থান কখনো আমাদের সার্ভারে যাওয়ার মতো কিছু ঘটলে আমাদের বিল্ড ব্যর্থ করে দেবে, এমন একটি স্বয়ংক্রিয় যাচাই যোগ করা হয়েছে। নামাজের সময় আগের মতোই আপনার ডিভাইসে হিসাব করা হয়, আর দেখতে বা কাজে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.67',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: the Quran reader tidied up',
        fixed: [
          'We reorganised the code behind the Quran reading screen into smaller pieces so it is easier to maintain. Nothing looks or works differently, your place and your counts are unchanged, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: কুরআন পাঠের পাতার কোড গোছানো হয়েছে',
        fixed: [
          'কুরআন পড়ার পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার পড়ার জায়গা ও গণনা আগের মতোই আছে, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.66',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: the Rayhanah analytics page tidied up',
        fixed: [
          'We reorganised the code behind the Rayhanah analytics page into smaller pieces so it is easier to maintain. Nothing looks or works differently, your data stays private on your device, and it is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: রায়হানা বিশ্লেষণ পাতার কোড গোছানো হয়েছে',
        fixed: [
          'রায়হানা বিশ্লেষণ পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্য আগের মতোই আপনার ডিভাইসে গোপন থাকে।',
        ],
      },
    },
  },
  {
    version: '5.190.65',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: the Salat analytics page tidied up',
        fixed: [
          'We reorganised the code behind the Salat analytics page into smaller pieces so it is easier to maintain. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: সালাত বিশ্লেষণ পাতার কোড গোছানো হয়েছে',
        fixed: [
          'সালাত বিশ্লেষণ পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.64',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: the Sadaqah admin page tidied up',
        fixed: [
          'We reorganised the code behind the Sadaqah admin page into smaller pieces so it is easier to maintain. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: সদকা অ্যাডমিন পাতার কোড গোছানো হয়েছে',
        fixed: [
          'সদকা অ্যাডমিন পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.63',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: the Zikr analytics page tidied up',
        fixed: [
          'We reorganised the code behind the Zikr analytics page into smaller pieces so it is easier to maintain. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: যিকর বিশ্লেষণ পাতার কোড গোছানো হয়েছে',
        fixed: [
          'যিকর বিশ্লেষণ পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.62',
    date: '2026-11-27',
    text: {
      en: {
        title: 'Behind the scenes: the Settings page tidied up',
        fixed: [
          'We reorganised the code behind the Settings page into smaller pieces so it is easier to maintain. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: সেটিংস পাতার কোড গোছানো হয়েছে',
        fixed: [
          'সেটিংস পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.61',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: the Friends page tidied up',
        fixed: [
          'We reorganised the code behind the Friends page into smaller pieces so it is easier to maintain. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: ফ্রেন্ডস পাতার কোড গোছানো হয়েছে',
        fixed: [
          'ফ্রেন্ডস পাতার পেছনের কোড ছোট ছোট অংশে ভাগ করা হয়েছে, যাতে রক্ষণাবেক্ষণ সহজ হয়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.60',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: preparing to tidy the biggest pages',
        fixed: [
          'We added automatic checks that photograph every main screen before we reorganise the code behind them, so we can prove nothing changes for you. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: বড় পাতাগুলো গোছানোর প্রস্তুতি',
        fixed: [
          'প্রধান পাতাগুলোর পেছনের কোড নতুন করে সাজানোর আগে আমরা প্রতিটি পাতার ছবি তুলে রাখার স্বয়ংক্রিয় যাচাই যোগ করেছি, যাতে আপনার জন্য কিছুই বদলায়নি তা প্রমাণ করা যায়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.59',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: more unused code removed',
        fixed: [
          'We finished clearing out code the server no longer uses, and the automatic checks now guard both the app and the server against it coming back. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: আরও অব্যবহৃত কোড সরানো হয়েছে',
        fixed: [
          'সার্ভার আর যে কোড ব্যবহার করে না তা পুরোপুরি সরানো হয়েছে, আর স্বয়ংক্রিয় যাচাই এখন অ্যাপ ও সার্ভার দুই দিকেই তা ফিরে আসা ঠেকাবে। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.58',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: unused code removed',
        fixed: [
          'We removed code the app no longer uses and added a check so unused code cannot pile up again. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: অব্যবহৃত কোড সরানো হয়েছে',
        fixed: [
          'অ্যাপ আর যে কোড ব্যবহার করে না তা সরিয়ে ফেলা হয়েছে, আর নতুন করে অব্যবহৃত কোড জমে না ওঠার জন্য একটি যাচাই যোগ করা হয়েছে। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.57',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: a tool to find unused code',
        fixed: [
          'We added a tool that lists code nothing uses any more, so the app stays lean and easier to keep correct. It only reports for now. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: অব্যবহৃত কোড খুঁজে বের করার সরঞ্জাম',
        fixed: [
          'আমরা এমন একটি সরঞ্জাম যোগ করেছি যা যে কোডগুলো আর কোথাও ব্যবহার হয় না তার তালিকা দেয়, যাতে অ্যাপ হালকা থাকে এবং ঠিক রাখা সহজ হয়। আপাতত এটি শুধু তালিকা দেখায়। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.56',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: safer page logic',
        fixed: [
          'We reviewed the places where a page updates itself in the background and wrote down why each one is correct. Nothing looks or works differently, and your data is unaffected.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: পাতার ভেতরের কাজে আরও নিরাপত্তা',
        fixed: [
          'যেসব জায়গায় কোনো পাতা নিজে নিজে হালনাগাদ হয় সেগুলো খতিয়ে দেখা হয়েছে এবং প্রতিটি কেন ঠিক তা লিখে রাখা হয়েছে। দেখতে বা কাজে কিছু বদলায়নি, আপনার তথ্যেও কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.55',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Settings, prayer and Quran-goal messages now appear in your language',
        fixed: [
          'Messages in Settings, the Quran reading goal, offline prayer logging and "too many requests" now appear in Bangla if you use Bangla. With this, every message the app shows can follow your language. Your data is unaffected.',
        ],
      },
      bn: {
        title: 'সেটিংস, নামায ও কুরআনের লক্ষ্যের বার্তা এখন আপনার ভাষায়',
        fixed: [
          'সেটিংস, কুরআন পড়ার লক্ষ্য, অফলাইনে নামায লগ করা এবং “অনেকগুলো অনুরোধ” এর বার্তা এখন বাংলা ব্যবহার করলে বাংলায় দেখাবে। এর ফলে অ্যাপের প্রতিটি বার্তাই আপনার ভাষা অনুসরণ করতে পারে। আপনার তথ্যে কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.54',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Cycle and fasting messages now appear in your language',
        fixed: [
          'When something goes wrong while saving in Rayhanah or the fasting tracker, or when you are offline, the message now appears in Bangla if you use Bangla. Your data is unaffected.',
        ],
      },
      bn: {
        title: 'রায়হানাহ ও রোজার বার্তা এখন আপনার ভাষায়',
        fixed: [
          'রায়হানাহ বা রোজা ট্র্যাকারে সংরক্ষণের সময় কিছু ঠিকমতো না হলে, কিংবা আপনি অফলাইনে থাকলে, আপনি বাংলা ব্যবহার করলে এখন বার্তাটি বাংলায় দেখাবে। আপনার তথ্যে কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.53',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Friends messages now appear in your language',
        fixed: [
          'When something goes wrong on the Friends page, such as removing a friend or accepting a request, the message now appears in Bangla if you use Bangla. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'বন্ধুদের পাতার বার্তা এখন আপনার ভাষায়',
        fixed: [
          'বন্ধুদের পাতায় কিছু ঠিকমতো না হলে, যেমন বন্ধু সরানো বা অনুরোধ গ্রহণ করা, আপনি বাংলা ব্যবহার করলে এখন বার্তাটি বাংলায় দেখাবে। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.52',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: tidier code for settings and feedback',
        fixed: [
          'We reorganised how the settings, feedback and prayer-name prompts talk to our servers, so the code is easier to keep correct. They look and work the same. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: সেটিংস ও মতামতের জন্য গোছানো কোড',
        fixed: [
          'সেটিংস, মতামত ও ছোট প্রশ্নের অংশগুলো আমাদের সার্ভারের সঙ্গে যেভাবে যোগাযোগ করে তা নতুন করে সাজানো হয়েছে, যাতে কোড ঠিক রাখা সহজ হয়। দেখতে ও কাজে আগের মতোই। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.51',
    date: '2026-11-26',
    text: {
      en: {
        title: 'One page having a problem no longer stops the whole app',
        fixed: [
          'If a single page runs into a problem, only that page shows a short message. The menu and the rest of the app keep working, and you can try again or go to another page. Your worship data is unaffected.',
        ],
      },
      bn: {
        title: 'একটি পৃষ্ঠায় সমস্যা হলে আর পুরো অ্যাপ থেমে যাবে না',
        fixed: [
          'কোনো একটি পৃষ্ঠায় সমস্যা হলে শুধু সেই পৃষ্ঠায় একটি ছোট বার্তা দেখাবে। মেনু ও অ্যাপের বাকি অংশ চলতেই থাকবে, আর আপনি আবার চেষ্টা করতে বা অন্য পৃষ্ঠায় যেতে পারবেন। আপনার ইবাদতের তথ্যে কোনো প্রভাব পড়ে না।',
        ],
      },
    },
  },
  {
    version: '5.190.50',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: safer code for your counters',
        fixed: [
          'We tidied the code that handles your zikr list and backups so mistakes are caught before they reach you. Your counts and lists work exactly as before. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: আপনার কাউন্টারের জন্য আরও নিরাপদ কোড',
        fixed: [
          'আপনার জিকিরের তালিকা ও ব্যাকআপ সামলানোর কোড গুছিয়ে নেওয়া হয়েছে, যাতে ভুল আপনার কাছে পৌঁছানোর আগেই ধরা পড়ে। আপনার গণনা ও তালিকা আগের মতোই কাজ করে। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.49',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: planning notes saved',
        fixed: [
          'We saved a design sketch for a printable Ramadan sheet with our other planning notes. It is only a sketch and the app does not use it yet. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: পরিকল্পনার নোট সংরক্ষিত',
        fixed: [
          'ছাপার উপযোগী রমজানের ছকের একটি নকশার খসড়া আমাদের অন্যান্য পরিকল্পনার নোটের সঙ্গে সংরক্ষণ করা হয়েছে। এটি শুধু খসড়া, অ্যাপ এখনো এটি ব্যবহার করে না। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.48',
    date: '2026-11-26',
    text: {
      en: {
        title: 'Behind the scenes: guide for builders updated',
        fixed: [
          'We brought the technical guide for people who build and maintain the app up to date, so it matches how the app works today. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: নির্মাতাদের নির্দেশিকা হালনাগাদ',
        fixed: [
          'যাঁরা অ্যাপটি বানান ও দেখভাল করেন তাঁদের জন্য কারিগরি নির্দেশিকা হালনাগাদ করা হয়েছে, যাতে তা আজকের অ্যাপের সঙ্গে মেলে। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.47',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: clear terms for the code',
        fixed: [
          'We added a licence and a security policy to our public code page, so everyone knows how the code may be used and how to report a problem. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: কোডের জন্য স্পষ্ট শর্ত',
        fixed: [
          'আমাদের প্রকাশ্য কোড-পাতায় একটি লাইসেন্স ও নিরাপত্তা-নীতি যোগ করা হয়েছে, যাতে সবাই জানতে পারেন কোড কীভাবে ব্যবহার করা যাবে এবং কোনো সমস্যা কীভাবে জানাতে হবে। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.46',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: safer testing',
        fixed: [
          'We set up a separate practice space for trying new changes, so tests use practice data and never touch yours. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: নিরাপদ পরীক্ষা',
        fixed: [
          'নতুন পরিবর্তন যাচাই করার জন্য আলাদা একটি অনুশীলন-ক্ষেত্র তৈরি হয়েছে। পরীক্ষায় শুধু নমুনা তথ্য ব্যবহার হয়, আপনার তথ্যে হাত পড়ে না। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.45',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: counter engine updated',
        fixed: [
          'We updated the part of the app that keeps your counters and settings in memory. We checked how it is used, and your counts and settings work as before. Nothing in your data changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: কাউন্টারের ইঞ্জিন হালনাগাদ',
        fixed: [
          'অ্যাপের যে অংশ আপনার কাউন্টার ও সেটিংস মনে রাখে সেটি হালনাগাদ করা হয়েছে। কীভাবে ব্যবহার হচ্ছে তা যাচাই করা হয়েছে, আপনার গণনা ও সেটিংস আগের মতোই কাজ করে। আপনার তথ্যে কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.44',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: translation tools updated',
        fixed: [
          'We updated the tools that show the app in English and Bangla. Nothing should look different, and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: অনুবাদ টুল হালনাগাদ',
        fixed: [
          'অ্যাপ ইংরেজি ও বাংলায় দেখানোর টুলগুলো হালনাগাদ করা হয়েছে। দেখতে কিছু আলাদা হওয়ার কথা নয়, আর আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.43',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: updated test tools',
        fixed: [
          'We updated the tools we use to test our file-storage safety rules. Nothing changes in the app and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: হালনাগাদ পরীক্ষার টুল',
        fixed: [
          'ফাইল সংরক্ষণের নিরাপত্তা নিয়ম পরীক্ষা করার জন্য যে টুল ব্যবহার করি তা হালনাগাদ করা হয়েছে। অ্যাপে কিছু বদলায়নি এবং আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.42',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: up-to-date build tools',
        fixed: [
          'We updated the automatic tools that check each update before it reaches you. Nothing changes in the app and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: হালনাগাদ বিল্ড টুল',
        fixed: [
          'প্রতিটি আপডেট আপনার কাছে পৌঁছানোর আগে যে স্বয়ংক্রিয় টুল তা যাচাই করে, সেগুলো হালনাগাদ করা হয়েছে। অ্যাপে কিছু বদলায়নি এবং আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.41',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: a lighter toolbox',
        fixed: [
          'We removed a development tool that nothing was using. Nothing changes in the app and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: হালকা টুলবক্স',
        fixed: [
          'আমরা এমন একটি ডেভেলপমেন্ট টুল সরিয়ে দিয়েছি যা কেউ ব্যবহার করছিল না। অ্যাপে কিছু বদলায়নি এবং আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.40',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: exact package versions',
        fixed: [
          'When the app is built for the website, it now uses exactly the package versions we tested, instead of whatever is newest. Nothing changes in the app and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: নির্দিষ্ট প্যাকেজ সংস্করণ',
        fixed: [
          'ওয়েবসাইটের জন্য অ্যাপ তৈরির সময় এখন আমরা যে প্যাকেজ সংস্করণগুলো পরীক্ষা করেছি ঠিক সেগুলোই ব্যবহার হয়, নতুনতম যেটা পাওয়া যায় সেটা নয়। অ্যাপে কিছু বদলায়নি এবং আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.39',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: stronger safety checks',
        fixed: [
          'We tightened the automatic safety checks that run before every update, including a scan for accidentally exposed secrets. Nothing changes in the app and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: আরও শক্ত নিরাপত্তা যাচাই',
        fixed: [
          'প্রতিটি আপডেটের আগে যে স্বয়ংক্রিয় নিরাপত্তা যাচাই চলে তা আরও কঠোর করা হয়েছে, এর মধ্যে ভুলবশত প্রকাশ হয়ে যাওয়া গোপন তথ্যের স্ক্যানও আছে। অ্যাপে কিছু বদলায়নি এবং আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.38',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: safer data tools',
        fixed: [
          'We added a safer way for us to make changes to stored data, with a practice run first, and a guard so a tool cannot change live data by accident. Nothing changes in the app and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: আরও নিরাপদ ডেটা টুল',
        fixed: [
          'সংরক্ষিত তথ্যে পরিবর্তন আনার জন্য আমরা আরও নিরাপদ একটি পদ্ধতি যোগ করেছি, যেখানে আগে একটি মহড়া চলে, আর ভুলবশত আসল তথ্য বদলে ফেলা ঠেকাতে একটি সুরক্ষা আছে। অ্যাপে কিছু বদলায়নি এবং আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.37',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Behind the scenes: steadier checks',
        fixed: [
          'We made the checks we run before every update use the same exact tool version everywhere. Nothing changes in the app and your data is untouched.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে: আরও স্থির যাচাই',
        fixed: [
          'প্রতিটি আপডেটের আগে আমরা যে যাচাই চালাই, তা এখন সব জায়গায় একই সংস্করণের টুলে চলে। অ্যাপে কিছু বদলায়নি এবং আপনার তথ্য অপরিবর্তিত।',
        ],
      },
    },
  },
  {
    version: '5.190.36',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Prayer days: checked, nothing changes',
        fixed: [
          'We checked that a prayer you log after midnight but before Fajr, such as Isha at 1 AM, counts for the day before. It already did, in all three day-start choices.',
          'We added tests so this stays true. Your saved prayers were not changed.',
        ],
      },
      bn: {
        title: 'নামাজের দিন: যাচাই করা হয়েছে, কিছু বদলায়নি',
        fixed: [
          'মধ্যরাতের পরে কিন্তু ফজরের আগে, যেমন রাত ১টায় ইশার নামাজ লগ করলে সেটি আগের দিনের হিসাবে যায় কি না যাচাই করা হয়েছে। দিন শুরুর তিনটি পছন্দেই এটি আগে থেকেই ঠিক ছিল।',
          'এটি যাতে ঠিক থাকে সেজন্য পরীক্ষা যোগ করা হয়েছে। আপনার সংরক্ষিত নামাজের হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.35',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Zikr counts when the app is open in two tabs',
        fixed: [
          'If Bustandeen is open in two tabs or windows, your zikr taps can no longer be counted twice. Each tab now looks after its own unsent taps.',
          'If a tab closes before its taps are saved, another open tab or your next visit sends them once, on the right day.',
          'Your saved counts were not changed.',
        ],
      },
      bn: {
        title: 'দুটি ট্যাবে অ্যাপ খোলা থাকলে যিকিরের গণনা',
        fixed: [
          'বুস্তানদীন দুটি ট্যাব বা উইন্ডোতে খোলা থাকলে আপনার যিকিরের গণনা আর দুবার যোগ হবে না। এখন প্রতিটি ট্যাব নিজের না-পাঠানো গণনা নিজে সামলায়।',
          'কোনো ট্যাব গণনা সংরক্ষণের আগেই বন্ধ হয়ে গেলে, খোলা থাকা অন্য ট্যাব বা আপনার পরের বার ঢোকার সময় সেটি ঠিক দিনে একবারই পাঠানো হয়।',
          'আপনার সংরক্ষিত কোনো গণনা বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.34',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Safer admin tools behind the scenes',
        fixed: [
          'Our team panel now asks for a fresh password before deleting messages, and asks "are you sure?" before changing what the public sees.',
          'A past announcement banner can be reopened, edited and published again in a few taps.',
          'Nothing in your own records changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে আরও নিরাপদ অ্যাডমিন টুল',
        fixed: [
          'আমাদের টিমের প্যানেল এখন বার্তা মুছে ফেলার আগে নতুন করে পাসওয়ার্ড চায়, আর সবাই যা দেখে তা বদলানোর আগে "আপনি কি নিশ্চিত?" জিজ্ঞেস করে।',
          'আগের কোনো ঘোষণার ব্যানার আবার খুলে সম্পাদনা করে কয়েকটি ট্যাপেই নতুন করে প্রকাশ করা যায়।',
          'আপনার নিজের সংরক্ষিত তথ্যে কোনো পরিবর্তন হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.33',
    date: '2026-11-25',
    text: {
      en: {
        title: 'The visit-counting question is in English and Bangla',
        fixed: [
          'The small question about counting visits to our public pages now shows in English or Bangla only. The Arabic wording is removed until a native reader has checked it.',
          'Nothing about your choice or your saved records changed.',
        ],
      },
      bn: {
        title: 'ভিজিট গণনার প্রশ্নটি এখন ইংরেজি ও বাংলায়',
        fixed: [
          'আমাদের পাবলিক পাতার ভিজিট গণনার ছোট প্রশ্নটি এখন শুধু ইংরেজি বা বাংলায় দেখানো হয়। আরবি লেখাটি সরানো হয়েছে, কোনো আরবি-ভাষী পাঠক দেখে দেওয়ার আগে তা ফেরানো হবে না।',
          'আপনার দেওয়া উত্তর বা সংরক্ষিত তথ্যে কোনো পরিবর্তন হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.32',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Hifz: a few small fixes',
        fixed: [
          'Your daily Hifz goal and streak are now counted on the same day the screen shows, including in the evening and after midnight.',
          'The "next ayah" button now always adds a new ayah. It skips ones already in your list.',
          'Tapping twice quickly no longer causes an error, and an ayah number that does not exist in a surah is no longer accepted.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'হিফজ: কিছু ছোট সংশোধন',
        fixed: [
          'আপনার দৈনিক হিফজ লক্ষ্য ও ধারা এখন ঠিক সেই দিনেই গোনা হয় যে দিন স্ক্রিনে দেখানো হয়, সন্ধ্যায় এবং মধ্যরাতের পরেও।',
          '"পরের আয়াত" বোতাম এখন সবসময় নতুন একটি আয়াত যোগ করে। আপনার তালিকায় থাকা আয়াত এড়িয়ে যায়।',
          'দ্রুত দুবার চাপলে আর ত্রুটি হয় না, আর কোনো সূরায় নেই এমন আয়াত নম্বর এখন গ্রহণ করা হয় না।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.31',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Visit counting now starts only if you say yes',
        added: [
          'A small note now asks once whether we may count visits to our public pages. If you say no, or do not answer, nothing is loaded from Google and no cookie is set.',
          'You can change your mind at any time in Settings, under Accessibility.',
        ],
        fixed: ['Nothing in your saved records was changed.'],
      },
      bn: {
        title: 'ভিজিট গণনা এখন শুধু আপনি হ্যাঁ বললেই শুরু হয়',
        added: [
          'একটি ছোট বার্তা এখন একবার জিজ্ঞাসা করে আমরা আমাদের পাবলিক পাতার ভিজিট গুনতে পারি কি না। আপনি না বললে বা উত্তর না দিলে Google থেকে কিছুই লোড হয় না এবং কোনো কুকি বসানো হয় না।',
          'আপনি যেকোনো সময় সেটিংসের অ্যাক্সেসিবিলিটি অংশে মত বদলাতে পারেন।',
        ],
        fixed: ['আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।'],
      },
    },
  },
  {
    version: '5.190.30',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Restoring a backup is checked before the file is read',
        fixed: [
          'When you restore a backup file, the app now confirms it is you, and that you have not restored too many times, before it reads the file. A file that is not a Bustandeen backup is turned away with a clear message.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'ব্যাকআপ ফাইল পড়ার আগেই যাচাই করা হয়',
        fixed: [
          'ব্যাকআপ ফাইল পুনরুদ্ধার করার সময় অ্যাপ এখন ফাইল পড়ার আগেই নিশ্চিত করে নেয় যে এটি আপনি, এবং আপনি অনেকবার পুনরুদ্ধার করেননি। বুস্তানদীনের ব্যাকআপ নয় এমন ফাইল পরিষ্কার বার্তা দিয়ে ফিরিয়ে দেওয়া হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.29',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Stronger new passwords, and a signed-out device stays signed out',
        fixed: [
          'New passwords now need at least 8 characters. If your password is shorter, you can still sign in with it as usual.',
          'If you reset your password or sign out everywhere, sensitive actions such as exporting or deleting your data now ask you to sign in again on a device that was signed out.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'নতুন পাসওয়ার্ড আরও শক্ত, আর সাইন-আউট হওয়া ডিভাইস সাইন-আউটই থাকে',
        fixed: [
          'নতুন পাসওয়ার্ড এখন কমপক্ষে ৮ অক্ষরের হতে হবে। আপনার পাসওয়ার্ড ছোট হলেও আগের মতোই সাইন ইন করতে পারবেন।',
          'পাসওয়ার্ড রিসেট বা সব জায়গা থেকে সাইন-আউট করলে, যে ডিভাইস সাইন-আউট হয়েছে সেখানে ডেটা এক্সপোর্ট বা মুছে ফেলার মতো সংবেদনশীল কাজে এখন আবার সাইন ইন করতে বলা হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.28',
    date: '2026-11-25',
    text: {
      en: {
        title: 'Connecting Google is now checked more carefully',
        fixed: [
          'When you connect your Google account, the app now confirms which Google account you really connected, instead of relying on what your device reports.',
          'Nothing in your saved records was changed, and accounts already connected stay as they are.',
        ],
      },
      bn: {
        title: 'গুগল সংযোগ এখন আরও যত্নে যাচাই হয়',
        fixed: [
          'আপনি গুগল অ্যাকাউন্ট যুক্ত করলে অ্যাপ এখন আপনার ডিভাইসের দেওয়া তথ্যের ওপর নির্ভর না করে নিজে যাচাই করে দেখে আসলে কোন গুগল অ্যাকাউন্টটি যুক্ত হয়েছে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি, আর আগে যুক্ত করা অ্যাকাউন্ট যেমন ছিল তেমনই থাকে।',
        ],
      },
    },
  },
  {
    version: '5.190.27',
    date: '2026-11-24',
    text: {
      en: {
        title: 'Small safety clean-ups on public pages and offline saving',
        fixed: [
          'Hidden page information for search engines is now written in a way that cannot break the page, whatever the text says.',
          'Offline saving of Quran text now keeps only complete, successful answers, so a failed answer is never kept by mistake.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'পাবলিক পাতা ও অফলাইন সংরক্ষণে ছোট নিরাপত্তা পরিষ্কার',
        fixed: [
          'সার্চ ইঞ্জিনের জন্য পাতার লুকানো তথ্য এখন এমনভাবে লেখা হয় যাতে লেখা যা-ই হোক পাতা ভেঙে না যায়।',
          'কুরআনের লেখা অফলাইনে সংরক্ষণে এখন শুধু সম্পূর্ণ ও সফল উত্তর রাখা হয়, তাই ব্যর্থ উত্তর ভুলে রয়ে যায় না।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.26',
    date: '2026-11-24',
    text: {
      en: {
        title: 'Safer source links on zikr',
        fixed: [
          'Source links on suggested zikr and dua must now be secure web addresses starting with https://. Anything else is not accepted, and is never shown as a link.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'যিকরের সূত্র লিঙ্ক আরও নিরাপদ',
        fixed: [
          'প্রস্তাবিত যিকর ও দোয়ার সূত্র লিঙ্ক এখন https:// দিয়ে শুরু হওয়া নিরাপদ ওয়েব ঠিকানা হতে হবে। অন্য কিছু গ্রহণ করা হয় না, আর কখনো লিঙ্ক হিসেবে দেখানোও হয় না।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.25',
    date: '2026-11-24',
    text: {
      en: {
        title: 'Less kept in our server logs',
        fixed: [
          'Our server no longer writes a line for every visit. It now notes only failed requests, and only the kind of page, the result and how long it took. No page address, IP address, browser or account.',
          'The privacy page now says this.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'আমাদের সার্ভার লগে আরও কম তথ্য থাকে',
        fixed: [
          'আমাদের সার্ভার এখন প্রতিটি ভিজিটের জন্য লাইন লেখে না। শুধু ব্যর্থ অনুরোধ লেখা হয়, আর তাতে থাকে কেবল পাতার ধরন, ফলাফল ও কত সময় লেগেছে। কোনো পেজের ঠিকানা, আইপি ঠিকানা, ব্রাউজার বা অ্যাকাউন্ট থাকে না।',
          'গোপনীয়তা পাতায় এখন এটি লেখা আছে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.24',
    date: '2026-11-24',
    text: {
      en: {
        title: 'Naseeh is steadier and more careful',
        fixed: [
          'If the AI companion is slow to answer, the app now stops waiting after a few seconds and shows the usual plain message instead.',
          'Saving your own AI key is now limited to a few times an hour.',
          'The weekly reflection now only uses your own numbers.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'নাসীহ এখন আরও স্থিতিশীল ও সতর্ক',
        fixed: [
          'এআই সঙ্গী উত্তর দিতে দেরি করলে অ্যাপ এখন কয়েক সেকেন্ড পরে অপেক্ষা থামিয়ে সাধারণ বার্তাটি দেখায়।',
          'নিজের এআই কী সংরক্ষণ এখন ঘণ্টায় কয়েকবারের মধ্যে সীমিত।',
          'সাপ্তাহিক প্রতিফলনে এখন শুধু আপনার নিজের সংখ্যাগুলো ব্যবহার হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.23',
    date: '2026-11-20',
    text: {
      en: {
        title: 'A small limit on zikr suggestions',
        fixed: [
          "You can now send up to five zikr or dua suggestions a day. This keeps the review team's inbox calm so each suggestion gets a careful look.",
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'যিকর প্রস্তাবে সামান্য সীমা',
        fixed: [
          'আপনি এখন দিনে পাঁচটি পর্যন্ত যিকর বা দোয়ার প্রস্তাব পাঠাতে পারবেন। এতে পর্যালোচনা দলের ইনবক্স শান্ত থাকে এবং প্রতিটি প্রস্তাব যত্ন নিয়ে দেখা যায়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.22',
    date: '2026-11-20',
    text: {
      en: {
        title: 'Your private notes are better protected',
        fixed: [
          'Private Rayhanah notes and your own saved AI key are now locked to your account, so they cannot be opened if copied somewhere else.',
          'If a private note ever cannot be read, the app now stops instead of replacing it with a blank one.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'আপনার ব্যক্তিগত নোট আরও ভালোভাবে সুরক্ষিত',
        fixed: [
          'রায়হানার ব্যক্তিগত নোট এবং আপনার নিজের সংরক্ষিত AI কী এখন আপনার অ্যাকাউন্টের সাথে বাঁধা, তাই অন্য কোথাও কপি করলে তা খোলা যাবে না।',
          'কোনো ব্যক্তিগত নোট কখনো পড়া না গেলে অ্যাপ এখন সেটি ফাঁকা নোট দিয়ে বদলে না দিয়ে থেমে যায়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.21',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Your first day is now counted correctly in the Americas',
        fixed: [
          'If you started using the app in the evening in a place west of Greenwich, such as the Americas, the first day could be skipped when counting missed prayers. It now starts from your own first day.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'আমেরিকা অঞ্চলে আপনার প্রথম দিন এখন ঠিকভাবে গণনা হয়',
        fixed: [
          'গ্রিনিচের পশ্চিমে, যেমন আমেরিকায়, সন্ধ্যায় অ্যাপ ব্যবহার শুরু করলে ছুটে যাওয়া নামাজ গোনার সময় প্রথম দিনটি বাদ পড়তে পারত। এখন আপনার নিজের প্রথম দিন থেকেই গণনা শুরু হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.20',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Your charts and kaza pages load faster for long histories',
        fixed: [
          'The missed-prayer chart, the kaza insights and the rest-day check now do their sums more efficiently, so they stay quick even after years of use.',
          'Every number shown is the same as before. Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'দীর্ঘ ইতিহাস থাকলেও আপনার চার্ট ও কাজা পাতা দ্রুত খোলে',
        fixed: [
          'ছুটে যাওয়া নামাজের চার্ট, কাজার অন্তর্দৃষ্টি এবং বিশ্রামের দিনের যাচাই এখন আরও দক্ষভাবে হিসাব করে, তাই বছরের পর বছর ব্যবহারের পরেও দ্রুত থাকে।',
          'দেখানো প্রতিটি সংখ্যা আগের মতোই। আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.19',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Donation records are no longer erased for good',
        fixed: [
          'When an administrator removes a donation entry, the record is now kept with who removed it and when, instead of disappearing. It stays hidden from every list and total.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'অনুদানের রেকর্ড আর চিরতরে মুছে যায় না',
        fixed: [
          'কোনো প্রশাসক অনুদানের এন্ট্রি সরালে এখন রেকর্ডটি হারিয়ে না গিয়ে কে কখন সরিয়েছেন সেই তথ্যসহ রাখা হয়। এটি সব তালিকা ও মোট থেকে লুকানো থাকে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.18',
    date: '2026-11-17',
    text: {
      en: {
        title: 'A few lists now have sensible limits',
        fixed: [
          'Your zikr list can hold up to 200 names, your waiting friend requests up to 100, and your blocked list up to 500. These are far above normal use. If you ever reach one, the app tells you plainly.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'কয়েকটি তালিকার এখন যুক্তিসঙ্গত সীমা আছে',
        fixed: [
          'আপনার যিকিরের তালিকায় সর্বোচ্চ ২০০টি নাম, অপেক্ষমাণ বন্ধুর অনুরোধ সর্বোচ্চ ১০০টি এবং ব্লক তালিকায় সর্বোচ্চ ৫০০ জন থাকতে পারে। এগুলো স্বাভাবিক ব্যবহারের চেয়ে অনেক বেশি। কখনো সীমায় পৌঁছালে অ্যাপ স্পষ্ট করে জানাবে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.17',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Deleting your account now clears more',
        fixed: [
          'When you delete your account, the network address saved with a donation is now removed, and anyone who had linked you as their partner no longer points to you.',
          'If something goes wrong part-way through deleting, your account stays so you can simply delete again and finish.',
          'The privacy page now says this.',
        ],
      },
      bn: {
        title: 'অ্যাকাউন্ট মুছলে এখন আরও কিছু মুছে যায়',
        fixed: [
          'আপনি অ্যাকাউন্ট মুছলে দানের সঙ্গে সংরক্ষিত নেটওয়ার্ক ঠিকানা এখন মুছে ফেলা হয়, আর যিনি আপনাকে সঙ্গী হিসেবে যুক্ত করেছিলেন তাঁর প্রোফাইল আর আপনার দিকে নির্দেশ করে না।',
          'মুছে ফেলার মাঝপথে কোনো সমস্যা হলে আপনার অ্যাকাউন্ট থেকে যায়, যাতে আপনি আবার মুছে সম্পন্ন করতে পারেন।',
          'গোপনীয়তা পাতায় এখন এ কথা লেখা আছে।',
        ],
      },
    },
  },
  {
    version: '5.190.16',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Retried saves are now recognised in more places',
        fixed: [
          'If a save reached our server but the reply was lost, and the app tried again, a few kinds of saves could be applied twice. Paying back a missed prayer, adding to your hifz, reviewing a hifz entry and correcting a day of zikr are now protected the same way as your other counts.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'আবার পাঠানো সংরক্ষণ এখন আরও জায়গায় চিনে নেওয়া হয়',
        fixed: [
          'কোনো সংরক্ষণ আমাদের সার্ভারে পৌঁছালেও উত্তর হারিয়ে গেলে এবং অ্যাপ আবার চেষ্টা করলে কয়েক ধরনের সংরক্ষণ দুইবার প্রযুক্ত হতে পারত। ছুটে যাওয়া নামাজ পূরণ করা, হিফয যোগ করা, হিফযের পুনরাবৃত্তি লেখা এবং কোনো দিনের যিকির সংশোধন এখন আপনার অন্য গণনার মতোই সুরক্ষিত।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.15',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Friend requests, zikr renames and donation totals are safer',
        fixed: [
          'Accepting two friend requests at the same moment can no longer go past the 50-friend limit, and a request can no longer end up half accepted.',
          'Renaming a zikr now moves its name, total and history together, so a problem part-way cannot leave them apart.',
          'Behind the scenes, verifying or removing a donation now updates the public total at the same time as the donation itself.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'বন্ধুর অনুরোধ, যিকিরের নাম বদল ও অনুদানের মোট এখন আরও নিরাপদ',
        fixed: [
          'একই মুহূর্তে দুটি বন্ধুর অনুরোধ গ্রহণ করলেও এখন ৫০ বন্ধুর সীমা ছাড়ানো যায় না, আর কোনো অনুরোধ অর্ধেক গৃহীত অবস্থায় থেকে যায় না।',
          'যিকিরের নাম বদলালে এখন নাম, মোট সংখ্যা ও ইতিহাস একসঙ্গে সরে যায়, তাই মাঝপথে সমস্যা হলে সেগুলো আলাদা হয়ে পড়ে না।',
          'পর্দার আড়ালে, কোনো অনুদান যাচাই বা মুছে ফেললে এখন অনুদানের সঙ্গেই প্রকাশ্য মোটও একসঙ্গে হালনাগাদ হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.14',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Rayhanah can no longer start two cycles at once',
        fixed: [
          'If you tapped "My period started" twice quickly, or on two devices at the same moment, Rayhanah could end up with two cycles open at once. Only one can be open now, and you get a clear message if one is already running.',
          'Restoring a backup that held two open cycles keeps the most recent one.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'রায়হানায় এখন একসঙ্গে দুটি চক্র শুরু হতে পারে না',
        fixed: [
          '"আমার মাসিক শুরু হয়েছে" দ্রুত দুইবার চাপলে বা একই সময়ে দুই ডিভাইস থেকে চাপলে রায়হানায় একসঙ্গে দুটি চক্র চালু থাকতে পারত। এখন একটিই চালু থাকতে পারে, আর একটি চলমান থাকলে স্পষ্ট বার্তা দেখানো হয়।',
          'দুটি চালু চক্র থাকা ব্যাকআপ পুনরুদ্ধার করলে সবচেয়ে সাম্প্রতিকটি রাখা হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.13',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Restoring a backup is now safer',
        fixed: [
          'When you restore a backup file, the app now checks every date and number in it first, and leaves out anything that makes no sense instead of saving it.',
          'A restore now happens all at once. If something goes wrong part-way, your records stay exactly as they were, instead of being left half replaced.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'ব্যাকআপ পুনরুদ্ধার এখন আরও নিরাপদ',
        fixed: [
          'ব্যাকআপ ফাইল পুনরুদ্ধারের সময় অ্যাপ এখন তার প্রতিটি তারিখ ও সংখ্যা আগে যাচাই করে, এবং যা অর্থহীন তা সংরক্ষণ না করে বাদ দেয়।',
          'পুনরুদ্ধার এখন একসঙ্গে সম্পন্ন হয়। মাঝপথে কিছু ভুল হলে আপনার হিসাব ঠিক আগের মতোই থাকে, অর্ধেক বদলানো অবস্থায় পড়ে থাকে না।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.12',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Signing out now warns you about changes that are not saved yet',
        fixed: [
          'If you had counts or prayer updates that were still waiting to be saved and you signed out, they were lost without telling you what. The sign-out screen now shows what is waiting and offers to save it first.',
          'If it cannot be saved because you are offline, you can try again, cancel, or sign out anyway.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'সাইন আউটের সময় এখন সংরক্ষিত না হওয়া পরিবর্তনের কথা জানানো হয়',
        fixed: [
          'সংরক্ষণের অপেক্ষায় থাকা গণনা বা নামাজের পরিবর্তন থাকা অবস্থায় সাইন আউট করলে সেগুলো কী ছিল না জানিয়েই হারিয়ে যেত। এখন সাইন আউটের পর্দায় কী অপেক্ষা করছে তা দেখানো হয় এবং আগে সেগুলো সংরক্ষণ করার সুযোগ দেওয়া হয়।',
          'ইন্টারনেট না থাকায় সংরক্ষণ করা না গেলে আপনি আবার চেষ্টা করতে পারেন, বাতিল করতে পারেন, অথবা তবুও সাইন আউট করতে পারেন।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.11',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Changes you make offline are no longer lost when the server is busy',
        fixed: [
          'If you marked a prayer or logged something while offline, and the server was busy or briefly unavailable when the app tried to send it, that change could be lost. It is now kept and sent again by itself after a short wait.',
          'If your changes stay unsent for a while, you now see a calm message, and it goes away once everything is saved.',
          'A prayer update that can never be saved now tells you, so you can mark it again.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'অফলাইনে করা পরিবর্তন সার্ভার ব্যস্ত থাকলেও আর হারাবে না',
        fixed: [
          'অফলাইনে থাকার সময় কোনো নামাজ চিহ্নিত করলে বা কিছু লিখলে, পাঠানোর সময় সার্ভার ব্যস্ত থাকলে বা কিছুক্ষণ না পাওয়া গেলে সেই পরিবর্তন হারিয়ে যেতে পারত। এখন তা রেখে দেওয়া হয় এবং অল্প অপেক্ষার পর নিজে থেকেই আবার পাঠানো হয়।',
          'আপনার পরিবর্তন কিছুক্ষণ পাঠানো না গেলে এখন একটি শান্ত বার্তা দেখা যায়, আর সব সংরক্ষিত হয়ে গেলে তা সরে যায়।',
          'কোনো নামাজের পরিবর্তন কখনোই সংরক্ষণ করা না গেলে এখন তা জানানো হয়, যাতে আপনি আবার চিহ্নিত করতে পারেন।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.10',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Your missed-prayer count is safer after a long break',
        fixed: [
          'When you open the app after days away, it counts the prayers you did not mark. If something went wrong while it was counting, those days could be skipped for good. It now counts in steps and only moves on when each step is saved, so it picks up where it stopped.',
          'If the counting fails, your prayer pages still open normally and it tries again next time.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'দীর্ঘ বিরতির পর কাজা নামাজের হিসাব এখন আরও নিরাপদ',
        fixed: [
          'কয়েক দিন পর অ্যাপ খুললে আপনি যে নামাজগুলো চিহ্নিত করেননি, অ্যাপ তা গুনে নেয়। গুনতে গিয়ে কিছু ভুল হলে সেই দিনগুলো চিরতরে বাদ পড়ে যেতে পারত। এখন ধাপে ধাপে গোনা হয় এবং প্রতিটি ধাপ সংরক্ষিত হলেই পরেরটিতে যাওয়া হয়, তাই যেখানে থেমেছিল সেখান থেকেই আবার শুরু হয়।',
          'গণনা ব্যর্থ হলেও আপনার নামাজের পাতা স্বাভাবিকভাবেই খোলে এবং পরের বার আবার চেষ্টা করা হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.9',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Missed prayers are no longer counted twice',
        fixed: [
          'If you marked a prayer as missed with a fast double tap, or from two devices at the same moment, it could be added to your kaza count more than once. It is now counted once.',
          'Marking a prayer on a day that has no record yet could sometimes fail with an error. That is fixed.',
          'Nothing in your saved records was changed. If an earlier double count is in your kaza total, you can still correct it with Set exact count.',
        ],
      },
      bn: {
        title: 'কাজা নামাজ আর দুইবার গণনা হবে না',
        fixed: [
          'দ্রুত দুইবার চাপ দিয়ে বা একই সময়ে দুই ডিভাইস থেকে কোনো নামাজ ছুটে গেছে বলে চিহ্নিত করলে তা আপনার কাজার হিসাবে একাধিকবার যোগ হতে পারত। এখন একবারই গণনা হয়।',
          'যে দিনের কোনো রেকর্ড এখনো নেই সেই দিনে নামাজ চিহ্নিত করতে গিয়ে কখনো কখনো ত্রুটি আসত। তা ঠিক করা হয়েছে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি। আগের কোনো দ্বিগুণ গণনা কাজার মোটে থেকে থাকলে “সঠিক সংখ্যা সেট করুন” দিয়ে তা ঠিক করে নিতে পারবেন।',
        ],
      },
    },
  },
  {
    version: '5.190.8',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Zikr counts are no longer lost at the start of a new day',
        fixed: [
          'If the day changed (at Fajr by default) while some of your zikr taps were still waiting to be sent, those taps could disappear. They are now sent as the day they were counted on.',
          'If your device date was wrong, your taps used to vanish. They are now kept, and you are asked to fix the date. If a count can never be saved, you are now told how many were affected.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'নতুন দিন শুরুর সময় যিকিরের গণনা আর হারাবে না',
        fixed: [
          'পাঠানোর অপেক্ষায় থাকা যিকিরের গণনা থাকতে দিন বদলে গেলে (ডিফল্টে ফজরে) সেই গণনা হারিয়ে যেতে পারত। এখন সেগুলো যে দিনে গণনা হয়েছিল সেই দিনেই পাঠানো হয়।',
          'ডিভাইসের তারিখ ভুল থাকলে আপনার গণনা আগে হারিয়ে যেত। এখন তা রেখে দেওয়া হয় এবং তারিখ ঠিক করতে বলা হয়। কোনো গণনা কখনোই সংরক্ষণ করা না গেলে এখন জানানো হয় কতগুলো গণনা প্রভাবিত হয়েছে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.7',
    date: '2026-11-17',
    text: {
      en: {
        title: 'Zikr counts are safer when you close the app',
        fixed: [
          'If you closed the tab or app right after counting, the same zikr could be counted twice the next time you opened it. Your taps are now saved to your device before they are sent, so they are counted once.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'অ্যাপ বন্ধ করলেও যিকিরের গণনা এখন আরও নিরাপদ',
        fixed: [
          'গণনার ঠিক পরে ট্যাব বা অ্যাপ বন্ধ করলে পরের বার খুললে একই যিকির দুইবার গণনা হতে পারত। এখন আপনার গণনা পাঠানোর আগেই ডিভাইসে সংরক্ষণ করা হয়, তাই তা একবারই গণনা হবে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.6',
    date: '2026-11-16',
    text: {
      en: {
        title: 'Buttons now match what you see',
        fixed: [
          'Several buttons now have names that match the words drawn on them, such as the days in the week strips and the zikr shortcuts on Home. This helps voice control (say what you see) and screen readers.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'বোতামের নাম এখন পর্দায় যা দেখেন তার সঙ্গে মেলে',
        fixed: [
          'সপ্তাহের দিনের সারি এবং হোমের যিকিরের শর্টকাটের মতো কয়েকটি বোতামের নাম এখন তাতে লেখা শব্দের সঙ্গে মেলে। এতে ভয়েস কন্ট্রোল (যা দেখছেন তা বলুন) ও স্ক্রিন রিডারে সুবিধা হয়।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.5',
    date: '2026-11-16',
    text: {
      en: {
        title: 'Behind-the-scenes check for your records',
        fixed: [
          'We added a private check that helps us find any prayer records that an earlier wrong device date may have affected, so we can look after them properly.',
          'Nothing you see in the app changes, and nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'আপনার হিসাবের জন্য পর্দার আড়ালে একটি যাচাই',
        fixed: [
          'আগে ডিভাইসের তারিখ ভুল থাকার কারণে যে নামাজের হিসাবগুলো প্রভাবিত হয়ে থাকতে পারে, সেগুলো খুঁজে বের করার জন্য আমরা একটি ব্যক্তিগত যাচাই যোগ করেছি, যাতে সেগুলোর যত্ন নেওয়া যায়।',
          'অ্যাপে আপনি যা দেখেন তাতে কোনো পরিবর্তন নেই, এবং আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.4',
    date: '2026-11-16',
    text: {
      en: {
        title: 'A clear message when your device date is wrong',
        fixed: [
          'If the date on your device is wrong, Bustandeen now tells you, instead of leaving screens empty or a count unsaved. Set the date and time on your device to automatic and it works as before.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'ডিভাইসের তারিখ ভুল থাকলে এখন পরিষ্কার বার্তা',
        fixed: [
          'আপনার ডিভাইসের তারিখ ভুল থাকলে বুস্তানদীন এখন তা জানিয়ে দেয়। আগে পর্দা খালি থাকত বা গণনা সংরক্ষণ হতো না, কিছুই বলা হতো না। ডিভাইসের তারিখ ও সময় স্বয়ংক্রিয় করে নিলে সব আগের মতোই চলবে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.3',
    date: '2026-11-16',
    text: {
      en: {
        title: 'A safety fix behind the scenes',
        fixed: [
          "The server now ignores any extra information sent along with a request that it did not ask for. This is a security tightening for the app's administrators.",
          'Nothing you see in the app changes, and nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'পর্দার আড়ালে একটি নিরাপত্তা সংশোধন',
        fixed: [
          'অনুরোধের সঙ্গে সার্ভারের চাওয়া হয়নি এমন বাড়তি তথ্য এলে সার্ভার এখন সেটি উপেক্ষা করে। এটি অ্যাপের প্রশাসকদের জন্য একটি নিরাপত্তা জোরদার করা।',
          'অ্যাপে আপনি যা দেখেন তাতে কোনো পরিবর্তন নেই, এবং আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.2',
    date: '2026-11-16',
    text: {
      en: {
        title: 'Zikr and Quran saves can no longer count twice',
        fixed: [
          'If saving your zikr or Quran reading failed part-way and the app tried again, the same count could be added twice. A save now either goes through completely or not at all, so your totals stay true to what you did.',
          'Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'যিকির ও কুরআনের হিসাব আর দুইবার গণনা হবে না',
        fixed: [
          'যিকির বা কুরআন পড়ার হিসাব সংরক্ষণ মাঝপথে ব্যর্থ হলে এবং অ্যাপ আবার চেষ্টা করলে একই গণনা দুইবার যোগ হতে পারত। এখন একটি সংরক্ষণ হয় পুরোপুরি হবে, নয়তো মোটেই হবে না। তাই আপনার মোট সংখ্যা আপনি যা করেছেন তা-ই থাকবে।',
          'আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.1',
    date: '2026-11-16',
    text: {
      en: {
        title: 'Safety fixes for your records',
        fixed: [
          'If the date on your device is off by more than a day or two, the server no longer accepts it as today. This keeps your prayer and zikr records from being counted under a wrong day. Set the right date and time on your device and it works as before.',
          'When saving a zikr count fails, it is no longer added to your lifetime total without being added to that day.',
          'Several security fixes behind the scenes. Nothing in your saved records was changed.',
        ],
      },
      bn: {
        title: 'আপনার হিসাবের নিরাপত্তায় কিছু সংশোধন',
        fixed: [
          'আপনার ডিভাইসের তারিখ এক-দুই দিনের বেশি ভুল থাকলে সার্ভার আর সেটিকে আজকের তারিখ হিসেবে গ্রহণ করে না। এতে আপনার নামাজ ও যিকিরের হিসাব ভুল দিনে গণনা হওয়া থেকে রক্ষা পায়। ডিভাইসে সঠিক তারিখ ও সময় ঠিক করে নিলে সব আগের মতোই চলবে।',
          'যিকিরের গণনা সংরক্ষণ ব্যর্থ হলে সেটি আর সেই দিনের হিসাবে যোগ না হয়ে মোট সংখ্যায় যোগ হয় না।',
          'ভেতরে কিছু নিরাপত্তা সংশোধন করা হয়েছে। আপনার সংরক্ষিত কোনো হিসাব বদলানো হয়নি।',
        ],
      },
    },
  },
  {
    version: '5.190.0',
    date: '2026-10-18',
    text: {
      en: {
        title: 'Your Journey, suhoor and iftar times, and a better calendar download',
        added: [
          'A new Journey page in the menu: one card for each of Salat, Zikr, Quran and Fasting since your last fresh start, and a reset tracker that shows how many times you reset each one, and when.',
          'Zikr, Quran and Fasting analytics have a Journey tab too. Salat Journey also lists your Kaza debt resets.',
          'You can now reset your Kaza debt from the main Settings as well. It is never part of "Reset all stats".',
          "Prayer Times now shows when suhoor ends and when iftar is, for today's fast or, after Maghrib, for tomorrow's.",
          'Calendar download: choose to shade the weekend and pick its days, add lines for notes, and turn on a guide if you want one.',
        ],
        fixed: [
          'The Library calendar is now called Bustandeen Calendar.',
          'After the best time for Isha, Home now says the best time has passed and until when Isha is still valid.',
          'Friday and other special-day cards now always sit right under the prayer times on Home.',
          'When the Hijri calendar comes first, its dates use our heading font, on screen and in the PDF.',
          'The printed calendar only says "no holidays" when government holidays are included, and leaves the list out when nothing is included. The moon note is now in the "Before you save" message.',
          'The calendar screen shows the next 3 months instead of the next 30 days.',
          'Your Appearance choice (light, dark, system or daylight) now follows you to your other devices.',
        ],
      },
      bn: {
        title: 'আপনার যাত্রা, সেহরি ও ইফতারের সময়, আর আরও ভালো ক্যালেন্ডার ডাউনলোড',
        added: [
          'মেনুতে নতুন "যাত্রা" পাতা: শেষ নতুন শুরুর পর থেকে সালাত, যিকির, কুরআন ও রোজার জন্য একটি করে কার্ড, আর রিসেটের হিসাব: কোনটি কতবার, কবে রিসেট করেছেন।',
          'যিকির, কুরআন ও রোজার বিশ্লেষণেও এখন "যাত্রা" ট্যাব আছে। সালাতের যাত্রায় কাযা ঋণ রিসেটও দেখা যায়।',
          'এখন মূল সেটিংস থেকেও কাযা ঋণ রিসেট করা যায়। এটি কখনো "সব হিসাব রিসেট"-এর অংশ নয়।',
          'নামাজের সময় পাতায় এখন সেহরির শেষ সময় ও ইফতারের সময় দেখা যায়: আজকের রোজার, আর মাগরিবের পর আগামীকালের রোজার।',
          'ক্যালেন্ডার ডাউনলোড: সাপ্তাহিক ছুটি রাঙানো ও তার দিন বেছে নেওয়া, নোটের জন্য লাইন, আর চাইলে নির্দেশিকা।',
        ],
        fixed: [
          'লাইব্রেরির ক্যালেন্ডারের নাম এখন Bustandeen ক্যালেন্ডার।',
          'এশার উত্তম সময় পেরিয়ে গেলে হোমে এখন লেখা থাকে উত্তম সময় পেরিয়ে গেছে, আর কখন পর্যন্ত আদায় করা যায়।',
          'জুমা ও অন্যান্য বিশেষ দিনের কার্ড এখন হোমে সবসময় নামাজের সময়ের ঠিক নিচে থাকে।',
          'হিজরি ক্যালেন্ডার প্রথমে থাকলে তার তারিখ আমাদের শিরোনামের ফন্টে দেখায়, পর্দায় ও PDF-এ।',
          'ছাপা ক্যালেন্ডারে "কোনো ছুটি নেই" লেখা থাকে শুধু সরকারি ছুটি যুক্ত করলে, আর কিছুই যুক্ত না করলে তালিকাটি থাকে না। চাঁদ নিয়ে নোটটি এখন "সংরক্ষণের আগে" বার্তায়।',
          'ক্যালেন্ডার পাতায় আগামী ৩০ দিনের বদলে আগামী ৩ মাস দেখা যায়।',
          'আপনার চেহারার পছন্দ (লাইট, ডার্ক, সিস্টেম বা দিনের আলো) এখন আপনার অন্য ডিভাইসেও যায়।',
        ],
      },
    },
  },
  {
    version: '5.189.0',
    date: '2026-10-18',
    text: {
      en: {
        title: 'Print your Ramadan: three sheets',
        added: [
          'Every Ramadan calendar now prints one of three A4 pages: the timetable with the Laylat al-Qadr duʿā and a Zakat al-Fitr reminder, the timetable with boxes for your prayers, tarawih, Quran and nafl, or a Ramadan checklist. Each in colour or black and white.',
          'The odd nights of the last ten are marked with a star, and the page shows your shortest and longest fast.',
          'All the notes about dates and times are now in one place on the page, so the printed sheet stays clean.',
        ],
      },
      bn: {
        title: 'আপনার রমজান প্রিন্ট করুন: তিনটি পাতা',
        added: [
          'প্রতিটি রমজান ক্যালেন্ডার এখন তিন ধরনের A4 পাতা প্রিন্ট করে: লাইলাতুল কদরের দোয়া ও সাদাকাতুল ফিতরের কথাসহ সময়সূচি, নামাজ, তারাবীহ, কুরআন ও নফলের ঘরসহ সময়সূচি, অথবা রমজান চেকলিস্ট। প্রতিটি রঙিন বা সাদা-কালো।',
          'শেষ দশকের বেজোড় রাত তারকা চিহ্নে দেখানো হয়, আর পাতায় সবচেয়ে ছোট ও সবচেয়ে বড় রোজার সময় দেখা যায়।',
          'তারিখ ও সময়ের সব ব্যাখ্যা এখন পাতার এক জায়গায়, তাই প্রিন্ট করা পাতা পরিষ্কার থাকে।',
        ],
      },
    },
  },
  {
    version: '5.188.1',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Prayer times follow your saved place',
        fixed: [
          "If you saved a place in a country the app has no usual method for, such as Kenya, the default prayer-time method came from your phone's country. It now uses the same worldwide default as our website. A method you chose yourself never changes.",
          'More places in Kazakhstan, the United States, Canada and Spain now get their country’s usual method.',
          'The "Usual in" label now names the country of your saved place.',
        ],
      },
      bn: {
        title: 'নামাজের সময় এখন আপনার সংরক্ষিত স্থান অনুযায়ী',
        fixed: [
          'যে দেশের প্রচলিত হিসাব পদ্ধতি অ্যাপে নেই (যেমন কেনিয়া), সেখানকার স্থান সংরক্ষণ করলে নামাজের সময়ের পদ্ধতি আপনার ফোনের দেশ অনুযায়ী ঠিক হতো। এখন আমাদের ওয়েবসাইটের মতোই বিশ্বব্যাপী পদ্ধতি ব্যবহার হয়। আপনি নিজে যে পদ্ধতি বেছে নিয়েছেন, তা কখনো বদলায় না।',
          'কাজাখস্তান, যুক্তরাষ্ট্র, কানাডা ও স্পেনের আরও অনেক স্থান এখন নিজ দেশের প্রচলিত পদ্ধতি পায়।',
          '"প্রচলিত" লেবেলে এখন আপনার সংরক্ষিত স্থানের দেশের নাম দেখায়।',
        ],
      },
    },
  },
  {
    version: '5.188.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Adjust the Ramadan calendar for your area',
        added: [
          "Did Ramadan begin a day earlier or later where you live? On the website's Ramadan calendars you can now move the month by one day. Sehri and iftar times stay the same; only the fast numbers move, and your printed sheet follows. Your choice is kept on your device.",
        ],
      },
      bn: {
        title: 'আপনার এলাকার জন্য রমজান ক্যালেন্ডার মিলিয়ে নিন',
        added: [
          'আপনার এলাকায় রমজান কি এক দিন আগে বা পরে শুরু হয়েছে? ওয়েবসাইটের রমজান ক্যালেন্ডারে এখন মাসটি এক দিন সরিয়ে নেওয়া যায়। সেহরি ও ইফতারের সময় একই থাকে, শুধু রোজার নম্বর সরে যায়, আর প্রিন্ট করা শিটেও তা-ই আসে। আপনার পছন্দ আপনার ডিভাইসেই থাকে।',
        ],
      },
    },
  },
  {
    version: '5.187.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'A Ramadan timetable for your own town',
        added: [
          "The Ramadan page can now download this Ramadan's sehri and iftar timetable for your saved location, as one A4 page. It works for any town, even without internet once the app is open.",
          'The Ramadan calendars on the website now point to the app when your town has no page of its own.',
        ],
      },
      bn: {
        title: 'আপনার নিজের এলাকার রমজানের সময়সূচি',
        added: [
          'রমজানের পাতা থেকে এখন আপনার সেভ করা অবস্থানের জন্য এবারের রমজানের সাহরি ও ইফতারের সময়সূচি এক পাতার A4-এ ডাউনলোড করা যায়। যেকোনো এলাকার জন্য চলে, অ্যাপ খোলা থাকলে ইন্টারনেট ছাড়াও।',
          'ওয়েবসাইটের রমজান ক্যালেন্ডারে আপনার এলাকার আলাদা পাতা না থাকলে এখন অ্যাপে যাওয়ার পথ দেখানো হয়।',
        ],
      },
    },
  },
  {
    version: '5.186.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Malaysia: every prayer time matches JAKIM',
        fixed: [
          "In Malaysia, Dhuhr, Asr and Isha now never begin before JAKIM's official times, and sunrise never comes after JAKIM's syuruk. Before, they could be up to 3 minutes off.",
        ],
      },
      bn: {
        title: 'মালয়েশিয়া: প্রতিটি নামাজের সময় এখন JAKIM অনুযায়ী',
        fixed: [
          'মালয়েশিয়ায় যোহর, আসর ও ইশা এখন কখনো JAKIM-এর সরকারি সময়ের আগে শুরু হয় না, আর সূর্যোদয় কখনো JAKIM-এর সূর্যোদয়ের সময়ের পরে আসে না। আগে এগুলো সর্বোচ্চ ৩ মিনিট এদিক-ওদিক হতে পারত।',
        ],
      },
    },
  },
  {
    version: '5.184.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Calendars follow the moon sighting sooner',
        added: [
          "When a moon-sighting announcement is entered, the website's Ramadan calendars and timetables now update within about 15 minutes, instead of waiting for the monthly update.",
        ],
      },
      bn: {
        title: 'চাঁদ দেখার ঘোষণার পর ক্যালেন্ডার আরও দ্রুত হালনাগাদ',
        added: [
          'চাঁদ দেখার ঘোষণা যোগ করার পর ওয়েবসাইটের রমজান ক্যালেন্ডার ও সময়সূচি এখন প্রায় ১৫ মিনিটের মধ্যেই হালনাগাদ হয়, মাসিক হালনাগাদের অপেক্ষা করতে হয় না।',
        ],
      },
    },
  },
  {
    version: '5.183.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Ramadan nights in the right place',
        fixed: [
          'A Ramadan night comes before its day: the 21st night begins at iftar of the 20th fast. After iftar, tarawih now counts for the coming night, and the Ramadan page shows which night it is.',
          'The last ten nights card now appears from iftar of the 20th fast, and on odd nights it says so.',
        ],
      },
      bn: {
        title: 'রমজানের রাত এখন সঠিক জায়গায়',
        fixed: [
          'রমজানের রাত আসে তার দিনের আগে: ২১তম রাত শুরু হয় ২০তম রোজার ইফতারে। ইফতারের পর তারাবীহ এখন আসন্ন রাতের হিসেবে গোনা হয়, আর রমজানের পাতায় দেখা যায় এটি কোন রাত।',
          'শেষ দশ রাতের কার্ড এখন ২০তম রোজার ইফতার থেকেই দেখা যায়, আর বেজোড় রাতে তা জানিয়ে দেয়।',
        ],
      },
    },
  },
  {
    version: '5.182.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Iftar is labelled "Iftar (Maghrib)"',
        fixed: [
          'The Fasting page and Home now say "Iftar (Maghrib)", like the Ramadan page.',
          "In Prayer time settings, a short line tells you when your country's times are matched to its published timetable and kept on the safe side.",
        ],
      },
      bn: {
        title: 'ইফতার এখন "ইফতার (মাগরিব)" নামে',
        fixed: [
          'রোজার পাতা আর হোমে এখন "ইফতার (মাগরিব)" লেখা থাকে, রমজানের পাতার মতোই।',
          'নামাজের সময়ের সেটিংসে একটি ছোট লাইন জানায়, কখন আপনার দেশের সময় সেখানকার প্রকাশিত সময়সূচির সঙ্গে মিলিয়ে নিরাপদ দিকে রাখা হয়েছে।',
        ],
      },
    },
  },
  {
    version: '5.181.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Sehri and iftar checked in nine more countries',
        fixed: [
          'We compared our times with the timetables published in Turkey, Singapore, Indonesia, Saudi Arabia, Qatar, the UAE, Egypt, Morocco and the UK. Where ours ended sehri a little later or put iftar a little earlier, we moved them by a few minutes, so they are now on the safe side.',
          'Morocco now uses its own way of finding Fajr and Maghrib, as the Ministry of Habous does. The Ramadan calendar pages of these countries say which timetable they were checked against.',
        ],
      },
      bn: {
        title: 'আরও নয়টি দেশে সেহরি ও ইফতার মিলিয়ে দেখা হয়েছে',
        fixed: [
          'তুরস্ক, সিঙ্গাপুর, ইন্দোনেশিয়া, সৌদি আরব, কাতার, আমিরাত, মিশর, মরক্কো ও যুক্তরাজ্যে প্রকাশিত সময়সূচির সঙ্গে আমাদের সময় মিলিয়ে দেখা হয়েছে। যেখানে সেহরি একটু দেরিতে শেষ হচ্ছিল বা ইফতার একটু আগে হচ্ছিল, সেখানে কয়েক মিনিট সরিয়ে নিরাপদ দিকে রাখা হয়েছে।',
          'মরক্কোতে এখন সেখানকার হাবুস মন্ত্রণালয়ের নিয়মেই ফজর ও মাগরিবের সময় হিসাব হয়। এসব দেশের রমজান ক্যালেন্ডার পাতায় লেখা থাকে কোন সময়সূচির সঙ্গে মেলানো হয়েছে।',
        ],
      },
    },
  },
  {
    version: '5.180.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Malaysia: Fajr matches JAKIM',
        fixed: [
          "In Malaysia, Fajr now follows JAKIM's timetable and never begins before JAKIM's Subuh. Before, it could show up to 12 minutes early.",
          "Sehri ends a little before Fajr and iftar is a little after sunset, so both stay on the safe side of JAKIM's times.",
        ],
      },
      bn: {
        title: 'মালয়েশিয়া: ফজর এখন জাকিমের সঙ্গে মিলিয়ে',
        fixed: [
          'মালয়েশিয়ায় ফজর এখন জাকিমের সময়সূচি অনুযায়ী, জাকিমের সুবহের আগে কখনো শুরু হয় না। আগে এটি ১২ মিনিট পর্যন্ত আগে দেখাতে পারত।',
          'সেহরি ফজরের একটু আগে শেষ হয় আর ইফতার সূর্যাস্তের একটু পরে, তাই দুটোই জাকিমের সময়ের নিরাপদ দিকে থাকে।',
        ],
      },
    },
  },
  {
    version: '5.179.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Bangladesh sehri and iftar match Islamic Foundation',
        fixed: [
          'In Bangladesh, suhoor now ends 3 minutes before Fajr and iftar is 3 minutes after sunset, matched to the Islamic Foundation Bangladesh timetable. The Fajr prayer time itself does not change. The app and the website show the same times.',
          'If you picked a different calculation method in Settings, your times stay as that method gives them.',
        ],
      },
      bn: {
        title: 'বাংলাদেশে সেহরি ও ইফতার ইসলামিক ফাউন্ডেশনের সঙ্গে মিলিয়ে',
        fixed: [
          'বাংলাদেশে সেহরি এখন শেষ হয় ফজরের ৩ মিনিট আগে, ইফতার সূর্যাস্তের ৩ মিনিট পরে, ইসলামিক ফাউন্ডেশন বাংলাদেশের সময়সূচির সঙ্গে মিলিয়ে। ফজরের নামাজের সময় বদলায়নি। অ্যাপ আর ওয়েবসাইটে একই সময় দেখায়।',
          'সেটিংসে অন্য হিসাব পদ্ধতি বেছে নিয়ে থাকলে আপনার সময় সেই পদ্ধতি অনুযায়ীই থাকবে।',
        ],
      },
    },
  },
  {
    version: '5.178.1',
    date: '2026-10-17',
    text: {
      en: {
        title: 'A second person for moon sightings',
        added: [
          "A second member of our team can now enter Bangladesh's moon sighting each month, so the Hijri dates and the Ramadan calendars never wait on one person. Every entry is recorded with who made it. Nothing changes in the app for you.",
        ],
      },
      bn: {
        title: 'চাঁদ দেখার তথ্যে আরও একজন',
        added: [
          'আমাদের দলের আরও একজন সদস্য এখন প্রতি মাসে বাংলাদেশের চাঁদ দেখার তথ্য দিতে পারবেন, তাই হিজরি তারিখ ও রমজান ক্যালেন্ডার কখনো একজনের অপেক্ষায় থাকবে না। প্রতিটি তথ্য কে দিয়েছেন তা লেখা থাকে। অ্যাপে আপনার জন্য কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.178.0',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Clearer Ramadan calendars',
        fixed: [
          "The Bangladesh Ramadan calendars now say why the first fast is 9 February: Bangladesh's latest moon sighting, not the Umm al-Qura calendar. When the committee announces Ramadan, the calendars follow its date.",
          'Every Ramadan calendar in the world now has a row for a possible 30th fast, on the page and on the printed sheet.',
          'Smaller towns in Bangladesh, like Tongi and Saidpur, now follow the same moon sighting as the district calendars.',
        ],
        added: [
          'Ramadan calendars outside Bangladesh now say which calculation method they use and remind you to follow your local masjid.',
          'The Ramadan countdown in the app now says what its expected date is based on.',
        ],
      },
      bn: {
        title: 'আরও স্পষ্ট রমজান ক্যালেন্ডার',
        fixed: [
          'বাংলাদেশের রমজান ক্যালেন্ডারে এখন লেখা থাকে প্রথম রোজা কেন ৯ ফেব্রুয়ারি: বাংলাদেশের সর্বশেষ চাঁদ দেখা অনুযায়ী, উম্মুল কুরা ক্যালেন্ডার অনুযায়ী নয়। কমিটি রমজানের ঘোষণা দিলে ক্যালেন্ডার সেই তারিখ অনুসরণ করবে।',
          'পৃথিবীর সব রমজান ক্যালেন্ডারে এখন সম্ভাব্য ৩০তম রোজার একটি সারি আছে, পাতায় ও ছাপা শিটে।',
          'টঙ্গী, সৈয়দপুরের মতো বাংলাদেশের ছোট শহরগুলো এখন জেলার ক্যালেন্ডারের মতোই একই চাঁদ দেখা অনুসরণ করে।',
        ],
        added: [
          'বাংলাদেশের বাইরের রমজান ক্যালেন্ডারে এখন লেখা থাকে কোন হিসাব পদ্ধতি ব্যবহার করা হয়েছে, আর স্থানীয় মসজিদ অনুসরণ করার কথা।',
          'অ্যাপের রমজান কাউন্টডাউনে এখন লেখা থাকে সম্ভাব্য তারিখটি কিসের ভিত্তিতে।',
        ],
      },
    },
  },
  {
    version: '5.177.1',
    date: '2026-10-17',
    text: {
      en: {
        title: 'Fewer false alarms from our status check',
        fixed: [
          'Our server check sometimes said the database was down for a moment at night when it was not. Nothing was lost and the app kept working; the check now waits for a quick reconnect before it raises an alarm.',
        ],
      },
      bn: {
        title: 'স্ট্যাটাস চেকে ভুল সতর্কতা কমেছে',
        fixed: [
          'রাতে আমাদের সার্ভার চেক মাঝে মাঝে বলত ডাটাবেস বন্ধ, যদিও তা চালু ছিল। কোনো তথ্য হারায়নি, অ্যাপও ঠিকমতো চলেছে। এখন চেকটি সতর্কতা দেওয়ার আগে দ্রুত আবার সংযোগের জন্য অপেক্ষা করে।',
        ],
      },
    },
  },
  {
    version: '5.177.0',
    date: '2026-10-16',
    text: {
      en: {
        title: 'A calmer printed calendar',
        added: [
          'Days that come every week or month are no longer written in every box. Mondays and Thursdays get a small ring, the White Days a small full moon, and Jumu\'ah is named once above the Friday column. The side of the page lists them once under "Every week and month".',
          '"Blank for writing" keeps the colour marks and the list of the month\'s days, so you still see which days are special. Only the names leave the boxes.',
          'The colour guide now shows a big 1 next to the first calendar and a small 2 next to the second, like the day boxes.',
        ],
        fixed: [
          'No Sunnah fast is marked on the two Eids or the days of Tashriq (11 to 13 Dhul Hijjah), when fasting is not allowed.',
        ],
      },
      bn: {
        title: 'আরও গোছানো ছাপা ক্যালেন্ডার',
        added: [
          'প্রতি সপ্তাহে বা প্রতি মাসে আসা দিনগুলো এখন আর প্রতিটি ঘরে লেখা থাকে না। সোম ও বৃহস্পতিবারে একটি ছোট বৃত্ত, আইয়ামুল বীযে একটি ছোট পূর্ণ চাঁদ, আর শুক্রবারের কলামের ওপরে একবার জুমু\'আহ লেখা থাকে। পাতার পাশে "প্রতি সপ্তাহে ও মাসে" অংশে এগুলো একবার করে লেখা থাকে।',
          '"লেখার জন্য ফাঁকা" বেছে নিলেও রঙের চিহ্ন আর মাসের দিনগুলোর তালিকা থাকে, তাই কোন দিন বিশেষ তা দেখা যায়। শুধু নামগুলো ঘর থেকে সরে যায়।',
          'রঙের নির্দেশিকায় এখন প্রথম ক্যালেন্ডারের পাশে বড় ১ আর দ্বিতীয়টির পাশে ছোট ২, ঠিক দিনের ঘরের মতো।',
        ],
        fixed: [
          'দুই ঈদ ও আইয়ামুত তাশরীকে (১১ থেকে ১৩ যুলহিজ্জাহ) রোজা রাখা নিষেধ, তাই এসব দিনে আর সুন্নাত রোজার চিহ্ন দেখানো হয় না।',
        ],
      },
    },
  },
  {
    version: '5.176.0',
    date: '2026-10-16',
    text: {
      en: {
        title: 'National days for more countries',
        added: [
          'The Islamic calendar now shows national days for Pakistan, India, Saudi Arabia, the UAE, Malaysia, Indonesia, Egypt, Türkiye, the United Kingdom, Germany, France, Italy, the Netherlands, Belgium, Sweden, Spain, Austria, Switzerland, Norway, Denmark, the United States, Canada and Australia, such as Independence Day or National Day.',
          'Calendar downloads in these countries include national days unless you turn them off.',
        ],
      },
      bn: {
        title: 'আরও দেশের জাতীয় দিবস',
        added: [
          'ইসলামী ক্যালেন্ডারে এখন পাকিস্তান, ভারত, সৌদি আরব, সংযুক্ত আরব আমিরাত, মালয়েশিয়া, ইন্দোনেশিয়া, মিসর, তুরস্ক, যুক্তরাজ্য, জার্মানি, ফ্রান্স, ইতালি, নেদারল্যান্ডস, বেলজিয়াম, সুইডেন, স্পেন, অস্ট্রিয়া, সুইজারল্যান্ড, নরওয়ে, ডেনমার্ক, যুক্তরাষ্ট্র, কানাডা ও অস্ট্রেলিয়ার জাতীয় দিবস দেখায়, যেমন স্বাধীনতা দিবস বা জাতীয় দিবস।',
          'এসব দেশে ক্যালেন্ডার ডাউনলোডে জাতীয় দিবস থাকে, চাইলে বন্ধ করে দিতে পারেন।',
        ],
      },
    },
  },
  {
    version: '5.175.0',
    date: '2026-10-16',
    text: {
      en: {
        title: 'Choose what your calendar download includes',
        added: [
          'When you download the Islamic calendar, choose what it lists: Islamic days, with Sunnah fasts and Fridays as extra choices, national days and, in Bangladesh, government holidays.',
          'Without government holidays you can download any year nearby, up to 12 months at a time. Government holidays are added by hand each year, so with them the download stays within last year to next year.',
          "Outside Bangladesh, ask for your country's holidays and national days with a short form, without leaving the calendar.",
          'Request a language on the Help site now opens a short form on the same page.',
          "The calendar's top card now shows the next Hijri month and when it begins: announced, or expected and able to move by a day with the moon sighting.",
        ],
        fixed: [
          'Without a saved location, the calendar now says plainly that its Hijri date changes at midnight, and that saving your location makes it change at Maghrib.',
        ],
      },
      bn: {
        title: 'ক্যালেন্ডার ডাউনলোডে কী থাকবে, আপনি বাছুন',
        added: [
          'ইসলামী ক্যালেন্ডার ডাউনলোডের সময় বাছুন কী থাকবে: ইসলামী দিন (সাথে চাইলে সুন্নাত রোজা ও শুক্রবার), জাতীয় দিবস এবং বাংলাদেশে সরকারি ছুটি।',
          'সরকারি ছুটি ছাড়া কাছাকাছি যেকোনো বছর ডাউনলোড করা যায়, একবারে সর্বোচ্চ ১২ মাস। সরকারি ছুটি প্রতি বছর হাতে যোগ করা হয়, তাই এগুলো থাকলে ডাউনলোড গত বছর থেকে আগামী বছরের মধ্যে থাকে।',
          'বাংলাদেশের বাইরে থাকলে ছোট একটি ফর্মে আপনার দেশের ছুটি ও জাতীয় দিবস চেয়ে নিন, ক্যালেন্ডার ছেড়ে না গিয়েই।',
          'সাহায্য সাইটে ভাষার অনুরোধ এখন একই পাতায় ছোট একটি ফর্ম খোলে।',
          'ক্যালেন্ডারের ওপরের কার্ডে এখন পরের হিজরি মাস ও তা কবে শুরু হবে দেখায়: ঘোষিত, নাকি সম্ভাব্য এবং চাঁদ দেখার ওপর এক দিন এদিক-ওদিক হতে পারে।',
        ],
        fixed: [
          'অবস্থান সংরক্ষণ না থাকলে ক্যালেন্ডার এখন স্পষ্ট বলে যে হিজরি তারিখ মধ্যরাতে বদলায়, আর অবস্থান সংরক্ষণ করলে তা মাগরিবে বদলাবে।',
        ],
      },
    },
  },
  {
    version: '5.174.0',
    date: '2026-10-16',
    text: {
      en: {
        title: 'Clearer Islamic calendar dates',
        added: [
          'The Islamic calendar shows last year, this year and next year, where its dates are most reliable, and downloads cover the same years.',
          'It tells you when a year has no government holiday list yet, reminds you that dates that depend on the moon can differ by a day, and links to where the holiday list comes from.',
        ],
      },
      bn: {
        title: 'ইসলামী ক্যালেন্ডারের তারিখ আরও স্পষ্ট',
        added: [
          'ইসলামী ক্যালেন্ডার এখন গত বছর, এই বছর ও আগামী বছর দেখায়, যেখানে এর তারিখ সবচেয়ে নির্ভরযোগ্য; ডাউনলোডও এই বছরগুলোর।',
          'কোনো বছরের সরকারি ছুটির তালিকা এখনো না এলে তা জানায়, মনে করিয়ে দেয় যে চাঁদনির্ভর তারিখ এক দিন এদিক-ওদিক হতে পারে, আর ছুটির তালিকার সূত্রের লিংক দেয়।',
        ],
      },
    },
  },
  {
    version: '5.173.1',
    date: '2026-10-15',
    text: {
      en: {
        title: 'Calendar fixes',
        fixed: [
          'After Maghrib the Islamic calendar now shows the new Hijri date, the same as Home and Settings.',
          'A calendar downloaded with "Blank for writing" keeps the day boxes empty and gives you lined space for notes beside the month.',
        ],
      },
      bn: {
        title: 'ক্যালেন্ডারের সংশোধন',
        fixed: [
          'মাগরিবের পর ইসলামী ক্যালেন্ডার এখন নতুন হিজরি তারিখ দেখায়, হোম ও সেটিংসের মতোই।',
          '"লেখার জন্য ফাঁকা" বেছে ডাউনলোড করা ক্যালেন্ডারে দিনের ঘরগুলো ফাঁকা থাকে, আর মাসের পাশে নোট লেখার জন্য দাগ টানা জায়গা পাবেন।',
        ],
      },
    },
  },
  {
    version: '5.173.0',
    date: '2026-10-15',
    text: {
      en: {
        title: 'Download the Islamic calendar',
        added: [
          'In Library, Islamic calendar, tap Download: save a month, a whole year or a range of months as a PDF to print or share. Choose which calendars and in what order, events in each day or space to write, A4 or Letter, landscape or portrait, and a colour template or black and white.',
        ],
      },
      bn: {
        title: 'ইসলামী ক্যালেন্ডার ডাউনলোড করুন',
        added: [
          'লাইব্রেরির ইসলামী ক্যালেন্ডারে ডাউনলোডে চাপুন: একটি মাস, পুরো বছর বা কয়েক মাস PDF হিসেবে সংরক্ষণ করুন, প্রিন্ট বা শেয়ার করার জন্য। কোন ক্যালেন্ডার ও কোন ক্রমে, প্রতিটি দিনে দিবস নাকি লেখার জায়গা, A4 নাকি Letter, আড়াআড়ি নাকি খাড়া, আর রঙিন নকশা নাকি সাদা-কালো, সবই বেছে নিতে পারবেন।',
        ],
      },
    },
  },
  {
    version: '5.172.0',
    date: '2026-10-15',
    text: {
      en: {
        title: 'An Islamic calendar in the Library',
        added: [
          "Open Library, Islamic calendar (or tap the Hijri date on Home): today's Hijri date, when it changes at Maghrib, and what is coming up. Browse any month in English or Hijri, with special Islamic days, Bangladesh's government holidays and national days marked.",
          "Calendar settings let you add the Bangla calendar, choose the order, your weekend days and your location. The Hijri date follows your country's moon sighting, as everywhere in the app.",
        ],
      },
      bn: {
        title: 'লাইব্রেরিতে ইসলামী ক্যালেন্ডার',
        added: [
          'লাইব্রেরি থেকে ইসলামী ক্যালেন্ডার খুলুন (বা হোমে হিজরি তারিখে চাপুন): আজকের হিজরি তারিখ, মাগরিবে তা কখন বদলায়, আর সামনে কী আছে। যেকোনো মাস ইংরেজি বা হিজরিতে দেখুন, ইসলামী বিশেষ দিন, বাংলাদেশের সরকারি ছুটি ও জাতীয় দিবস চিহ্নিত।',
          'ক্যালেন্ডার সেটিংসে বাংলা সন যোগ করতে, ক্রম, সাপ্তাহিক ছুটির দিন ও অবস্থান বেছে নিতে পারবেন। হিজরি তারিখ অ্যাপের সব জায়গার মতোই আপনার দেশের চাঁদ দেখা অনুযায়ী চলে।',
        ],
      },
    },
  },
  {
    version: '5.171.0',
    date: '2026-10-15',
    text: {
      en: {
        title: 'Getting the Islamic calendar ready',
        added: [
          'We are building an Islamic calendar for the Library: Hijri and English dates together, the Bangla calendar if you want it, special Islamic days and Bangladesh government holidays. This update lays its groundwork; nothing changes on your screen yet.',
        ],
      },
      bn: {
        title: 'ইসলামী ক্যালেন্ডারের প্রস্তুতি',
        added: [
          'লাইব্রেরির জন্য একটি ইসলামী ক্যালেন্ডার তৈরি হচ্ছে: হিজরি ও ইংরেজি তারিখ একসাথে, চাইলে বাংলা সন, ইসলামী বিশেষ দিন আর বাংলাদেশের সরকারি ছুটি। এই হালনাগাদে তার ভিত্তি তৈরি হলো; আপনার পর্দায় এখনো কিছু বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.170.3',
    date: '2026-10-15',
    text: {
      en: {
        title: 'A faster first load',
        fixed: [
          'We moved to a newer build tool. The app now downloads less code before its first screen, and the information pages stay as light as before.',
        ],
      },
      bn: {
        title: 'প্রথমবার আরও দ্রুত খোলে',
        fixed: [
          'আমরা নতুন একটি বিল্ড টুলে গেছি। প্রথম পাতা দেখানোর আগে অ্যাপ এখন কম কোড ডাউনলোড করে, আর তথ্যের পাতাগুলো আগের মতোই হালকা থাকে।',
        ],
      },
    },
  },
  {
    version: '5.170.2',
    date: '2026-10-15',
    text: {
      en: {
        title: 'Behind-the-scenes updates',
        fixed: [
          'We updated the building blocks the app runs on, including sign-in and the server. Nothing changes in how you use Bustandeen.',
        ],
      },
      bn: {
        title: 'ভেতরের কিছু হালনাগাদ',
        fixed: [
          'অ্যাপ যেসব উপকরণের ওপর চলে, সাইন ইন ও সার্ভারসহ সেগুলো হালনাগাদ করা হয়েছে। Bustandeen ব্যবহারে কিছুই বদলায়নি।',
        ],
      },
    },
  },
  {
    version: '5.170.1',
    date: '2026-10-15',
    text: {
      en: {
        title: 'The Hijri date no longer repeats a day',
        fixed: [
          'When a month began a day later than the Umm al-Qura calendar, the day before it could show the same Hijri date twice (11 and 12 October both read 30 Rabīʿ al-Ākhir). Every month now has 29 or 30 days, and each day has its own date.',
        ],
      },
      bn: {
        title: 'হিজরি তারিখ আর একই দিন দুবার দেখায় না',
        fixed: [
          'কোনো মাস উম্মুল কুরা ক্যালেন্ডারের এক দিন পরে শুরু হলে, তার আগের দিনগুলোতে একই হিজরি তারিখ দুবার দেখাতে পারত (১১ ও ১২ অক্টোবর দুই দিনই ৩০ রবিউল আখির)। এখন প্রতিটি মাস ২৯ বা ৩০ দিনের, আর প্রতিটি দিনের নিজের তারিখ।',
        ],
      },
    },
  },
  {
    version: '5.170.0',
    date: '2026-10-15',
    text: {
      en: {
        title: 'One globe for language, and ask for yours',
        added: [
          'The language button is now a single globe. On the information pages it opens a short menu of languages, with Request a language: tell us which language you want Bustandeen in, without leaving the page. You can also choose Request a language on the Feedback page.',
        ],
        fixed: [
          "City prayer-time and Ramadan pages are now in English, and Bangladesh's are in Bangla too. Arabic pages are gone, and old Arabic links open the English page.",
        ],
      },
      bn: {
        title: 'ভাষার জন্য একটি গ্লোব, আর নিজের ভাষা চেয়ে নিন',
        added: [
          'ভাষার বোতাম এখন শুধু একটি গ্লোব। তথ্যের পাতাগুলোতে এটি ভাষার একটি ছোট তালিকা খোলে, সাথে ভাষার অনুরোধ: পাতা না ছেড়েই জানান কোন ভাষায় Bustandeen চান। মতামতের পাতাতেও ভাষার অনুরোধ বেছে নিতে পারেন।',
        ],
        fixed: [
          'শহরের নামাযের সময় ও রমজানের পাতা এখন ইংরেজিতে, আর বাংলাদেশের পাতা বাংলাতেও। আরবি পাতা আর নেই, পুরোনো আরবি লিংক ইংরেজি পাতা খোলে।',
        ],
      },
    },
  },
  {
    version: '5.169.0',
    date: '2026-10-15',
    text: {
      en: {
        title: 'City pages where they help most',
        fixed: [
          'Prayer-time and Ramadan-calendar pages now cover about 500 cities chosen by need: every city in Bangladesh, many cities where Muslims are a minority (such as the UK, Germany, Sweden, Belgium, Japan and Korea), and one to three main cities in Muslim-majority countries.',
          'For the Qibla, use the live Qibla compass in the app: it works for any place. Old city Qibla links now open it.',
        ],
      },
      bn: {
        title: 'যেখানে সবচেয়ে দরকার, সেখানে শহরের পাতা',
        fixed: [
          'নামাযের সময় ও রমজান ক্যালেন্ডারের পাতা এখন প্রয়োজন দেখে বাছাই করা প্রায় ৫০০ শহরের জন্য: বাংলাদেশের সব শহর, যেসব দেশে মুসলিমরা সংখ্যালঘু সেখানে অনেক শহর (যেমন যুক্তরাজ্য, জার্মানি, সুইডেন, বেলজিয়াম, জাপান ও কোরিয়া), আর মুসলিম-প্রধান দেশে এক থেকে তিনটি প্রধান শহর।',
          'কিবলার জন্য অ্যাপের লাইভ কিবলা কম্পাস ব্যবহার করুন: এটি যেকোনো জায়গায় কাজ করে। শহরের পুরোনো কিবলা লিংক এখন এটিই খোলে।',
        ],
      },
    },
  },
  {
    version: '5.168.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'A calmer first Home',
        fixed: [
          "A new Home now starts with just the Zikr section and Today's goals. Turn on Salat, Quran or Fasting whenever you like, in the welcome setup or in Settings. Your own choices stay as they are.",
          'The welcome setup explains what each Home section gives you.',
          'The Zikr section is now sage green instead of yellow, and Open counter and Log counts look and feel like buttons.',
          'The language button at the top is now the same size as the theme button, with its icon centred.',
        ],
      },
      bn: {
        title: 'আরও শান্ত প্রথম হোম',
        fixed: [
          'নতুন হোম এখন শুধু যিকির অংশ ও আজকের লক্ষ্য দিয়ে শুরু হয়। সালাত, কুরআন বা রোযা যখন খুশি চালু করুন, স্বাগত সেটআপে বা সেটিংসে। আপনার নিজের বেছে নেওয়া সব আগের মতোই থাকবে।',
          'স্বাগত সেটআপ এখন বলে দেয় হোমের প্রতিটি অংশে কী পাবেন।',
          'যিকির অংশ এখন হলুদের বদলে সবুজাভ, আর “কাউন্টার খুলুন” ও “গণনা লগ করুন” এখন সত্যিকারের বোতামের মতো দেখায়।',
          'ওপরের ভাষার বোতাম এখন থিম বোতামের সমান, আর তার আইকন ঠিক মাঝখানে।',
        ],
      },
    },
  },
  {
    version: '5.167.0',
    date: '2026-10-14',
    text: {
      en: {
        title: 'Sign-up emails watched every day',
        added: [
          'Every day the app checks that it can still send its emails (sign-up links and password resets). If that ever stops working, we are told right away instead of finding out from you.',
        ],
      },
      bn: {
        title: 'সাইন-আপ ইমেইল প্রতিদিন পরীক্ষা হয়',
        added: [
          'অ্যাপ প্রতিদিন পরীক্ষা করে যে সে এখনও ইমেইল (সাইন-আপের লিংক ও পাসওয়ার্ড রিসেট) পাঠাতে পারছে কি না। কখনো তা বন্ধ হয়ে গেলে আপনার কাছ থেকে জানার আগেই আমরা সাথে সাথে খবর পাই।',
        ],
      },
    },
  },
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
