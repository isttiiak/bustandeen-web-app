// The curated zikr library (Istiak's plan): categorized, hadith-verified
// adhkār that users ADD to their own counter list from Settings — the
// database defaults stay untouched. Every reference links to sunnah.com
// with the exact number; grades below ṣaḥīḥ are noted.
//
// For LONG adhkār `arabic`/`meaning` hold the FULL text (shown in the
// expandable reference card under the counter), while `shortArabic` /
// `shortMeaning` are the compact versions the counter card displays.

export interface LibraryZikr {
  /** The counter key — what appears in the dropdown when added */
  name: string;
  /** FULL Arabic text (complete, never truncated) */
  arabic: string;
  /** Romanised pronunciation, shown under the Arabic so a non-Arabic reader
   * can still say it correctly. Long adhkār are elided with "…" — the point is
   * to guide the tongue, not to replace the Arabic. */
  transliteration?: string;
  /** FULL meaning */
  meaning: string;
  /** Bengali translation of `meaning` (full sense, natural idiomatic Bengali —
   * not a word-for-word rendering, and never more than `meaning` says). */
  meaningBn?: string;
  /** Compact Arabic for the counter card (falls back to `arabic`) */
  shortArabic?: string;
  /** Compact meaning for the counter card (falls back to `meaning`) */
  shortMeaning?: string;
  source: string;
  sourceUrl: string;
  grade?: string;
  virtue?: string;
  /** Bengali translation of `virtue` — only set when `virtue` exists. */
  virtueBn?: string;
}

export interface ZikrCategory {
  id: string;
  title: string;
  /** Bengali translation of `title`. */
  titleBn?: string;
  emoji: string;
  blurb: string;
  /** Bengali translation of `blurb`. */
  blurbBn?: string;
  items: LibraryZikr[];
}

/** The full post-ṣalāh tahlīl (Ṣaḥīḥ Muslim 597a) — the phrase that completes
 * the hundred after 33+33+33. Exported as a constant because the salat→zikr
 * wiring increments this exact counter key; never rename it without a
 * migration (the key is a Map key in User.zikrTotals). */
export const TAHLIL_NAME = 'La ilaha illallahu wahdahu la sharika lah';

/** The counter's built-in dhikr — stored app-side, merged on every mount.
 * Shared so the Settings library never mistakes them for user customs. */
export const PREDEFINED_TYPES = [
  'SubhanAllah',
  'Alhamdulillah',
  'Allahu Akbar',
  'La ilaha illallah',
  TAHLIL_NAME,
  'Astaghfirullah',
  'SubhanAllah wa bihamdihi',
  'La hawla wa la quwwata illa billah',
  'SubhanAllah wal hamdulillah wa la ilaha illAllah wa Allahu akbar',
  'Ayatul Kursi',
  'Durud Ibrahim',
];

/** Bengali display names (transliteration) for the built-in dhikr above — the
 * English strings in PREDEFINED_TYPES stay unchanged (they're Map keys in
 * User.zikrTotals on the backend); this only swaps what's RENDERED. Custom
 * user-added dhikr have no entry here and fall back to their raw text. */
