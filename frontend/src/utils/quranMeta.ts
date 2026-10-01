// Curated Quran content — special surahs, authentic ayah bundles, and duas
// from the Quran itself. Reference policy (CLAUDE.md): every virtue claim
// links to quran.com / sunnah.com with the exact number; grades noted where
// the hadith is below sahih. Surahs whose popular virtues rest on weak
// narrations are listed WITHOUT a virtue claim (the recitation itself needs
// no certificate — Quran 73:4).

export interface SpecialSurah {
  surah: number;
  name: string;
  emoji: string;
  note: string;
  noteBn?: string;
  ref?: { text: string; url: string };
}

export const SPECIAL_SURAHS: SpecialSurah[] = [
  {
    surah: 67,
    name: 'Al-Mulk',
    emoji: '👑',
    note: 'Thirty verses that intercede for their reciter until he is forgiven.',
    noteBn: 'ত্রিশটি আয়াত যা তেলাওয়াতকারীর জন্য সুপারিশ করে, যতক্ষণ না তাকে ক্ষমা করা হয়।',
    ref: { text: 'Tirmidhī 2891 (ḥasan)', url: 'https://sunnah.com/tirmidhi:2891' },
  },
  {
    surah: 18,
    name: 'Al-Kahf',
    emoji: '🕯️',
    note: 'Its first ten verses are a protection from the Dajjāl; beloved on Fridays.',
    noteBn: 'এর প্রথম দশ আয়াত দাজ্জাল থেকে সুরক্ষা; জুমার দিন প্রিয় তেলাওয়াত।',
    ref: { text: 'Muslim 809', url: 'https://sunnah.com/muslim:809' },
  },
  {
    surah: 2,
    name: 'Al-Baqarah',
    emoji: '🏰',
    note: 'Shayṭān flees the home in which Sūrat al-Baqarah is recited.',
    noteBn: 'যে ঘরে সূরা আল-বাকারা তেলাওয়াত করা হয়, শয়তান সেই ঘর থেকে পালিয়ে যায়।',
    ref: { text: 'Muslim 780', url: 'https://sunnah.com/muslim:780' },
  },
  {
    surah: 36,
    name: 'Yā-Sīn',
    emoji: '💛',
    note: 'A beloved recitation for reflection on revelation and resurrection.',
    noteBn: 'প্রত্যাদেশ ও পুনরুত্থান নিয়ে চিন্তার জন্য একটি প্রিয় তেলাওয়াত।',
  },
  {
    surah: 55,
    name: 'Ar-Raḥmān',
    emoji: '🌺',
    note: '"Which of the favours of your Lord will you deny?" — the surah of gratitude.',
    noteBn: '"তোমরা তোমাদের রবের কোন কোন নিয়ামত অস্বীকার করবে?" — কৃতজ্ঞতার সূরা।',
  },
  {
    surah: 56,
    name: 'Al-Wāqiʿah',
    emoji: '⚖️',
    note: 'A vivid journey through the Day when ranks are decided.',
    noteBn: 'যেদিন মর্যাদা নির্ধারিত হবে, সেই দিনের এক প্রাণবন্ত যাত্রা।',
  },
  {
    surah: 32,
    name: 'As-Sajdah',
    emoji: '🌙',
    note: 'The Prophet ﷺ would not sleep until he recited it with al-Mulk.',
    noteBn: 'নবী ﷺ আল-মুলকের সাথে এটি তেলাওয়াত না করে ঘুমাতেন না।',
    ref: { text: 'Tirmidhī 2892 (ḥasan)', url: 'https://sunnah.com/tirmidhi:2892' },
  },
];

export interface AyahBundle {
  id: string;
  title: string;
  titleBn?: string;
  emoji: string;
  surah: number;
  fromAyah: number;
  toAyah: number;
  virtue: string;
  virtueBn?: string;
  ref: { text: string; url: string };
}

