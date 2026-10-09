// Core Adhkar aṣ-Ṣabāḥ wal-Masā' (morning & evening remembrance), shared by
// the guided routine (/library/adhkar, T4.3) and the static /adhkar/morning
// and /adhkar/evening pages. A focused, well-graded subset (not the full
// Hisn al-Muslim list). Every hadith text below was copied from the
// sunnah.com page of the cited number on 2026-10-10 (vowelling as given
// there) and its grade read on that page; the morning wording of
// "Aṣbaḥnā wa aṣbaḥa al-mulku lillāh" is Hisn al-Muslim 77 (sunnah.com/hisn:77),
// which cites Muslim, because Muslim 2723 gives the evening wording in full
// and says the morning is the same. Quran items list their ayahs in `quran`:
// the routine shows the bundled Tanzil text (verbatim); `arabic` is only the
// short excerpt the static pages show.
//
// 2026-10-10: "Raḍītu billāhi Rabba" was removed. It cited Abu Dawud 5072 as
// Ḥasan, but sunnah.com grades 5072 Ḍaʿīf (al-Albānī) and its wording differs.

export interface QuranPart {
  surah: number;
  /** First and last ayah; both absent = the whole surah */
  from?: number;
  to?: number;
}

export interface AdhkarItem {
  id: string;
  title: { en: string; bn: string; ar: string };
  arabic: string;
  /** Quran items: shown from the bundled Tanzil text in the routine */
  quran?: QuranPart[];
  transliteration: string;
  translation: { en: string; bn: string };
  repeat: number;
  arabicNote: string;
  reference: { text: string; url: string; grade: string };
}

const AYAT_AL_KURSI: AdhkarItem = {
  id: 'ayat-al-kursi',
  title: { en: 'Ayat al-Kursi', bn: 'আয়াতুল কুরসী', ar: 'آية الكرسي' },
  arabic:
    'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
  quran: [{ surah: 2, from: 255, to: 255 }],
  transliteration: "Allahu la ilaha illa Huwal-Hayyul-Qayyum, la ta'khudhuhu sinatun wa la nawm...",
  translation: {
    en: 'Allah — there is no god but Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. (Quran 2:255, in full)',
    bn: 'আল্লাহ, তিনি ছাড়া কোনো সত্য ইলাহ নেই, তিনি চিরঞ্জীব, সর্বসত্তার ধারক। তাঁকে তন্দ্রাও স্পর্শ করে না, নিদ্রাও না। (সম্পূর্ণ আয়াত, সূরা বাকারা ২৫৫)',
  },
  repeat: 1,
  arabicNote: 'آية الكرسي من سورة البقرة، الآية ٢٥٥.',
  reference: { text: 'Quran 2:255', url: 'https://quran.com/2/255', grade: 'Quran' },
};

const THREE_QULS: AdhkarItem = {
  id: 'three-quls',
  title: { en: 'The Three Quls', bn: 'তিন কুল', ar: 'المعوذات الثلاث' },
  arabic:
    'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
  quran: [{ surah: 112 }, { surah: 113 }, { surah: 114 }],
  transliteration: 'Surah Al-Ikhlas, Al-Falaq, An-Nas, recited three times each',
  translation: {
    en: 'Surah Al-Ikhlas, Al-Falaq and An-Nas, recited three times each: "it will suffice you in all respects."',
    bn: 'সূরা ইখলাস, ফালাক ও নাস: প্রতিটি ৩ বার করে পাঠ করলে "তা সর্ব বিষয়ে যথেষ্ট হয়ে যাবে।"',
  },
  repeat: 3,
  arabicNote: 'من قرأ هذه السور الثلاث ثلاث مرات في الصباح والمساء كفته من كل شيء بإذن الله.',
  reference: {
    text: 'Jāmiʿ al-Tirmidhī 3575',
    url: 'https://sunnah.com/tirmidhi:3575',
    grade: 'Ḥasan',
  },
};