const ZIKR_DISPLAY_BN: Record<string, string> = {
  SubhanAllah: 'সুবহানাল্লাহ',
  Alhamdulillah: 'আলহামদুলিল্লাহ',
  'Allahu Akbar': 'আল্লাহু আকবার',
  'La ilaha illallah': 'লা ইলাহা ইল্লাল্লাহ',
  [TAHLIL_NAME]: 'লা ইলাহা ইল্লাল্লাহু ওয়াহদাহু লা শারিকা লাহ',
  Astaghfirullah: 'আস্তাগফিরুল্লাহ',
  'SubhanAllah wa bihamdihi': 'সুবহানাল্লাহি ওয়া বিহামদিহি',
  'La hawla wa la quwwata illa billah': 'লা হাওলা ওয়ালা কুওয়াতা ইল্লা বিল্লাহ',
  'SubhanAllah wal hamdulillah wa la ilaha illAllah wa Allahu akbar':
    'সুবহানাল্লাহি ওয়াল হামদুলিল্লাহি ওয়ালা ইলাহা ইল্লাল্লাহু ওয়াল্লাহু আকবার',
  'Ayatul Kursi': 'আয়াতুল কুরসি',
  'Durud Ibrahim': 'দরুদে ইব্রাহীম',
  // Extended coverage: every remaining unique `name` across ZIKR_LIBRARY's
  // categories (the ones above are the built-in predefined types; these are
  // the rest of the curated library).
  'SubhanAllahil-Azim wa bihamdihi': 'সুবহানাল্লাহিল আযীমি ওয়া বিহামদিহি',
  "SubhanAllahi 'adada khalqihi": 'সুবহানাল্লাহি আদাদা খালক্বিহি',
  'Astaghfirullah wa atubu ilayh': 'আস্তাগফিরুল্লাহ ওয়া আতুবু ইলাইহ',
  'Sayyidul-Istighfar': 'সাইয়িদুল ইস্তিগফার',
  ['Astaghfirullah alladhi la ilaha illa huwal-Hayyul-Qayyum wa atubu ilayh']:
    'আস্তাগফিরুল্লাহাল্লাযী লা ইলাহা ইল্লা হুওয়াল হাইয়্যুল কাইয়্যুমু ওয়া আতুবু ইলাইহ',
  ['Astaghfirullahal-Azim alladhi la ilaha illa huwal-Hayyul-Qayyum wa atubu ilayh']:
    'আস্তাগফিরুল্লাহাল আযীমাল্লাযী লা ইলাহা ইল্লা হুওয়াল হাইয়্যাল কাইয়্যুমা ওয়া আতুবু ইলাইহ',
  'Allahumma salli wa sallim ala Nabiyyina Muhammad':
    'আল্লাহুম্মা সাল্লি ওয়া সাল্লিম আলা নাবিয়্যিনা মুহাম্মাদ',
  "HasbunAllahu wa ni'mal-wakil": "হাসবুনাল্লাহু ওয়া নি'মাল ওয়াকিল",
  'Ya Hayyu Ya Qayyum': 'ইয়া হাইয়ু ইয়া ক্বাইয়ূম',
  'Ya Dhal-Jalali wal-Ikram': 'ইয়া যাল জালালি ওয়াল ইকরাম',
  'Bismillahilladhi la yadurru': 'বিসমিল্লাহিল্লাযী লা ইয়াদুররু',
  "A'udhu bikalimatillahit-tammat": 'আঊযু বিকালিমাতিল্লাহিত তাম্মাত',
};

/** Translate a (predefined) dhikr's counter-key name for display — falls
 * back to the raw name for custom/unlisted dhikr and non-Bengali languages. */
export function zikrDisplayName(name: string, lang: string): string {
  if (lang !== 'bn') return name;
  return ZIKR_DISPLAY_BN[name] ?? name;
}

/** Dhikr the app depends on STRUCTURALLY: the salat tracker writes tasbīḥ
 * counts into the first four and Ayatul Kursi into the fifth, so removing any
 * of them would break that wiring. Istighfār is included at Istiak's request
 * (the Prophet ﷺ sought forgiveness more than seventy times a day —
 * Ṣaḥīḥ al-Bukhārī 6307). These cannot be deleted from the counter list. */
export const CORE_ZIKR = [
  'SubhanAllah',
  'Alhamdulillah',
  'Allahu Akbar',
  TAHLIL_NAME,
  'Ayatul Kursi',
  'Astaghfirullah',
];

export const isCoreZikr = (name: string): boolean =>
  CORE_ZIKR.some((c) => c.toLowerCase() === name.trim().toLowerCase());

/** Earlier names of renamed library items — still recognized as
 * library-owned so they never show up as "your custom additions". */
export const LEGACY_LIBRARY_NAMES = [
  'Salli wa sallim ala Nabiyyina Muhammad',
  'Astaghfirullahal-Azim',
];

/** Old counter names that now resolve to a renamed library entry, so users who
 * added the old name keep their reference card and don't see a second "Add". */