export const AYAH_BUNDLES: AyahBundle[] = [
  {
    id: 'ayatul-kursi',
    title: 'Āyatul Kursī',
    titleBn: 'আয়াতুল কুরসি',
    emoji: '🛡️',
    surah: 2,
    fromAyah: 255,
    toAyah: 255,
    virtue:
      'The greatest āyah in the Book of Allah; recited at night, a guardian remains with you.',
    virtueBn: 'আল্লাহর কিতাবের সর্বশ্রেষ্ঠ আয়াত; রাতে তেলাওয়াত করলে একজন রক্ষক তোমার সাথে থাকে।',
    ref: { text: 'Muslim 810 · Bukhārī 2311', url: 'https://sunnah.com/muslim:810' },
  },
  {
    id: 'baqarah-end',
    title: 'Last verses of al-Baqarah',
    titleBn: 'সূরা আল-বাকারার শেষ আয়াতদ্বয়',
    emoji: '🌃',
    surah: 2,
    fromAyah: 285,
    toAyah: 286,
    virtue: 'Whoever recites the last two verses of al-Baqarah at night — they suffice him.',
    virtueBn:
      'যে ব্যক্তি রাতে সূরা আল-বাকারার শেষ দুই আয়াত তেলাওয়াত করে — তা তার জন্য যথেষ্ট হয়ে যায়।',
    ref: { text: 'Bukhārī 5009', url: 'https://sunnah.com/bukhari:5009' },
  },
  {
    id: 'kahf-ten',
    title: 'First ten of al-Kahf',
    titleBn: 'সূরা আল-কাহফের প্রথম দশ আয়াত',
    emoji: '🕯️',
    surah: 18,
    fromAyah: 1,
    toAyah: 10,
    virtue: 'Memorised, they are a protection from the Dajjāl.',
    virtueBn: 'মুখস্থ করলে তা দাজ্জাল থেকে সুরক্ষা।',
    ref: { text: 'Muslim 809', url: 'https://sunnah.com/muslim:809' },
  },
  {
    id: 'hashr-end',
    title: 'Last three of al-Ḥashr',
    titleBn: 'সূরা আল-হাশরের শেষ তিন আয়াত',
    emoji: '✨',
    surah: 59,
    fromAyah: 22,
    toAyah: 24,
    virtue: 'The names of Allah gathered — recited morning and evening.',
    virtueBn: 'আল্লাহর নামসমূহ একত্রিত — সকাল ও সন্ধ্যায় তেলাওয়াত করা হয়।',
    ref: { text: 'Tirmidhī 2922 (gharīb — noted)', url: 'https://sunnah.com/tirmidhi:2922' },
  },
];

export interface QuranicDua {
  id: string;
  surah: number;
  fromAyah: number;
  toAyah: number;
  title: string;
  emoji: string;
  /** The story/evidence BEHIND the duʿā — who said it, when, and why it is
   * treasured. `ref` is always a verifiable link (sunnah.com or quran.com). */
  titleBn?: string;
  context?: {
    text: string;
    textBn?: string;
    ref: { text: string; url: string };
  };
}