const SAYYID_AL_ISTIGHFAR: AdhkarItem = {
  id: 'sayyid-al-istighfar',
  title: { en: 'Sayyid al-Istighfār', bn: 'সাইয়্যিদুল ইসতিগফার', ar: 'سيد الاستغفار' },
  arabic:
    'اللَّهُمَّ أَنْتَ رَبِّي، لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَىَّ وَأَبُوءُ لَكَ بِذَنْبِي، فَاغْفِرْ لِي، فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ',
  transliteration:
    "Allahumma anta Rabbi, la ilaha illa anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bi-ni'matika 'alayya wa abu'u laka bi-dhanbi, faghfir li, fa-innahu la yaghfirudh-dhunuba illa anta",
  translation: {
    en: 'O Allah, You are my Lord, there is no god but You. You created me and I am Your servant, and I keep Your covenant and Your promise as far as I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for none forgives sins except You.',
    bn: 'হে আল্লাহ, তুমিই আমার রব, তুমি ছাড়া কোনো সত্য ইলাহ নেই। তুমি আমাকে সৃষ্টি করেছ, আর আমি তোমার বান্দা। আমি সাধ্যমতো তোমার অঙ্গীকার ও প্রতিশ্রুতির উপর আছি। আমি যা করেছি তার অনিষ্ট থেকে তোমার আশ্রয় চাই। আমার উপর তোমার নিয়ামত আমি স্বীকার করি, আর আমার গুনাহও স্বীকার করি। তাই আমাকে ক্ষমা করো, কারণ তুমি ছাড়া কেউ গুনাহ ক্ষমা করতে পারে না।',
  },
  repeat: 1,
  arabicNote: 'من قالها موقنًا بها في الصباح فمات من يومه قبل أن يمسي دخل الجنة.',
  reference: {
    text: 'Ṣaḥīḥ al-Bukhārī 6306',
    url: 'https://sunnah.com/bukhari:6306',
    grade: 'Ṣaḥīḥ',
  },
};

const BISMILLAH: AdhkarItem = {
  id: 'bismillah-la-yadurru',
  title: {
    en: 'Bismillāhil-ladhī lā yaḍurru',
    bn: 'বিসমিল্লাহিল্লাযী লা ইয়াদুররু',
    ar: 'بسم الله الذي لا يضر مع اسمه شيء',
  },
  arabic:
    'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَىْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
  transliteration:
    "Bismillahil-ladhi la yadurru ma'as-mihi shay'un fil-ardi wa la fis-sama'i, wa Huwas-Sami'ul-'Alim",
  translation: {
    en: 'In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.',
    bn: 'আল্লাহর নামে, যাঁর নামের সাথে আসমান ও জমিনের কোনো কিছুই ক্ষতি করতে পারে না, আর তিনি সর্বশ্রোতা, সর্বজ্ঞ।',
  },
  repeat: 3,
  arabicNote: 'من قالها ثلاث مرات حين يصبح وحين يمسي لم تصبه فجأة بلاء، كما في حديث عثمان بن عفان.',
  reference: {
    text: 'Sunan Abī Dāwūd 5088',
    url: 'https://sunnah.com/abudawud:5088',
    grade: 'Ṣaḥīḥ',
  },
};

const SUBHAN_ALLAH_100: AdhkarItem = {
  id: 'subhanallahi-wa-bihamdihi',
  title: {
    en: 'Subḥānallāhi wa biḥamdihī',
    bn: 'সুবহানাল্লাহি ওয়া বিহামদিহি',
    ar: 'سبحان الله وبحمده',
  },
  arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
  transliteration: 'Subhanallahi wa bihamdihi',
  translation: {
    en: 'Glory be to Allah, and all praise is His.',
    bn: 'আমি আল্লাহর পবিত্রতা ঘোষণা করি তাঁর প্রশংসার সাথে।',
  },
  repeat: 100,
  arabicNote:
    'من قالها مائة مرة حين يصبح وحين يمسي لم يأت أحد يوم القيامة بأفضل مما جاء به إلا أحد قال مثل ما قال أو زاد عليه.',
  reference: { text: 'Ṣaḥīḥ Muslim 2692', url: 'https://sunnah.com/muslim:2692', grade: 'Ṣaḥīḥ' },
};