export const LEGACY_NAME_ALIASES: Record<string, string> = {
  'astaghfirullahal-azim':
    'Astaghfirullahal-Azim alladhi la ilaha illa huwal-Hayyul-Qayyum wa atubu ilayh',
};

export const ZIKR_LIBRARY: ZikrCategory[] = [
  {
    id: 'tasbih',
    title: 'Tasbīḥ & praise',
    titleBn: 'তাসবীহ ও প্রশংসা',
    emoji: '📿',
    blurb: 'The everyday polish of the heart.',
    blurbBn: 'হৃদয়ের প্রাত্যহিক পরিশুদ্ধি।',
    items: [
      {
        name: 'SubhanAllah',
        arabic: 'سُبْحَانَ اللهِ',
        transliteration: 'Subḥāna-llāh',
        meaning: 'Glory be to Allah — exalting Him above every imperfection',
        meaningBn: 'আল্লাহর পবিত্রতা ঘোষণা — তাঁকে সকল ত্রুটি ও অসম্পূর্ণতার ঊর্ধ্বে ঘোষণা করা',
        virtue: '100 tasbīḥs — a thousand good deeds recorded, or a thousand sins erased.',
        virtueBn: '১০০ বার তাসবীহ পাঠ করলে এক হাজার নেকি লেখা হয়, অথবা এক হাজার গুনাহ মুছে যায়।',
        source: 'Muslim 2698',
        sourceUrl: 'https://sunnah.com/muslim:2698',
      },
      {
        name: 'Alhamdulillah',
        arabic: 'الْحَمْدُ لِلَّهِ',
        transliteration: 'Al-ḥamdu li-llāh',
        meaning: 'All praise is due to Allah',
        meaningBn: 'সকল প্রশংসা আল্লাহরই প্রাপ্য',
        virtue: '"Alḥamdulillāh fills the Scale."',
        virtueBn: '"আলহামদুলিল্লাহ মীযান (আমলের পাল্লা) পূর্ণ করে দেয়।"',
        source: 'Muslim 223',
        sourceUrl: 'https://sunnah.com/muslim:223',
      },
      {
        name: 'Allahu Akbar',
        arabic: 'اللهُ أَكْبَرُ',
        transliteration: 'Allāhu Akbar',
        meaning: 'Allah is the Greatest — greater than everything that occupies the heart',
        meaningBn: 'আল্লাহ সর্বশ্রেষ্ঠ — হৃদয়ে স্থান পাওয়া সবকিছুর চেয়ে তিনি মহান',
        virtue: 'One of the four most beloved words to Allah.',
        virtueBn: 'আল্লাহর নিকট সর্বাধিক প্রিয় চারটি বাক্যের একটি।',
        source: 'Muslim 2137',
        sourceUrl: 'https://sunnah.com/muslim:2137',
      },
      {
        name: 'SubhanAllah wa bihamdihi',
        arabic: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ',
        transliteration: 'Subḥāna-llāhi wa bi-ḥamdih',
        meaning: 'Glory be to Allah and praise Him',
        meaningBn: 'আল্লাহর পবিত্রতা ঘোষণা এবং তাঁর প্রশংসা করা',
        virtue: '100× a day — sins wiped away even if like the foam of the sea.',
        virtueBn: 'দিনে ১০০ বার পাঠ করলে গুনাহ মুছে যায়, যদিও তা সমুদ্রের ফেনার সমান হয়।',
        source: 'Bukhārī 6405',
        sourceUrl: 'https://sunnah.com/bukhari:6405',
      },
      {
        name: 'SubhanAllahil-Azim wa bihamdihi',
        arabic: 'سُبْحَانَ اللهِ الْعَظِيمِ وَبِحَمْدِهِ',
        transliteration: 'Subḥāna-llāhil-ʿAẓīmi wa bi-ḥamdih',
        meaning: 'Glory be to Allah the Magnificent, and praise Him',
        meaningBn: 'মহান আল্লাহর পবিত্রতা ঘোষণা এবং তাঁর প্রশংসা করা',
        virtue: 'Two phrases light on the tongue, heavy on the Scale, beloved to ar-Raḥmān.',
        virtueBn:
          'দুটি বাক্য — জিহ্বায় হালকা, কিন্তু আমলের পাল্লায় ভারী, এবং পরম দয়াময়ের (আর-রাহমান) নিকট প্রিয়।',
        source: 'Bukhārī 6682',
        sourceUrl: 'https://sunnah.com/bukhari:6682',
      },
      {
        name: "SubhanAllahi 'adada khalqihi",
        arabic: 'سُبْحَانَ اللهِ عَدَدَ خَلْقِهِ',
        transliteration:
          'Subḥāna-llāhi ʿadada khalqih, wa riḍā nafsih, wa zinata ʿarshih, wa midāda kalimātih',
        meaning: 'Glory be to Allah as many times as the number of His creation',
        meaningBn: 'আল্লাহর পবিত্রতা ঘোষণা তাঁর সৃষ্টির সংখ্যা পরিমাণ বার',
        virtue: 'Taught to Juwayriyah (ra) — words that outweigh hours of dhikr.',
        virtueBn:
          'জুওয়াইরিয়াহ (রা.)-কে শেখানো হয়েছিল — এমন কিছু কথা যা ঘণ্টাব্যাপী পাঠ করা যিকিরের চেয়েও বেশি ওজনদার।',
        source: 'Muslim 2726',
        sourceUrl: 'https://sunnah.com/muslim:2726',
      },
    ],
  },
  {
    id: 'istighfar',
    title: 'Istighfār — seeking forgiveness',
    titleBn: 'ইস্তিগফার — ক্ষমা প্রার্থনা',
    emoji: '🌧️',
    blurb: 'Many doors to the same mercy — each with its own words.',
    blurbBn: 'একই দয়ার দিকে বহু দরজা — প্রতিটির নিজস্ব শব্দ রয়েছে।',
    items: [
      {
        name: 'Astaghfirullah',
        arabic: 'أَسْتَغْفِرُ اللهَ',
        transliteration: 'Astaghfiru-llāh',
        meaning: 'I seek the forgiveness of Allah',
        meaningBn: 'আমি আল্লাহর কাছে ক্ষমা প্রার্থনা করছি',
        virtue: 'The Prophet ﷺ sought forgiveness a hundred times a day.',
        virtueBn: 'নবী ﷺ দিনে একশতবার ক্ষমা প্রার্থনা করতেন।',
        source: 'Muslim 2702',
        sourceUrl: 'https://sunnah.com/muslim:2702',
      },
      {
        name: 'Astaghfirullah wa atubu ilayh',
        arabic: 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ',
        transliteration: 'Astaghfiru-llāha wa atūbu ilayh',
        meaning: 'I seek the forgiveness of Allah and repent to Him',
        meaningBn: 'আমি আল্লাহর কাছে ক্ষমা প্রার্থনা করছি এবং তাঁর কাছে তওবা করছি',
        virtue: 'The Prophet ﷺ said it more than seventy times a day.',
        virtueBn: 'নবী ﷺ দিনে সত্তরের অধিকবার এটি পাঠ করতেন।',
        source: 'Bukhārī 6307',
        sourceUrl: 'https://sunnah.com/bukhari:6307',
      },
      {
        name: 'Sayyidul-Istighfar',
        arabic:
          'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
        transliteration: 'Allāhumma anta Rabbī, lā ilāha illā anta, khalaqtanī wa ana ʿabduk…',
        meaning:
          'O Allah, You are my Lord — none has the right to be worshipped but You. You created me and I am Your slave, and I abide by Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge before You Your blessing upon me, and I acknowledge my sin — so forgive me, for none forgives sins but You.',
        meaningBn:
          'হে আল্লাহ, তুমি আমার রব — তুমি ব্যতীত সত্যিকারের উপাস্য আর কেউ নেই। তুমি আমাকে সৃষ্টি করেছ, আর আমি তোমার বান্দা; আমি যথাসাধ্য তোমার সাথে কৃত অঙ্গীকার ও প্রতিশ্রুতির উপর প্রতিষ্ঠিত আছি। আমি যা করেছি তার অনিষ্ট থেকে তোমার কাছে আশ্রয় চাই। আমার প্রতি তোমার অনুগ্রহ আমি স্বীকার করছি, এবং আমার গুনাহও স্বীকার করছি — অতএব আমাকে ক্ষমা কর, কেননা তুমি ছাড়া আর কেউ গুনাহ ক্ষমা করে না।',
        shortArabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ…',
        shortMeaning: 'The master supplication of forgiveness — expand below for the full words',
        virtue: 'Said with conviction in the day or night — Paradise for the one who dies upon it.',
        virtueBn:
          'দৃঢ় বিশ্বাসের সাথে দিনে বা রাতে এটি পাঠ করলে এবং সেদিনই বা রাতেই মৃত্যুবরণ করলে সে জান্নাতে প্রবেশ করবে।',
        source: 'Bukhārī 6306',
        sourceUrl: 'https://sunnah.com/bukhari:6306',
      },
      {
        name: 'Astaghfirullah alladhi la ilaha illa huwal-Hayyul-Qayyum wa atubu ilayh',
        arabic:
          'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
        transliteration:
          'Astaghfiru-llāhal-ladhī lā ilāha illā huwal-Ḥayyul-Qayyūmu wa atūbu ilayh',
        meaning:
          'I seek forgiveness of Allah, there is none worthy of worship but Him, the Ever-Living, the Sustainer, and I repent to Him',
        meaningBn:
          'আমি আল্লাহর কাছে ক্ষমা প্রার্থনা করছি, যিনি ছাড়া সত্যিকারের উপাস্য আর কেউ নেই, যিনি চিরঞ্জীব, সবকিছুর ধারক — এবং আমি তাঁর কাছে তওবা করছি',
        shortArabic: 'أَسْتَغْفِرُ اللَّهَ الَّذِي لَا إِلَهَ إِلَّا هُوَ…',
        shortMeaning:
          'I seek forgiveness of Allah, the Ever-Living, the Sustainer — expand below for the full words',
        virtue: 'Forgiven — even one who fled from battle.',
        virtueBn: 'ক্ষমা করে দেওয়া হয় — এমনকি যুদ্ধক্ষেত্র থেকে পলায়নকারীকেও।',
        source: 'Abū Dāwūd 1517',
        sourceUrl: 'https://sunnah.com/abudawud:1517',
        grade: 'Ṣaḥīḥ (al-Albānī)',
      },
      {
        name: 'Astaghfirullahal-Azim alladhi la ilaha illa huwal-Hayyul-Qayyum wa atubu ilayh',
        arabic:
          'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ',
        transliteration:
          'Astaghfiru-llāhal-ʿAẓīmal-ladhī lā ilāha illā huwal-Ḥayyal-Qayyūma wa atūbu ilayh',
        meaning:
          'I seek forgiveness of Allah the Magnificent, there is none worthy of worship but Him, the Ever-Living, the Sustainer, and I repent to Him',
        meaningBn:
          'আমি মহান আল্লাহর কাছে ক্ষমা প্রার্থনা করছি, যিনি ছাড়া সত্যিকারের উপাস্য আর কেউ নেই, যিনি চিরঞ্জীব, সবকিছুর ধারক — এবং আমি তাঁর কাছে তওবা করছি',
        shortArabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ…',
        shortMeaning:
          'I seek forgiveness of Allah the Magnificent — expand below for the full words',
        virtue: 'Forgiven — even one who fled from battle.',
        virtueBn: 'ক্ষমা করে দেওয়া হয় — এমনকি যুদ্ধক্ষেত্র থেকে পলায়নকারীকেও।',
        source: 'Tirmidhī 3577',
        sourceUrl: 'https://sunnah.com/tirmidhi:3577',
        grade: 'Ḥasan',
      },
    ],
  },
  {
    id: 'salawat',
    title: 'Ṣalawāt upon the Prophet ﷺ',
    titleBn: 'নবী ﷺ-এর প্রতি দরূদ',
    emoji: '💚',
    blurb: 'One ṣalawāt from you — ten from Allah upon you (Muslim 408).',
    blurbBn: 'তোমার একটি দরূদের বিনিময়ে আল্লাহ তোমার প্রতি দশটি রহমত বর্ষণ করেন (মুসলিম ৪০৮)।',
    items: [
      {
        name: 'Durud Ibrahim',
        arabic:
          'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
        transliteration:
          'Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā ṣallayta ʿalā Ibrāhīm…',
        meaning:
          'O Allah, send Your mercy upon Muhammad and the family of Muhammad, as You sent Your mercy upon Ibrāhīm and the family of Ibrāhīm; You are indeed Praiseworthy, Most Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrāhīm and the family of Ibrāhīm; You are indeed Praiseworthy, Most Glorious.',
        meaningBn:
          'হে আল্লাহ, মুহাম্মাদ ও মুহাম্মাদের পরিবারবর্গের প্রতি রহমত বর্ষণ কর, যেমন তুমি ইবরাহীম ও ইবরাহীমের পরিবারবর্গের প্রতি রহমত বর্ষণ করেছিলে; নিশ্চয়ই তুমি প্রশংসিত, মহিমান্বিত। হে আল্লাহ, মুহাম্মাদ ও মুহাম্মাদের পরিবারবর্গকে বরকতময় কর, যেমন তুমি ইবরাহীম ও ইবরাহীমের পরিবারবর্গকে বরকতময় করেছিলে; নিশ্চয়ই তুমি প্রশংসিত, মহিমান্বিত।',
        shortArabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ…',
        shortMeaning:
          'The complete ṣalawāt recited in every salat — expand below for the full words',
        source: 'Bukhārī 3370',
        sourceUrl: 'https://sunnah.com/bukhari:3370',
      },
      {
        name: 'Allahumma salli wa sallim ala Nabiyyina Muhammad',
        arabic: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ',
        transliteration: 'Allāhumma ṣalli wa sallim ʿalā Nabiyyinā Muḥammad',
        meaning:
          'O Allah, send prayers and peace upon our Prophet Muhammad — the short ṣalawāt for constant repetition',
        meaningBn:
          'হে আল্লাহ, আমাদের নবী মুহাম্মাদের প্রতি রহমত ও শান্তি বর্ষণ কর — অবিরাম পাঠের উপযোগী সংক্ষিপ্ত দরূদ',
        source: 'Ḥiṣn al-Muslim 98',
        sourceUrl: 'https://sunnah.com/hisn:98',
      },
    ],
  },
  {
    id: 'kalimat',
    title: 'The weighty words',
    titleBn: 'ওজনদার বাক্যসমূহ',
    emoji: '⚖️',
    blurb: 'Short sentences the Prophet ﷺ called treasures.',
    blurbBn: 'সংক্ষিপ্ত কিছু বাক্য, যাকে নবী ﷺ ধনভাণ্ডার বলে আখ্যায়িত করেছেন।',
    items: [
      {
        name: 'La ilaha illallah',
        arabic: 'لَا إِلَهَ إِلَّا اللهُ',
        transliteration: 'Lā ilāha illā-llāh',
        meaning: 'There is no god but Allah',
        meaningBn: 'আল্লাহ ব্যতীত কোনো সত্যিকারের উপাস্য নেই',
        virtue: 'The best of remembrance.',
        virtueBn: 'সর্বোত্তম যিকির।',
        source: 'Tirmidhī 3383',
        sourceUrl: 'https://sunnah.com/tirmidhi:3383',
        grade: 'Ḥasan',
      },
      {
        name: 'La ilaha illallahu wahdahu la sharika lah',
        arabic:
          'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
        transliteration:
          'Lā ilāha illā-llāhu waḥdahu lā sharīka lah, lahul-mulku wa lahul-ḥamdu wa huwa ʿalā kulli shayʾin qadīr',
        meaning:
          'None has the right to be worshipped but Allah alone, without partner; His is the dominion and the praise, and He is able to do all things',
        meaningBn:
          'আল্লাহ ব্যতীত সত্যিকারের কোনো উপাস্য নেই, তিনি এক, তাঁর কোনো শরীক নেই; রাজত্ব তাঁরই এবং সকল প্রশংসা তাঁরই, আর তিনি সর্ববিষয়ে সর্বশক্তিমান',
        shortArabic: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ…',
        shortMeaning: 'None has the right to be worshipped but Allah alone, without partner…',
        virtue:
          '100× a day — like freeing ten slaves, a hundred good deeds, protection from Shayṭān (Bukhārī 3293). Said once after 33+33+33 it completes the hundred after every prayer: "his sins are forgiven even if they are like the foam of the sea."',
        virtueBn:
          'দিনে ১০০ বার পাঠ করলে তা দশজন দাস মুক্ত করার সমান, একশটি নেকি লেখা হয়, এবং শয়তান থেকে সুরক্ষা মেলে (বুখারী ৩২৯৩)। প্রতি নামাযের পর ৩৩+৩৩+৩৩ বার তাসবীহের শেষে একবার পাঠ করলে তা শতক পূর্ণ করে: "তার গুনাহ ক্ষমা করে দেওয়া হয়, যদিও তা সমুদ্রের ফেনার সমান হয়।"',
        source: 'Muslim 597a',
        sourceUrl: 'https://sunnah.com/muslim:597',
      },
      {
        name: 'La hawla wa la quwwata illa billah',
        arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
        transliteration: 'Lā ḥawla wa lā quwwata illā bi-llāh',
        meaning: 'There is no power nor might except with Allah',
        meaningBn: 'আল্লাহর সাহায্য ব্যতীত কোনো শক্তি বা সামর্থ্য নেই',
        virtue: 'A treasure from the treasures of Paradise.',
        virtueBn: 'জান্নাতের ধনভাণ্ডারসমূহের একটি ধনভাণ্ডার।',
        source: 'Bukhārī 4205',
        sourceUrl: 'https://sunnah.com/bukhari:4205',
      },
      {
        name: "HasbunAllahu wa ni'mal-wakil",
        arabic: 'حَسْبُنَا اللهُ وَنِعْمَ الْوَكِيلُ',
        transliteration: 'Ḥasbunā-llāhu wa niʿmal-wakīl',
        meaning: 'Allah is sufficient for us, and the best Disposer of affairs',
        meaningBn: 'আল্লাহই আমাদের জন্য যথেষ্ট, আর তিনিই সর্বোত্তম কর্মবিধায়ক',
        virtue: 'Said by Ibrāhīm (as) in the fire and by the Prophet ﷺ when facing armies.',
        virtueBn:
          'ইবরাহীম (আ.) আগুনে নিক্ষিপ্ত হওয়ার সময় এবং নবী ﷺ শত্রুবাহিনীর মুখোমুখি হওয়ার সময় এটি পাঠ করেছিলেন।',
        source: 'Bukhārī 4563',
        sourceUrl: 'https://sunnah.com/bukhari:4563',
      },
    ],
  },
  {
    id: 'asma',
    title: 'Calling on His Names',
    titleBn: 'তাঁর নামসমূহে আহ্বান',
    emoji: '✨',
    blurb: 'Duʿā-dhikr built on al-Asmāʾ al-Ḥusnā (Bukhārī 2736).',
    blurbBn: 'আল-আসমাউল হুসনার (আল্লাহর সুন্দর নামসমূহ) ভিত্তিতে গঠিত দুআ-যিকির (বুখারী ২৭৩৬)।',
    items: [
      {
        name: 'Ya Hayyu Ya Qayyum',
        arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
        transliteration: 'Yā Ḥayyu yā Qayyūm, bi-raḥmatika astaghīth',
        meaning: 'O Ever-Living, O Sustainer — by Your mercy I seek relief',
        meaningBn:
          'হে চিরঞ্জীব, হে সর্বসত্তার ধারক — তোমার দয়ার মাধ্যমে আমি সাহায্য প্রার্থনা করছি',
        virtue: 'The Prophet ﷺ said it in times of distress.',
        virtueBn: 'বিপদের সময় নবী ﷺ এটি পাঠ করতেন।',
        source: 'Tirmidhī 3524',
        sourceUrl: 'https://sunnah.com/tirmidhi:3524',
        grade: 'Ḥasan',
      },
      {
        name: 'Ya Dhal-Jalali wal-Ikram',
        arabic: 'يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
        transliteration: 'Yā Dhal-Jalāli wal-Ikrām',
        meaning: 'O Possessor of Majesty and Honour',
        meaningBn: 'হে মহিমা ও সম্মানের অধিকারী',
        virtue: '"Hold fast to (this)" — the Prophet ﷺ commanded.',
        virtueBn: '"এটি (দৃঢ়ভাবে) আঁকড়ে ধর" — নবী ﷺ এই নির্দেশ দিয়েছিলেন।',
        source: 'Tirmidhī 3525',
        sourceUrl: 'https://sunnah.com/tirmidhi:3525',
        grade: 'Ḥasan',
      },
    ],
  },
  {
    id: 'protection',
    title: 'Morning · evening · protection',
    titleBn: 'সকাল · সন্ধ্যা · সুরক্ষা',
    emoji: '🛡️',
    blurb: 'The daily fortress.',
    blurbBn: 'দৈনন্দিন সুরক্ষা-দুর্গ।',
    items: [
      {
        name: 'Bismillahilladhi la yadurru',
        arabic:
          'بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        transliteration:
          'Bismi-llāhil-ladhī lā yaḍurru maʿa-smihi shayʾun fil-arḍi wa lā fis-samāʾ, wa huwas-Samīʿul-ʿAlīm',
        meaning:
          'In the name of Allah with whose name nothing on earth or in heaven can harm; He is the All-Hearing, All-Knowing',
        meaningBn:
          'আল্লাহর নামে, যাঁর নামের সাথে পৃথিবী বা আকাশে কোনো কিছুই ক্ষতি করতে পারে না; তিনি সর্বশ্রোতা, সর্বজ্ঞ',
        shortArabic: 'بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ…',
        shortMeaning: 'In the name of Allah with whose name nothing can harm…',
        virtue: '3× morning and evening — nothing will harm you.',
        virtueBn: 'সকাল ও সন্ধ্যায় ৩ বার পাঠ করলে কোনো কিছুই তোমার ক্ষতি করতে পারবে না।',
        source: 'Tirmidhī 3388',
        sourceUrl: 'https://sunnah.com/tirmidhi:3388',
        grade: 'Ḥasan ṣaḥīḥ',
      },
      {
        name: "A'udhu bikalimatillahit-tammat",
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        transliteration: 'Aʿūdhu bi-kalimāti-llāhit-tāmmāti min sharri mā khalaq',
        meaning: 'I seek refuge in the perfect words of Allah from the evil of what He created',
        meaningBn: 'আমি আল্লাহর পরিপূর্ণ বাক্যসমূহের আশ্রয় গ্রহণ করছি তাঁর সৃষ্টির অনিষ্ট থেকে',
        virtue: 'Nothing harms the one who says it in the evening.',
        virtueBn: 'সন্ধ্যায় এটি পাঠকারীর কোনো ক্ষতি হয় না।',
        source: 'Muslim 2708',
        sourceUrl: 'https://sunnah.com/muslim:2708',
      },
    ],
  },
];

/** Look up a library item by its counter name (case-insensitive), including
 * legacy names of renamed entries. */
export function findLibraryZikr(name: string): LibraryZikr | null {
  const lower = name.toLowerCase();
  for (const cat of ZIKR_LIBRARY) {
    for (const item of cat.items) {
      if (item.name.toLowerCase() === lower) return item;
    }
  }
  // Legacy: the short "Astaghfirullahal-Azim" title was replaced by the full wording of Tirmidhī 3577
  const alias = LEGACY_NAME_ALIASES[lower];
  if (alias) return findLibraryZikr(alias);
  // Legacy: the short salawat was renamed to include "Allahumma"
  if (lower === 'salli wa sallim ala nabiyyina muhammad') {
    return findLibraryZikr('Allahumma salli wa sallim ala Nabiyyina Muhammad');
  }
  return null;
}