// Every entry is a duʿā Allah Himself relates in the Quran — taught through
// His prophets and the righteous. Short enough to memorize; contexts cite
// only verifiable sources (no weak-hadith virtue claims).
export const QURANIC_DUAS: QuranicDua[] = [
  {
    id: 'dua-both-worlds',
    surah: 2,
    fromAyah: 201,
    toAyah: 201,
    emoji: '🌍',
    title: 'Good in this world & the next',
    titleBn: 'দুনিয়া ও আখিরাতে কল্যাণ',
    context: {
      text: 'Anas (ra) said this "Rabbanā ātinā…" was the supplication the Prophet ﷺ made MOST often — one line that gathers both worlds and protection from the Fire.',
      textBn:
        'আনাস (রা) বলেছেন, "রব্বানা আতিনা…" ছিল নবী ﷺ-এর সবচেয়ে বেশি পঠিত দু\'আ — একটি লাইনে দুই জাহানের কল্যাণ ও জাহান্নাম থেকে সুরক্ষা একত্রিত।',
      ref: { text: 'Bukhārī 6389', url: 'https://sunnah.com/bukhari:6389' },
    },
  },
  {
    id: 'dua-steadfast',
    surah: 3,
    fromAyah: 8,
    toAyah: 8,
    emoji: '⚓',
    title: 'Keep my heart firm after guidance',
    titleBn: 'হিদায়াতের পর আমার হৃদয়কে অবিচল রাখুন',
    context: {
      text: 'The duʿā of those firm in knowledge (ar-rāsikhūna fil-ʿilm) — asking Allah not to let the heart swerve after He has guided it. The Prophet ﷺ often swore "O Turner of the hearts…", the same meaning.',
      textBn:
        'জ্ঞানে দৃঢ়প্রতিষ্ঠিতদের (আর-রাসিখূনা ফিল-ইলম) দু\'আ — আল্লাহর কাছে প্রার্থনা যেন হিদায়াতের পর হৃদয় বিচ্যুত না হয়। নবী ﷺ প্রায়ই একই অর্থে শপথ করতেন, "হে অন্তরসমূহের পরিবর্তনকারী…"।',
      ref: { text: 'Quran 3:7-8 · cf. Tirmidhī 2140', url: 'https://quran.com/3/8' },
    },
  },
  {
    id: 'dua-forgive-us',
    surah: 7,
    fromAyah: 23,
    toAyah: 23,
    emoji: '🤲',
    title: 'The duʿā of Ādam — forgive us',
    titleBn: "আদম (আ)-এর দু'আ — আমাদের ক্ষমা করুন",
    context: {
      text: 'The very first istighfār of mankind: the words Ādam and Ḥawwā said after the slip in the Garden — and with them Allah turned to them in mercy (2:37).',
      textBn:
        'মানবজাতির সর্বপ্রথম ইস্তিগফার: জান্নাতে ভুলের পর আদম ও হাওয়া যে কথা বলেছিলেন — আর এর মাধ্যমেই আল্লাহ তাদের প্রতি করুণাসহকারে ফিরে আসেন (২:৩৭)।',
      ref: { text: 'Quran 7:23 · 2:37', url: 'https://quran.com/7/23' },
    },
  },
  {
    id: 'dua-salat-descendants',
    surah: 14,
    fromAyah: 40,
    toAyah: 41,
    emoji: '🕌',
    title: 'Make me steadfast in prayer',
    titleBn: 'আমাকে সালাতে অবিচল রাখুন',
    context: {
      text: 'Ibrāhīm (as), in old age after being granted Ismāʿīl and Isḥāq, asks that he AND his descendants remain establishers of salat — a duʿā for generations you will never meet.',
      textBn:
        "ইবরাহীম (আ), বার্ধক্যে ইসমাঈল ও ইসহাক লাভের পর, প্রার্থনা করেন যেন তিনি ও তাঁর বংশধররা সালাত কায়েমকারী থাকেন — এমন প্রজন্মের জন্য দু'আ যাদের সাথে তোমার কখনো দেখা হবে না।",
      ref: { text: 'Quran 14:35-41', url: 'https://quran.com/14/40' },
    },
  },
  {
    id: 'dua-mercy-affair',
    surah: 18,
    fromAyah: 10,
    toAyah: 10,
    emoji: '🏞️',
    title: 'The cave companions — mercy & guidance',
    titleBn: 'গুহাবাসীরা — রহমত ও হিদায়াত',
    context: {
      text: 'Said by the young believers of the Cave as they fled a tyrant with nothing but their faith — Allah answered with a miracle that lasted three centuries.',
      textBn:
        "গুহার তরুণ মুমিনরা যখন শুধু ঈমান সম্বল করে এক অত্যাচারীর কাছ থেকে পালিয়েছিলেন তখন এই দু'আ বলেছিলেন — আল্লাহ তিন শতাব্দী স্থায়ী এক মুজিজা দিয়ে সাড়া দিয়েছিলেন।",
      ref: { text: 'Quran 18:9-26', url: 'https://quran.com/18/10' },
    },
  },
  {
    id: 'dua-musa',
    surah: 20,
    fromAyah: 25,
    toAyah: 28,
    emoji: '🗣️',
    title: 'Mūsā — expand my chest, ease my task',
    titleBn: 'মূসা (আ) — আমার বক্ষ প্রশস্ত করুন, আমার কাজ সহজ করুন',
    context: {
      text: 'Mūsā (as) said this when commanded to face Firʿawn — the duʿā before any daunting task, speech or confrontation.',
      textBn:
        "ফিরআউনের মুখোমুখি হওয়ার নির্দেশ পেয়ে মূসা (আ) এই দু'আ বলেছিলেন — যেকোনো কঠিন কাজ, বক্তৃতা বা মুখোমুখি হওয়ার আগের দু'আ।",
      ref: { text: 'Quran 20:24-36', url: 'https://quran.com/20/25' },
    },
  },
  {
    id: 'dua-knowledge',
    surah: 20,
    fromAyah: 114,
    toAyah: 114,
    emoji: '📚',
    title: 'Rabbi zidnī ʿilmā — increase me in knowledge',
    titleBn: 'রাব্বি যিদনী ইলমা — আমার জ্ঞান বৃদ্ধি করুন',
    context: {
      text: 'The one thing Allah commanded His Prophet ﷺ to ask for MORE of — knowledge. Three words for every student, before every lesson.',
      textBn:
        'একমাত্র যে বিষয়ে আল্লাহ তাঁর নবী ﷺ-কে আরও বেশি চাইতে নির্দেশ দিয়েছেন — তা হলো জ্ঞান। প্রতিটি শিক্ষার্থীর জন্য, প্রতিটি পাঠের আগে তিনটি শব্দ।',
      ref: { text: 'Quran 20:114', url: 'https://quran.com/20/114' },
    },
  },
  {
    id: 'dua-yunus',
    surah: 21,
    fromAyah: 87,
    toAyah: 87,
    emoji: '🐋',
    title: 'Yūnus in the darkness — lā ilāha illā anta',
    titleBn: 'অন্ধকারে ইউনুস (আ) — লা ইলাহা ইল্লা আনতা',
    context: {
      text: 'The call of Dhun-Nūn (Yūnus) from inside the whale. The Prophet ﷺ said: no Muslim ever supplicates with it for anything except that Allah answers him.',
      textBn:
        "মাছের পেট থেকে যুন-নূন (ইউনুস)-এর আহ্বান। নবী ﷺ বলেছেন: কোনো মুসলিম যখনই এটি দিয়ে দু'আ করে, আল্লাহ তার উত্তর দেন।",
      ref: { text: 'Tirmidhī 3505 (ṣaḥīḥ)', url: 'https://sunnah.com/tirmidhi:3505' },
    },
  },
  {
    id: 'dua-refuge-shayatin',
    surah: 23,
    fromAyah: 97,
    toAyah: 98,
    emoji: '🛡️',
    title: 'Refuge from the whispers of devils',
    titleBn: 'শয়তানের কুমন্ত্রণা থেকে আশ্রয়',
    context: {
      text: "Allah taught His Prophet ﷺ these exact words of refuge — from the devils' whispers and even from their presence.",
      textBn:
        'আল্লাহ তাঁর নবী ﷺ-কে আশ্রয় প্রার্থনার এই সঠিক শব্দগুলো শিখিয়েছেন — শয়তানদের কুমন্ত্রণা এবং এমনকি তাদের উপস্থিতি থেকেও।',
      ref: { text: 'Quran 23:97-98', url: 'https://quran.com/23/97' },
    },
  },
  {
    id: 'dua-forgive-mercy',
    surah: 23,
    fromAyah: 118,
    toAyah: 118,
    emoji: '💧',
    title: 'Forgive and have mercy — the best of the merciful',
    titleBn: 'ক্ষমা করুন ও রহম করুন — শ্রেষ্ঠ দয়ালু',
    context: {
      text: 'The closing āyah of Sūrat al-Muʾminūn — the Quran ends the sūrah of the successful believers with this simple plea.',
      textBn:
        'সূরা আল-মুমিনূনের সমাপনী আয়াত — কুরআন সফল মুমিনদের সূরাটি এই সাধারণ আকুতি দিয়ে শেষ করে।',
      ref: { text: 'Quran 23:118', url: 'https://quran.com/23/118' },
    },
  },
  {
    id: 'dua-coolness-eyes',
    surah: 25,
    fromAyah: 74,
    toAyah: 74,
    emoji: '👨‍👩‍👧',
    title: 'Spouses & children — coolness of eyes',
    titleBn: 'স্ত্রী ও সন্তান — চোখের শীতলতা',
    context: {
      text: "One of the marks of ʿIbād ar-Raḥmān — the servants of the Most Merciful (25:63-77) — asking that one's own family become the delight of the eyes and that one lead the righteous.",
      textBn:
        'ইবাদুর রহমান — পরম দয়াময়ের বান্দাদের (২৫:৬৩-৭৭) বৈশিষ্ট্যগুলোর একটি — নিজের পরিবার যেন চোখের প্রশান্তি হয় এবং নিজে যেন সৎকর্মশীলদের নেতৃত্বে থাকে, তার প্রার্থনা।',
      ref: { text: 'Quran 25:63-77', url: 'https://quran.com/25/74' },
    },
  },
  {
    id: 'dua-musa-need',
    surah: 28,
    fromAyah: 24,
    toAyah: 24,
    emoji: '🌾',
    title: 'Mūsā — I am in need of whatever good You send',
    titleBn: 'মূসা (আ) — আপনি যে কল্যাণ পাঠান, আমি তার মুখাপেক্ষী',
    context: {
      text: "Mūsā (as) — alone, penniless, a fugitive in Madyan — watered the two women's flock, then turned to the shade and said this. Provision, shelter, work and marriage followed within the same page.",
      textBn:
        'মূসা (আ) — একা, নিঃস্ব, মাদইয়ানে পলাতক — দুই নারীর পশুপালকে পানি পান করিয়ে ছায়ায় ফিরে এই কথা বলেছিলেন। রিযিক, আশ্রয়, কাজ ও বিবাহ একই ঘটনার মধ্যে এসেছিল।',
      ref: { text: 'Quran 28:22-28', url: 'https://quran.com/28/24' },
    },
  },
  {
    id: 'dua-offspring',
    surah: 3,
    fromAyah: 38,
    toAyah: 38,
    emoji: '🌱',
    title: 'Zakariyyā — grant me pure offspring',
    titleBn: 'যাকারিয়া (আ) — আমাকে পবিত্র সন্তান দান করুন',
    context: {
      text: 'Zakariyyā (as), moved by seeing Allah provide for Maryam, asked for a good child despite old age — and was given Yaḥyā while still standing in prayer.',
      textBn:
        'যাকারিয়া (আ), আল্লাহ মারইয়ামের জন্য যেভাবে রিযিকের ব্যবস্থা করেছেন তা দেখে অনুপ্রাণিত হয়ে বার্ধক্য সত্ত্বেও একটি সৎ সন্তান কামনা করেন — এবং সালাতে দাঁড়িয়ে থাকা অবস্থাতেই তাকে ইয়াহইয়া দান করা হয়।',
      ref: { text: 'Quran 3:37-39', url: 'https://quran.com/3/38' },
    },
  },
  {
    id: 'dua-patience-firmness',
    surah: 2,
    fromAyah: 250,
    toAyah: 250,
    emoji: '🏔️',
    title: 'Pour patience upon us, make our feet firm',
    titleBn: 'আমাদের উপর ধৈর্য ঢেলে দিন, আমাদের পা স্থির রাখুন',
    context: {
      text: "Said by Ṭālūt's small band of believers as they faced Jālūt's army — the duʿā of standing firm when outnumbered.",
      textBn:
        "তালূতের ক্ষুদ্র মুমিন বাহিনী জালূতের সেনাবাহিনীর মুখোমুখি হয়ে এই দু'আ বলেছিল — সংখ্যায় কম হলেও অবিচল থাকার দু'আ।",
      ref: { text: 'Quran 2:249-251', url: 'https://quran.com/2/250' },
    },
  },
];
