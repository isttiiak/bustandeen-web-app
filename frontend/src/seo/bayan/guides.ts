// Bayan (bayan.bustandeen.com) guides, English and Bangla. Each one says only
// what the app does today, in the app's own words for buttons and pages. No
// rulings: where fiqh matters, the guide points to the screen that shows the
// rule with its source. Update a guide in the same change that changes the
// feature it describes.

export type BayanLang = 'en' | 'bn';

export interface GuideSection {
  heading: string;
  paragraphs: string[];
}

export interface GuideText {
  title: string;
  summary: string;
  sections: GuideSection[];
  /** A short highlighted line, shown after the section it follows. */
  note?: { after: number; bold: string; text: string };
  cta: string;
}

export interface Guide {
  slug: string;
  icon: GuideIcon;
  /** Where "Open ..." goes in the app. */
  appPath: string;
  updated: string; // YYYY-MM-DD
  text: Record<BayanLang, GuideText>;
}

export type GuideIcon = 'start' | 'salat' | 'moon' | 'beads' | 'book' | 'road' | 'leaf' | 'people';

export const GUIDES: Guide[] = [
  {
    slug: 'getting-started',
    icon: 'start',
    appPath: '/',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Getting started',
        summary: 'Your first day: place, prayer times, what to track.',
        sections: [
          {
            heading: 'Look around first',
            paragraphs: [
              'Every page is open to explore. You are asked to sign in only when you save something, like marking a prayer or starting a khatam. Reading and listening to the Quran, prayer times, Qibla and Musafir never ask.',
              'An account keeps your record safe on every device. Sign up with your email (we send a link to confirm it first) or with Google. It is free.',
            ],
          },
          {
            heading: 'Your place and prayer times',
            paragraphs: [
              'Open Prayer times and choose your city, or allow your location once. Times are worked out on your phone, and your location never leaves it.',
              'The calculation method and ʿAṣr school that most mosques in your country use are set for you. You can change both in Salat settings.',
            ],
          },
          {
            heading: 'When your day starts',
            paragraphs: [
              'By default your day starts at Fajr, not at midnight. So ʿIshāʾ prayed late at night and suhoor still belong to the day before. In Settings you can start the day at midnight or at Maghrib instead.',
            ],
          },
          {
            heading: 'Keep it on your home screen',
            paragraphs: [
              'Install Bustandeen like an app from your browser menu ("Add to home screen" or "Install"). Prayer times work offline, and zikr counts and prayer marks made offline are saved once you are back online.',
            ],
          },
        ],
        cta: 'Open Bustandeen',
      },
      bn: {
        title: 'শুরু করা',
        summary: 'প্রথম দিন: স্থান, নামাযের সময়, কী কী ট্র্যাক করবেন।',
        sections: [
          {
            heading: 'আগে ঘুরে দেখুন',
            paragraphs: [
              'প্রতিটি পাতা ঘুরে দেখার জন্য খোলা। কিছু সংরক্ষণ করতে গেলেই শুধু সাইন ইন চাওয়া হয়, যেমন নামায চিহ্নিত করা বা খতম শুরু করা। কুরআন পড়া ও শোনা, নামাযের সময়, কিবলা ও মুসাফির কখনো সাইন ইন চায় না।',
              'অ্যাকাউন্ট থাকলে আপনার রেকর্ড সব ডিভাইসে নিরাপদ থাকে। ইমেইল দিয়ে সাইন আপ করুন (আগে একটি লিংক পাঠিয়ে ইমেইলটি নিশ্চিত করা হয়), অথবা Google দিয়ে। এটি ফ্রি।',
            ],
          },
          {
            heading: 'আপনার স্থান ও নামাযের সময়',
            paragraphs: [
              'নামাযের সময় পাতা খুলে আপনার শহর বেছে নিন, অথবা একবার অবস্থান ব্যবহারের অনুমতি দিন। সময় আপনার ফোনেই হিসাব হয়, আর আপনার অবস্থান ফোনের বাইরে যায় না।',
              'আপনার দেশের বেশিরভাগ মসজিদ যে হিসাব পদ্ধতি ও আসরের মাযহাব মেনে চলে, সেটিই ঠিক করে দেওয়া থাকে। দুটোই নামাযের সেটিংসে বদলানো যায়।',
            ],
          },
          {
            heading: 'আপনার দিন কখন শুরু হয়',
            paragraphs: [
              'স্বাভাবিকভাবে আপনার দিন শুরু হয় ফজরে, মধ্যরাতে নয়। তাই গভীর রাতে পড়া এশা ও সাহরি আগের দিনেরই থাকে। সেটিংসে চাইলে দিন মধ্যরাত বা মাগরিব থেকে শুরু করতে পারেন।',
            ],
          },
          {
            heading: 'হোম স্ক্রিনে রাখুন',
            paragraphs: [
              'ব্রাউজারের মেনু থেকে ("হোম স্ক্রিনে যোগ করুন" বা "ইনস্টল") Bustandeen অ্যাপের মতো ইনস্টল করুন। নামাযের সময় অফলাইনেও কাজ করে, আর অফলাইনে করা যিকিরের গণনা ও নামাযের চিহ্ন অনলাইনে ফিরলেই সংরক্ষিত হয়।',
            ],
          },
        ],
        cta: 'Bustandeen খুলুন',
      },
    },
  },
  {
    slug: 'salat-and-kaza',
    icon: 'salat',
    appPath: '/salat',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Salat and kaza',
        summary: 'Done, Kaza, Miss, and how missed prayers are counted.',
        sections: [
          {
            heading: 'Marking a prayer',
            paragraphs: [
              'Each prayer card has three choices. Done means you prayed it on time. Kaza means you prayed it late; it still counts as prayed. Miss means it was not prayed.',
              'After Done, Details lets you note where you prayed (at home, in jamat, at the mosque). Tapping Tasbīḥ or Ayatul Kursi adds those counts to your zikr counter; you can turn that off in Salat settings.',
            ],
          },
          {
            heading: 'When a prayer is missed',
            paragraphs: [
              'When a day ends and one of its prayers is still unmarked, the app marks it Miss and adds it to your make-up count, so nothing is forgotten. If you mark it Done or Kaza later, it comes off the count again.',
            ],
          },
          {
            heading: 'Making up kaza',
            paragraphs: [
              'Open Salat, then the Make-up prayer plan. Mark each make-up prayer as you pray it: the count goes down and the history keeps the date.',
            ],
          },
          {
            heading: 'Travel',
            paragraphs: [
              'On a journey, turn on Musafir: four-rakʿah prayers are shown shortened, and the app offers to join prayers when you are on the move. See the Musafir guide.',
            ],
          },
        ],
        note: {
          after: 1,
          bold: 'Your day starts at Fajr.',
          text: ' ʿIshāʾ prayed at 1 AM still belongs to the day before. You can change this in Settings.',
        },
        cta: 'Open Salat',
      },
      bn: {
        title: 'নামায ও কাযা',
        summary: 'সম্পন্ন, কাযা, ছুটে গেছে, আর ছুটে যাওয়া নামায যেভাবে গোনা হয়।',
        sections: [
          {
            heading: 'নামায চিহ্নিত করা',
            paragraphs: [
              'প্রতিটি নামাযের কার্ডে তিনটি বিকল্প আছে। সম্পন্ন মানে সময়মতো পড়েছেন। কাযা মানে দেরিতে পড়েছেন; এটিও পড়া হিসেবেই গোনা হয়। ছুটে গেছে মানে পড়া হয়নি।',
              'সম্পন্ন করার পর বিস্তারিত থেকে কোথায় পড়েছেন লিখে রাখতে পারেন (বাসায়, জামাতে, মসজিদে)। তাসবীহ বা আয়াতুল কুরসিতে চাপ দিলে সেই গণনা আপনার যিকির কাউন্টারে যোগ হয়; নামাযের সেটিংসে এটি বন্ধ করা যায়।',
            ],
          },
          {
            heading: 'নামায ছুটে গেলে',
            paragraphs: [
              'দিন শেষ হওয়ার পরও কোনো নামাযে চিহ্ন না থাকলে অ্যাপ সেটিকে ছুটে গেছে হিসেবে চিহ্নিত করে কাযার হিসাবে যোগ করে, যেন কিছু ভুলে না যান। পরে সম্পন্ন বা কাযা চিহ্ন দিলে সেটি আবার হিসাব থেকে বাদ যায়।',
            ],
          },
          {
            heading: 'কাযা আদায়',
            paragraphs: [
              'নামায খুলুন, তারপর কাযা নামাযের পরিকল্পনা। প্রতিটি কাযা নামায পড়ার পর চিহ্ন দিন: সংখ্যা কমবে, আর ইতিহাসে তারিখ থেকে যাবে।',
            ],
          },
          {
            heading: 'সফর',
            paragraphs: [
              'সফরে মুসাফির চালু করুন: চার রাকাতের নামায সংক্ষেপে দেখানো হয়, আর চলার পথে দুই নামায একসাথে পড়ার সুযোগ দেখানো হয়। মুসাফির নির্দেশিকা দেখুন।',
            ],
          },
        ],
        note: {
          after: 1,
          bold: 'আপনার দিন শুরু হয় ফজরে।',
          text: ' রাত ১টায় পড়া এশা আগের দিনেরই থাকে। সেটিংসে এটি বদলাতে পারেন।',
        },
        cta: 'নামায খুলুন',
      },
    },
  },
  {
    slug: 'fasting',
    icon: 'moon',
    appPath: '/fasting',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Fasting',
        summary: 'Ramadan, make-up days, vows and voluntary fasts.',
        sections: [
          {
            heading: 'Four kinds of fast',
            paragraphs: [
              'Fasting keeps Ramadan fasts, make-up days for missed Ramadan fasts, vows (each with its own name) and voluntary fasts such as Mondays and Thursdays, the white days, ʿArafah and ʿĀshūrāʾ.',
              'Pick the day, the kind of fast, then mark it. A fast is kept by its calendar date.',
            ],
          },
          {
            heading: 'Make-up days',
            paragraphs: [
              'Ramadan days you did not fast go to your make-up count. Each make-up fast you log takes one off.',
            ],
          },
          {
            heading: 'Days with a ruling',
            paragraphs: [
              'On the two Eids fasting is not allowed, so the app does not offer a fast on those days. On days when a voluntary fast alone is disliked, it shows a gentle note with its source before you save.',
            ],
          },
        ],
        cta: 'Open Fasting',
      },
      bn: {
        title: 'রোজা',
        summary: 'রমজান, কাযা রোজা, মানত ও নফল রোজা।',
        sections: [
          {
            heading: 'চার ধরনের রোজা',
            paragraphs: [
              'রোজা পাতায় থাকে রমজানের রোজা, রমজানে ছুটে যাওয়া রোজার কাযা, মানত (প্রতিটির নিজস্ব নাম সহ) এবং নফল রোজা, যেমন সোম ও বৃহস্পতিবার, আইয়ামে বীয, আরাফা ও আশুরা।',
              'দিন বেছে নিন, রোজার ধরন বেছে নিন, তারপর চিহ্ন দিন। রোজা তার ক্যালেন্ডারের তারিখ অনুযায়ীই রাখা হয়।',
            ],
          },
          {
            heading: 'কাযা রোজা',
            paragraphs: [
              'রমজানে যে দিনগুলো রোজা রাখা হয়নি, সেগুলো কাযার হিসাবে যায়। প্রতিটি কাযা রোজা লগ করলে একটি কমে।',
            ],
          },
          {
            heading: 'যে দিনগুলোর বিশেষ বিধান আছে',
            paragraphs: [
              'দুই ঈদে রোজা রাখা জায়েয নয়, তাই অ্যাপ সেই দিনগুলোতে রোজা লগ করার সুযোগ দেয় না। যে দিনে শুধু নফল রোজা মাকরূহ, সংরক্ষণের আগে সেখানে সূত্রসহ একটি নরম সতর্কবার্তা দেখানো হয়।',
            ],
          },
        ],
        cta: 'রোজা খুলুন',
      },
    },
  },
  {
    slug: 'zikr-counter',
    icon: 'beads',
    appPath: '/zikr',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Zikr counter',
        summary: 'Counting, goals, streaks and saving counts.',
        sections: [
          {
            heading: 'Counting',
            paragraphs: [
              'Pick a zikr and tap Count, or tap anywhere in full screen. Counts are saved as you go, and counts made offline are saved once you are back online.',
              'Tasbih mode counts down from a target you pick, and marks the set complete when you reach it.',
            ],
          },
          {
            heading: 'Goals and streaks',
            paragraphs: [
              'Set a daily goal and the counter shows how close you are. Each day you reach your goal adds a day to your streak.',
            ],
          },
          {
            heading: 'Counted somewhere else?',
            paragraphs: [
              'Log counts adds counts you made on beads or by heart. Correct a day fixes a past day, as far back as you allow in its settings.',
            ],
          },
          {
            heading: 'Before you sign in',
            paragraphs: [
              'Counting is never interrupted. Your counts stay on this device, a small note under Count shows how many are waiting, and they are added to your record when you sign in.',
            ],
          },
        ],
        cta: 'Open Zikr',
      },
      bn: {
        title: 'যিকির কাউন্টার',
        summary: 'গণনা, লক্ষ্য, ধারাবাহিকতা ও সংরক্ষণ।',
        sections: [
          {
            heading: 'গণনা',
            paragraphs: [
              'একটি যিকির বেছে নিয়ে গণনায় চাপ দিন, অথবা পূর্ণ স্ক্রিনে যেকোনো জায়গায় চাপ দিন। গণনা সাথে সাথে সংরক্ষিত হয়, আর অফলাইনে করা গণনা অনলাইনে ফিরলেই সংরক্ষিত হয়।',
              'তাসবীহ মোড আপনার বেছে নেওয়া লক্ষ্য থেকে উল্টো দিকে গোনে, আর লক্ষ্যে পৌঁছালে সেটটি সম্পূর্ণ দেখায়।',
            ],
          },
          {
            heading: 'লক্ষ্য ও ধারাবাহিকতা',
            paragraphs: [
              'দৈনিক লক্ষ্য ঠিক করুন, কাউন্টার দেখাবে আর কতটা বাকি। যেদিন লক্ষ্যে পৌঁছান, সেদিন আপনার ধারাবাহিকতায় একটি দিন যোগ হয়।',
            ],
          },
          {
            heading: 'অন্য কোথাও গুনেছেন?',
            paragraphs: [
              'গণনা লগ করুন দিয়ে তাসবীহ দানা বা মুখে মুখে করা গণনা যোগ করুন। একটি দিন ঠিক করুন দিয়ে আগের কোনো দিন ঠিক করা যায়, সেটিংসে যত দিন পেছনে যাওয়ার অনুমতি দেন।',
            ],
          },
          {
            heading: 'সাইন ইনের আগে',
            paragraphs: [
              'গণনায় কখনো বাধা পড়ে না। আপনার গণনা এই ডিভাইসে থাকে, গণনা বাটনের নিচে ছোট একটি লেখা দেখায় কতগুলো অপেক্ষায় আছে, আর সাইন ইন করলে সেগুলো আপনার রেকর্ডে যোগ হয়।',
            ],
          },
        ],
        cta: 'যিকির খুলুন',
      },
    },
  },
  {
    slug: 'quran-habit',
    icon: 'book',
    appPath: '/quran',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Quran habit',
        summary: 'Reading time, khatam journeys and hifz review.',
        sections: [
          {
            heading: 'Read and listen',
            paragraphs: [
              'Any surah can be read or listened to without an account. Signed in, the reader keeps your place in each surah, times your reading, and listening can count towards your daily goal (a setting).',
            ],
          },
          {
            heading: 'Khatam',
            paragraphs: [
              'A khatam is a read-through of the whole Quran in order, at your own pace. It starts only when you choose to begin, from Al-Fatihah, and Continue always opens where you stopped.',
            ],
          },
          {
            heading: 'Hifz',
            paragraphs: [
              'Memorise new āyāt one at a time, after reading them first. Each one comes back for review when it is due: āyāt you know well come back less often, ones you find hard come back sooner. Set your daily new and review targets.',
            ],
          },
          {
            heading: 'Bookmarks and duʿās',
            paragraphs: [
              'Bookmark any āyah in the reader and save Quranic duʿās from the Quran page. Both are on the Bookmarks tab. Any āyah can be shared as an image.',
            ],
          },
        ],
        cta: 'Open Quran',
      },
      bn: {
        title: 'কুরআন অভ্যাস',
        summary: 'তিলাওয়াতের সময়, খতম ও হিফয পুনরাবৃত্তি।',
        sections: [
          {
            heading: 'পড়ুন ও শুনুন',
            paragraphs: [
              'অ্যাকাউন্ট ছাড়াই যেকোনো সূরা পড়া বা শোনা যায়। সাইন ইন করা থাকলে রিডার প্রতিটি সূরায় আপনার জায়গা মনে রাখে, পড়ার সময় গোনে, আর শোনাও দৈনিক লক্ষ্যে গোনা যায় (একটি সেটিং)।',
            ],
          },
          {
            heading: 'খতম',
            paragraphs: [
              'খতম মানে নিজের গতিতে ক্রমানুসারে পুরো কুরআন পড়া। আপনি শুরু করতে চাইলে তবেই এটি শুরু হয়, সূরা আল-ফাতিহা থেকে, আর চালিয়ে যান সবসময় যেখানে থেমেছিলেন সেখান থেকে খোলে।',
            ],
          },
          {
            heading: 'হিফয',
            paragraphs: [
              'আগে পড়ে নিয়ে একটি একটি করে নতুন আয়াত মুখস্থ করুন। প্রতিটি আয়াত সময় হলে পুনরাবৃত্তির জন্য ফিরে আসে: ভালো জানা আয়াত দেরিতে ফেরে, কঠিন লাগা আয়াত তাড়াতাড়ি। দৈনিক নতুন ও পুনরাবৃত্তির লক্ষ্য ঠিক করুন।',
            ],
          },
          {
            heading: 'বুকমার্ক ও দোয়া',
            paragraphs: [
              'রিডারে যেকোনো আয়াত বুকমার্ক করুন, আর কুরআন পাতা থেকে কুরআনের দোয়া সংরক্ষণ করুন। দুটোই বুকমার্ক ট্যাবে থাকে। যেকোনো আয়াত ছবি হিসেবে শেয়ার করা যায়।',
            ],
          },
        ],
        cta: 'কুরআন খুলুন',
      },
    },
  },
  {
    slug: 'musafir',
    icon: 'road',
    appPath: '/musafir',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Musafir',
        summary: 'Shortening and joining prayers while travelling.',
        sections: [
          {
            heading: 'Turn it on when you set out',
            paragraphs: [
              'Open Musafir, choose your madhab and start the journey. The page shows the distance and length of stay that make someone a traveller in that school, each with its source.',
              'If you are far from your saved home and Musafir is off, the app may ask whether you are travelling. The distance is worked out on your phone.',
            ],
          },
          {
            heading: 'While travelling',
            paragraphs: [
              'Four-rakʿah prayers are shown shortened on the Salat page. On the move, the app offers to pray two prayers together, in the time of the first or of the second.',
            ],
          },
          {
            heading: 'After the journey',
            paragraphs: [
              'Prayers missed on the journey are kept apart as travel kaza, and past journeys stay in your history. Remove a journey and its days stop counting as travel days.',
            ],
          },
        ],
        cta: 'Open Musafir',
      },
      bn: {
        title: 'মুসাফির',
        summary: 'সফরে নামায কসর ও একসাথে আদায়।',
        sections: [
          {
            heading: 'রওনা দেওয়ার সময় চালু করুন',
            paragraphs: [
              'মুসাফির খুলুন, আপনার মাযহাব বেছে নিন আর সফর শুরু করুন। পাতাটি দেখায় সেই মাযহাবে কতটা দূরত্ব ও কত দিন থাকার নিয়তে একজন মুসাফির হন, প্রতিটির সূত্রসহ।',
              'সংরক্ষিত বাসা থেকে অনেক দূরে থাকলে আর মুসাফির বন্ধ থাকলে অ্যাপ জিজ্ঞেস করতে পারে আপনি সফরে আছেন কি না। দূরত্ব আপনার ফোনেই হিসাব হয়।',
            ],
          },
          {
            heading: 'সফরের সময়',
            paragraphs: [
              'নামায পাতায় চার রাকাতের নামায সংক্ষেপে দেখানো হয়। চলার পথে অ্যাপ দুই নামায একসাথে পড়ার সুযোগ দেখায়, প্রথমটির বা দ্বিতীয়টির সময়ে।',
            ],
          },
          {
            heading: 'সফরের পরে',
            paragraphs: [
              'সফরে ছুটে যাওয়া নামায আলাদাভাবে সফরের কাযা হিসেবে রাখা হয়, আর আগের সফরগুলো ইতিহাসে থাকে। কোনো সফর মুছে দিলে তার দিনগুলো আর সফরের দিন হিসেবে গোনা হয় না।',
            ],
          },
        ],
        cta: 'মুসাফির খুলুন',
      },
    },
  },
  {
    slug: 'rayhanah',
    icon: 'leaf',
    appPath: '/cycle',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Rayhanah',
        summary: 'Your cycle, encrypted and never shared.',
        sections: [
          {
            heading: 'Your days, your worship',
            paragraphs: [
              'Rayhanah keeps your cycle next to your worship. On your days salat is excused, so no kaza is added, and Ramadan days you could not fast go to your make-up count.',
            ],
          },
          {
            heading: 'Private by design',
            paragraphs: [
              'Your entries are encrypted, never shared with friends and never sent to any AI. They need your own account; nothing is entered or kept for a guest.',
              'Discreet mode hides the Rayhanah and cycle-day wording from the home screen and menu (it says Wellness instead), for a shared phone.',
            ],
          },
        ],
        cta: 'Open Rayhanah',
      },
      bn: {
        title: 'রায়হানাহ',
        summary: 'আপনার চক্র, এনক্রিপ্ট করা, কারও সাথে শেয়ার হয় না।',
        sections: [
          {
            heading: 'আপনার দিন, আপনার ইবাদত',
            paragraphs: [
              'রায়হানাহ আপনার চক্রকে ইবাদতের পাশেই রাখে। আপনার দিনগুলোতে নামায মাফ, তাই কোনো কাযা যোগ হয় না, আর রমজানের যে দিনগুলোতে রোজা রাখতে পারেননি সেগুলো কাযা রোজার হিসাবে যায়।',
            ],
          },
          {
            heading: 'গোপনীয়তাই এর ভিত্তি',
            paragraphs: [
              'আপনার তথ্য এনক্রিপ্ট করা থাকে, কখনো বন্ধুদের সাথে শেয়ার হয় না, আর কোনো AI-তে পাঠানো হয় না। এর জন্য আপনার নিজের অ্যাকাউন্ট লাগে; অতিথির জন্য কিছু লেখা বা রাখা হয় না।',
              'গোপন মোড হোম স্ক্রিন ও মেনু থেকে রায়হানাহ ও চক্রের দিনের লেখা লুকিয়ে রাখে (সেখানে ওয়েলনেস লেখা থাকে), শেয়ার করা ফোনের জন্য।',
            ],
          },
        ],
        cta: 'রায়হানাহ খুলুন',
      },
    },
  },
  {
    slug: 'friends-and-noor',
    icon: 'people',
    appPath: '/friends',
    updated: '2026-10-14',
    text: {
      en: {
        title: 'Friends and Noor',
        summary: 'Three privacy levels, secret deeds, no ranking.',
        sections: [
          {
            heading: 'Add a friend',
            paragraphs: [
              'Share your invite link from Friends. It works once; after your friend joins, a new one replaces it.',
            ],
          },
          {
            heading: 'You choose what friends see',
            paragraphs: [
              'Pick one of three levels: Nothing (you leave every friend’s circle), Consistency only (streaks and active days) or Full detail.',
              'Secret deeds: keep prayers, zikr, Quran or fasting secret, and friends never see that area. It is also left out of the Noor they see, and it still counts for you. Rayhanah is never shown to anyone.',
            ],
          },
          {
            heading: 'Noor, not a race',
            paragraphs: [
              'Send Noor to lift a friend’s day. Friends are listed with you first, then by the longest visible streak. There is no ranking and no competing.',
            ],
          },
        ],
        cta: 'Open Friends',
      },
      bn: {
        title: 'বন্ধু ও নূর',
        summary: 'তিন স্তরের গোপনীয়তা, গোপন আমল, কোনো র‍্যাংকিং নেই।',
        sections: [
          {
            heading: 'বন্ধু যোগ করুন',
            paragraphs: [
              'বন্ধু পাতা থেকে আপনার আমন্ত্রণ লিংক শেয়ার করুন। লিংকটি একবারই কাজ করে; বন্ধু যোগ দেওয়ার পর নতুন একটি লিংক তার জায়গা নেয়।',
            ],
          },
          {
            heading: 'বন্ধুরা কী দেখবে, আপনিই ঠিক করেন',
            paragraphs: [
              'তিনটির একটি বেছে নিন: কিছুই না (সব বন্ধুর তালিকা থেকে বেরিয়ে যান), শুধু ধারাবাহিকতা (স্ট্রিক ও সক্রিয় দিন), অথবা সম্পূর্ণ বিবরণ।',
              'গোপন আমল: নামায, যিকির, কুরআন বা রোজা গোপন রাখুন, বন্ধুরা সেই অংশ কখনো দেখবে না। বন্ধুরা যে নূর দেখে সেখান থেকেও এটি বাদ যায়, আর আপনার জন্য এটি গোনা হতেই থাকে। রায়হানাহ কখনো কাউকে দেখানো হয় না।',
            ],
          },
          {
            heading: 'নূর, প্রতিযোগিতা নয়',
            paragraphs: [
              'বন্ধুর দিন উজ্জ্বল করতে নূর পাঠান। তালিকায় প্রথমে আপনি, তারপর যার দৃশ্যমান ধারাবাহিকতা সবচেয়ে লম্বা। কোনো র‍্যাংকিং নেই, কোনো প্রতিযোগিতা নেই।',
            ],
          },
        ],
        cta: 'বন্ধু খুলুন',
      },
    },
  },
];
