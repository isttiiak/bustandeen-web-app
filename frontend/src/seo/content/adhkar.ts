// Curated core Adhkar aṣ-Ṣabāḥ wal-Masā' (morning & evening remembrance)
// for /adhkar/morning and /adhkar/evening. This is a focused, well-verified
// subset (not the full Hisn al-Muslim list) — every reference below was
// checked against sunnah.com/quran.com before being added. The full guided
// swipeable-session version (auto-advance, audio, counts feeding into the
// zikr pipeline) is a separate unstarted feature (TODO-v3.md); these are
// static reference pages.

export interface AdhkarItem {
  id: string;
  title: { en: string; bn: string; ar: string };
  arabic: string;
  transliteration: string;
  translation: { en: string; bn: string };
  repeat: number;
  arabicNote: string;
  reference: { text: string; url: string; grade: string };
}

export const MORNING_ADHKAR: AdhkarItem[] = [
  {
    id: 'ayat-al-kursi',
    title: { en: 'Ayat al-Kursi', bn: 'আয়াতুল কুরসী', ar: 'آية الكرسي' },
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    transliteration:
      "Allahu la ilaha illa Huwal-Hayyul-Qayyum, la ta'khudhuhu sinatun wa la nawm...",
    translation: {
      en: 'Allah — there is no god but Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep. (Quran 2:255, in full)',
      bn: 'আল্লাহ, তিনি ছাড়া কোনো সত্য ইলাহ নেই, তিনি চিরঞ্জীব, সর্বসত্তার ধারক। তাঁকে তন্দ্রাও স্পর্শ করে না, নিদ্রাও না। (সম্পূর্ণ আয়াত, সূরা বাকারা ২৫৫)',
    },
    repeat: 1,
    arabicNote: 'من قرأها في الصباح كان في حفظ الله حتى المساء، وهي أعظم آية في القرآن الكريم.',
    reference: { text: 'Quran 2:255', url: 'https://quran.com/2/255', grade: 'Quran' },
  },
  {
    id: 'three-quls',
    title: { en: 'The Three Quls', bn: 'তিন কুল', ar: 'المعوذات الثلاث' },
    arabic:
      'قُلْ هُوَ اللَّهُ أَحَدٌ ۝ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    transliteration: 'Surah Al-Ikhlas, Al-Falaq, An-Nas — recited three times each',
    translation: {
      en: 'Surah Al-Ikhlas, Al-Falaq and An-Nas, recited three times each — "it will suffice you in all respects."',
      bn: 'সূরা ইখলাস, ফালাক ও নাস — প্রতিটি ৩ বার করে পাঠ করলে "তা সর্ব বিষয়ে যথেষ্ট হয়ে যাবে।"',
    },
    repeat: 3,
    arabicNote: 'من قرأ هذه السور الثلاث ثلاث مرات في الصباح والمساء كفته من كل شيء بإذن الله.',
    reference: {
      text: "Jami' at-Tirmidhi",
      url: 'https://sunnah.com/tirmidhi:3575',
      grade: 'Ḥasan',
    },
  },
  {
    id: 'asbahna',
    title: {
      en: 'Asbaḥnā wa Asbaḥal-Mulku Lillāh',
      bn: 'আসবাহনা ওয়া আসবাহাল মুলকু লিল্লাহ',
      ar: 'أصبحنا وأصبح الملك لله',
    },
    arabic: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Asbahna wa asbahal-mulku lillah, wal-hamdu lillah',
    translation: {
      en: 'We have entered the morning, and with it all dominion belongs to Allah, and all praise is for Allah.',
      bn: 'আমরা সকালে উপনীত হলাম, আর সমস্ত রাজত্ব আল্লাহর, আর সমস্ত প্রশংসাও আল্লাহর জন্য।',
    },
    repeat: 1,
    arabicNote: 'ذكر الصباح المأثور عن النبي ﷺ، يُقابله في المساء: أمسينا وأمسى الملك لله.',
    reference: { text: 'Sahih Muslim', url: 'https://sunnah.com/muslim:2723', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'sayyid-al-istighfar',
    title: { en: 'Sayyid al-Istighfār', bn: 'সাইয়্যিদুল ইসতিগফার', ar: 'سيد الاستغفار' },
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ',
    transliteration: "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka...",
    translation: {
      en: "O Allah, You are my Lord, there is no god but You. You created me and I am Your servant... (full text on the Seeking Forgiveness du'ā page)",
      bn: 'হে আল্লাহ, তুমিই আমার রব, তুমি ছাড়া কোনো সত্য ইলাহ নেই। তুমি আমাকে সৃষ্টি করেছ, আর আমি তোমার বান্দা... (সম্পূর্ণ পাঠ "ক্ষমা প্রার্থনা" পৃষ্ঠায়)',
    },
    repeat: 1,
    arabicNote: 'من قالها موقنًا بها في الصباح فمات من يومه قبل أن يمسي دخل الجنة.',
    reference: { text: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:6306', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'raditu',
    title: { en: 'Raḍītu billāhi Rabba', bn: 'রাদিতু বিল্লাহি রব্বা', ar: 'رضيت بالله ربا' },
    arabic: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا',
    transliteration:
      "Raditu billahi Rabba, wa bil-Islami dina, wa bi-Muhammadin (sallallahu 'alayhi wa sallam) nabiyya",
    translation: {
      en: 'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad ﷺ as my Prophet.',
      bn: 'আমি সন্তুষ্ট আল্লাহকে রব হিসেবে, ইসলামকে দ্বীন হিসেবে, আর মুহাম্মাদ ﷺ-কে নবী হিসেবে পেয়ে।',
    },
    repeat: 3,
    arabicNote: 'من قالها ثلاثًا كان حقًا على الله أن يُرضيه يوم القيامة.',
    reference: { text: 'Sunan Abi Dawud', url: 'https://sunnah.com/abudawud:5072', grade: 'Ḥasan' },
  },
];

export const EVENING_ADHKAR: AdhkarItem[] = [
  MORNING_ADHKAR[0],
  MORNING_ADHKAR[1],
  {
    id: 'amsayna',
    title: {
      en: 'Amsaynā wa Amsal-Mulku Lillāh',
      bn: 'আমসাইনা ওয়া আমসাল মুলকু লিল্লাহ',
      ar: 'أمسينا وأمسى الملك لله',
    },
    arabic: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ',
    transliteration: 'Amsayna wa amsal-mulku lillah, wal-hamdu lillah',
    translation: {
      en: 'We have entered the evening, and with it all dominion belongs to Allah, and all praise is for Allah.',
      bn: 'আমরা সন্ধ্যায় উপনীত হলাম, আর সমস্ত রাজত্ব আল্লাহর, আর সমস্ত প্রশংসাও আল্লাহর জন্য।',
    },
    repeat: 1,
    arabicNote: 'ذكر المساء المقابل لذكر الصباح "أصبحنا وأصبح الملك لله"، مأثور عن النبي ﷺ.',
    reference: { text: 'Sahih Muslim', url: 'https://sunnah.com/muslim:2723', grade: 'Ṣaḥīḥ' },
  },
  MORNING_ADHKAR[3],
  MORNING_ADHKAR[4],
];
