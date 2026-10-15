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