export const MORNING_ADHKAR: AdhkarItem[] = [
  AYAT_AL_KURSI,
  THREE_QULS,
  {
    id: 'asbahna',
    title: {
      en: 'Aṣbaḥnā wa Aṣbaḥal-Mulku Lillāh',
      bn: 'আসবাহনা ওয়া আসবাহাল মুলকু লিল্লাহ',
      ar: 'أصبحنا وأصبح الملك لله',
    },
    arabic:
      'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي القَبْر',
    transliteration:
      "Asbahna wa asbahal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in qadir. Rabbi as'aluka khayra ma fi hadhal-yawmi wa khayra ma ba'dahu, wa a'udhu bika min sharri ma fi hadhal-yawmi wa sharri ma ba'dahu. Rabbi a'udhu bika minal-kasali wa su'il-kibar. Rabbi a'udhu bika min 'adhabin fin-nari wa 'adhabin fil-qabr",
    translation: {
      en: 'We have entered the morning, and with it all dominion belongs to Allah, and all praise is for Allah. There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He has power over all things. My Lord, I ask You for the good of this day and the good of what comes after it, and I seek refuge in You from the evil of this day and the evil of what comes after it. My Lord, I seek refuge in You from laziness and the hardship of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
      bn: 'আমরা সকালে উপনীত হলাম, আর সকল রাজত্ব আল্লাহর, সকল প্রশংসাও আল্লাহর। আল্লাহ ছাড়া কোনো সত্য ইলাহ নেই, তিনি এক, তাঁর কোনো শরিক নেই। রাজত্ব তাঁরই, প্রশংসাও তাঁরই, আর তিনি সব কিছুর উপর ক্ষমতাবান। হে আমার রব, আমি তোমার কাছে এই দিনের কল্যাণ ও এর পরের কল্যাণ চাই, আর এই দিনের অনিষ্ট ও এর পরের অনিষ্ট থেকে তোমার আশ্রয় চাই। হে আমার রব, আমি অলসতা ও বার্ধক্যের কষ্ট থেকে তোমার আশ্রয় চাই। হে আমার রব, আমি জাহান্নামের শাস্তি ও কবরের শাস্তি থেকে তোমার আশ্রয় চাই।',
    },
    repeat: 1,
    arabicNote: 'ذكر الصباح المأثور عن النبي ﷺ، يُقابله في المساء: أمسينا وأمسى الملك لله.',
    reference: { text: 'Ṣaḥīḥ Muslim 2723', url: 'https://sunnah.com/hisn:77', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'bika-asbahna',
    title: {
      en: 'Allāhumma bika aṣbaḥnā',
      bn: 'আল্লাহুম্মা বিকা আসবাহনা',
      ar: 'اللهم بك أصبحنا',
    },
    arabic:
      'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
    transliteration:
      'Allahumma bika asbahna, wa bika amsayna, wa bika nahya, wa bika namutu, wa ilaykal-masir',
    translation: {
      en: 'O Allah, by You we enter the morning and by You we enter the evening, by You we live and by You we die, and to You is the final return.',
      bn: 'হে আল্লাহ, তোমারই অনুগ্রহে আমরা সকালে উপনীত হই, তোমারই অনুগ্রহে সন্ধ্যায় উপনীত হই, তোমারই ইচ্ছায় আমরা বাঁচি ও মরি, আর তোমার দিকেই ফিরে যাওয়া।',
    },
    repeat: 1,
    arabicNote: 'كان النبي ﷺ يعلّمه أصحابه ليقولوه إذا أصبحوا، ويقولون في المساء: اللهم بك أمسينا.',
    reference: {
      text: 'Jāmiʿ al-Tirmidhī 3391',
      url: 'https://sunnah.com/tirmidhi:3391',
      grade: 'Ḥasan',
    },
  },
  SAYYID_AL_ISTIGHFAR,
  BISMILLAH,
  SUBHAN_ALLAH_100,
];

export const EVENING_ADHKAR: AdhkarItem[] = [
  AYAT_AL_KURSI,
  THREE_QULS,
  {
    id: 'amsayna',
    title: {
      en: 'Amsaynā wa Amsal-Mulku Lillāh',
      bn: 'আমসাইনা ওয়া আমসাল মুলকু লিল্লাহ',
      ar: 'أمسينا وأمسى الملك لله',
    },
    arabic:
      'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ وَالْحَمْدُ لِلَّهِ لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَىْءٍ قَدِيرٌ رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    transliteration:
      "Amsayna wa amsal-mulku lillah, wal-hamdu lillah, la ilaha illallahu wahdahu la sharika lah, lahul-mulku wa lahul-hamdu wa Huwa 'ala kulli shay'in qadir. Rabbi as'aluka khayra ma fi hadhihil-laylati wa khayra ma ba'daha, wa a'udhu bika min sharri ma fi hadhihil-laylati wa sharri ma ba'daha. Rabbi a'udhu bika minal-kasali wa su'il-kibar. Rabbi a'udhu bika min 'adhabin fin-nari wa 'adhabin fil-qabr",
    translation: {
      en: 'We have entered the evening, and with it all dominion belongs to Allah, and all praise is for Allah. There is no god but Allah alone, with no partner. His is the dominion and His is the praise, and He has power over all things. My Lord, I ask You for the good of this night and the good of what comes after it, and I seek refuge in You from the evil of this night and the evil of what comes after it. My Lord, I seek refuge in You from laziness and the hardship of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
      bn: 'আমরা সন্ধ্যায় উপনীত হলাম, আর সকল রাজত্ব আল্লাহর, সকল প্রশংসাও আল্লাহর। আল্লাহ ছাড়া কোনো সত্য ইলাহ নেই, তিনি এক, তাঁর কোনো শরিক নেই। রাজত্ব তাঁরই, প্রশংসাও তাঁরই, আর তিনি সব কিছুর উপর ক্ষমতাবান। হে আমার রব, আমি তোমার কাছে এই রাতের কল্যাণ ও এর পরের কল্যাণ চাই, আর এই রাতের অনিষ্ট ও এর পরের অনিষ্ট থেকে তোমার আশ্রয় চাই। হে আমার রব, আমি অলসতা ও বার্ধক্যের কষ্ট থেকে তোমার আশ্রয় চাই। হে আমার রব, আমি জাহান্নামের শাস্তি ও কবরের শাস্তি থেকে তোমার আশ্রয় চাই।',
    },
    repeat: 1,
    arabicNote: 'ذكر المساء المقابل لذكر الصباح "أصبحنا وأصبح الملك لله"، مأثور عن النبي ﷺ.',
    reference: {
      text: 'Ṣaḥīḥ Muslim 2723',
      url: 'https://sunnah.com/muslim:2723b',
      grade: 'Ṣaḥīḥ',
    },
  },
  {
    id: 'bika-amsayna',
    title: {
      en: 'Allāhumma bika amsaynā',
      bn: 'আল্লাহুম্মা বিকা আমসাইনা',
      ar: 'اللهم بك أمسينا',
    },
    arabic:
      'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ',
    transliteration:
      'Allahumma bika amsayna, wa bika asbahna, wa bika nahya, wa bika namutu, wa ilaykan-nushur',
    translation: {
      en: 'O Allah, by You we enter the evening and by You we enter the morning, by You we live and by You we die, and to You is the resurrection.',
      bn: 'হে আল্লাহ, তোমারই অনুগ্রহে আমরা সন্ধ্যায় উপনীত হই, তোমারই অনুগ্রহে সকালে উপনীত হই, তোমারই ইচ্ছায় আমরা বাঁচি ও মরি, আর তোমার কাছেই পুনরুত্থান।',
    },
    repeat: 1,
    arabicNote: 'يقوله المسلم إذا أمسى، كما علّمه النبي ﷺ أصحابه.',
    reference: {
      text: 'Jāmiʿ al-Tirmidhī 3391',
      url: 'https://sunnah.com/tirmidhi:3391',
      grade: 'Ḥasan',
    },
  },
  SAYYID_AL_ISTIGHFAR,
  BISMILLAH,
  {
    id: 'audhu-bi-kalimat',
    title: {
      en: 'Aʿūdhu bi-kalimātillāhit-tāmmāt',
      bn: 'আউযু বিকালিমাতিল্লাহিত তাম্মাত',
      ar: 'أعوذ بكلمات الله التامات',
    },
    arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    transliteration: "A'udhu bi-kalimatillahit-tammati min sharri ma khalaq",
    translation: {
      en: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
      bn: 'আমি আল্লাহর পরিপূর্ণ বাণীসমূহের আশ্রয় চাই, তিনি যা সৃষ্টি করেছেন তার অনিষ্ট থেকে।',
    },
    repeat: 1,
    arabicNote: 'قال النبي ﷺ لمن لدغته عقرب: لو قلت حين أمسيت هذه الكلمات لم تضرك.',
    reference: {
      text: 'Ṣaḥīḥ Muslim 2709',
      url: 'https://sunnah.com/muslim:2709a',
      grade: 'Ṣaḥīḥ',
    },
  },
  SUBHAN_ALLAH_100,
];
