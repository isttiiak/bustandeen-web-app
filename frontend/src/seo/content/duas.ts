// Curated situational du'ā content for /duas/{situation}. Same citation
// discipline as SPECIAL_DAYS in utils/islamicCalendar.ts: every entry links
// to the primary hadith/Quran source with its grading, no paraphrased or
// unsourced "duas." Each hadith reference below was checked against
// sunnah.com before being added here.
//
// `arabicNote` is a short native-Arabic context blurb (not a translation of
// `translation.en`) — the Arabic text of the du'ā itself is already the
// primary content for an Arabic reader, so this adds real Arabic value
// (when/why to say it) rather than a redundant re-translation of the
// English gloss.

export interface DuaEntry {
  id: string;
  situation: { en: string; bn: string; ar: string };
  arabic: string;
  transliteration: string;
  translation: { en: string; bn: string };
  arabicNote: string;
  reference: { text: string; url: string; grade: string };
}

export const DUAS: DuaEntry[] = [
  {
    id: 'travel',
    situation: { en: 'Travel', bn: 'ভ্রমণ', ar: 'السفر' },
    arabic:
      'اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ، اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى',
    transliteration:
      "Allahu Akbar, Allahu Akbar, Allahu Akbar. Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun. Allahumma inna nas'aluka fi safarina hadhal-birra wat-taqwa, wa minal-'amali ma tarda",
    translation: {
      en: 'Allah is Greatest (x3). Glory to Him Who has subjected this to us, for we could never have accomplished this by ourselves, and to our Lord we shall return. O Allah, we ask You for righteousness and piety on this journey of ours, and for deeds that please You.',
      bn: 'আল্লাহু আকবার (৩ বার)। পবিত্র তিনি, যিনি এটিকে আমাদের বশীভূত করে দিয়েছেন, নইলে আমরা কখনও এটা করতে পারতাম না, আর আমরা তো আমাদের রবের দিকেই ফিরে যাব। হে আল্লাহ, আমরা তোমার কাছে এই সফরে নেকি ও তাকওয়া চাই, এবং এমন আমল চাই যাতে তুমি সন্তুষ্ট হও।',
    },
    arabicNote:
      'يُستحب قول هذا الدعاء عند ركوب وسيلة السفر، تذكيرًا بنعمة الله وطلبًا للتوفيق والسلامة في الطريق.',
    reference: { text: 'Sahih Muslim', url: 'https://sunnah.com/muslim:1342', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'illness',
    situation: { en: 'Illness', bn: 'অসুস্থতা', ar: 'المرض' },
    arabic: 'أَسْأَلُ اللَّهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ',
    transliteration: "As'alullaha al-'Azima Rabbal-'Arshil-'Azimi an yashfiyak",
    translation: {
      en: 'I ask Allah, the Mighty, Lord of the Mighty Throne, to heal you.',
      bn: 'আমি মহান আল্লাহর কাছে, মহান আরশের রবের কাছে, তোমাকে সুস্থ করে দেওয়ার জন্য দোয়া করছি।',
    },
    arabicNote:
      'يُستحب أن يقال سبع مرات عند زيارة المريض، وقد ورد أن من قالها ولم يحضر أجله شُفي بإذن الله.',
    reference: {
      text: "Jami' at-Tirmidhi",
      url: 'https://sunnah.com/tirmidhi:2083',
      grade: 'Ḥasan',
    },
  },
  {
    id: 'anxiety',
    situation: { en: 'Anxiety & Grief', bn: 'উদ্বেগ ও দুঃখ', ar: 'الهم والحزن' },
    arabic:
      'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
    transliteration:
      "Allahumma inni a'udhu bika minal-hammi wal-hazani, wal-'ajzi wal-kasali, wal-bukhli wal-jubni, wa dala'id-dayni wa ghalabatir-rijal",
    translation: {
      en: 'O Allah, I seek refuge in You from anxiety and grief, from helplessness and laziness, from miserliness and cowardice, from being overwhelmed by debt and overpowered by others.',
      bn: 'হে আল্লাহ, আমি তোমার কাছে আশ্রয় চাই উদ্বেগ ও দুঃখ থেকে, অক্ষমতা ও অলসতা থেকে, কৃপণতা ও ভীরুতা থেকে, ঋণের বোঝা ও মানুষের প্রাধান্য থেকে।',
    },
    arabicNote:
      'من الأدعية الجامعة التي كان النبي ﷺ يكثر من قولها صباحًا ومساءً لطرد الهم وتفريج الكرب.',
    reference: { text: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:6369', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'exams',
    situation: {
      en: 'Exams & Seeking Knowledge',
      bn: 'পরীক্ষা ও জ্ঞান অর্জন',
      ar: 'الامتحانات وطلب العلم',
    },
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: "Rabbi zidni 'ilma",
    translation: {
      en: 'My Lord, increase me in knowledge.',
      bn: 'হে আমার রব, আমার জ্ঞান বৃদ্ধি করে দাও।',
    },
    arabicNote: 'دعاء قرآني موجز يستحب الإكثار منه قبل المذاكرة والامتحانات وفي طلب العلم بعامة.',
    reference: { text: 'Quran 20:114', url: 'https://quran.com/20/114', grade: 'Quran' },
  },
  {
    id: 'anger',
    situation: { en: 'Anger', bn: 'রাগ', ar: 'الغضب' },
    arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
    transliteration: "A'udhu billahi minash-shaytanir-rajim",
    translation: {
      en: 'I seek refuge in Allah from the accursed Shaytan.',
      bn: 'আমি অভিশপ্ত শয়তান থেকে আল্লাহর কাছে আশ্রয় চাইছি।',
    },
    arabicNote: 'أخبر النبي ﷺ أن من قالها عند الغضب سكن غضبه، لأن الغضب من نزغ الشيطان.',
    reference: { text: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:3282', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'hardship',
    situation: { en: 'Hardship & Distress', bn: 'বিপদ ও কষ্ট', ar: 'الكرب والشدة' },
    arabic:
      'لَا إِلَهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
    transliteration:
      "La ilaha illallahul-'Azimul-Halim, la ilaha illallahu Rabbul-'Arshil-'Azim, la ilaha illallahu Rabbus-samawati wa Rabbul-ardi wa Rabbul-'Arshil-Karim",
    translation: {
      en: 'There is no god but Allah, the Mighty, the Forbearing. There is no god but Allah, Lord of the Mighty Throne. There is no god but Allah, Lord of the heavens and the earth and Lord of the Noble Throne.',
      bn: 'আল্লাহ ছাড়া কোনো সত্য ইলাহ নেই, তিনি মহান, সহনশীল। আল্লাহ ছাড়া কোনো সত্য ইলাহ নেই, তিনি মহান আরশের রব। আল্লাহ ছাড়া কোনো সত্য ইলাহ নেই, তিনি আসমান ও জমিনের রব, মহিমান্বিত আরশের রব।',
    },
    arabicNote:
      'كان النبي ﷺ يقول هذا الدعاء عند الكرب الشديد، وهو من أعظم أدعية تفريج الهموم بإذن الله.',
    reference: {
      text: 'Sahih al-Bukhari & Muslim',
      url: 'https://sunnah.com/bukhari:6346',
      grade: 'Ṣaḥīḥ (also Muslim 2730)',
    },
  },
  {
    id: 'entering-home',
    situation: { en: 'Entering the Home', bn: 'ঘরে প্রবেশ', ar: 'دخول المنزل' },
    arabic:
      'بِسْمِ اللَّهِ وَلَجْنَا، وَبِسْمِ اللَّهِ خَرَجْنَا، وَعَلَى اللَّهِ رَبِّنَا تَوَكَّلْنَا',
    transliteration: "Bismillahi walajna, wa bismillahi kharajna, wa 'alallahi Rabbina tawakkalna",
    translation: {
      en: 'In the name of Allah we enter, in the name of Allah we leave, and upon Allah, our Lord, we place our trust.',
      bn: 'আল্লাহর নামে আমরা প্রবেশ করলাম, আল্লাহর নামে আমরা বের হলাম, আর আমাদের রব আল্লাহর উপরেই আমরা ভরসা করলাম।',
    },
    arabicNote: 'يُستحب ذكر اسم الله عند دخول البيت، وورد أن الشيطان لا يبيت مع من فعل ذلك.',
    reference: { text: 'Sunan Abi Dawud', url: 'https://sunnah.com/abudawud:5096', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'leaving-home',
    situation: { en: 'Leaving the Home', bn: 'ঘর থেকে বের হওয়া', ar: 'الخروج من المنزل' },
    arabic:
      'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    transliteration: "Bismillah, tawakkaltu 'alallah, wa la hawla wa la quwwata illa billah",
    translation: {
      en: 'In the name of Allah, I place my trust in Allah, and there is no power or might except with Allah.',
      bn: 'আল্লাহর নামে, আমি আল্লাহর উপর ভরসা করলাম, আর আল্লাহ ছাড়া কোনো শক্তি-সামর্থ্য নেই।',
    },
    arabicNote: 'من قالها عند خروجه من بيته قيل له: هُديت وكُفيت ووُقيت، وتنحى عنه الشيطان.',
    reference: { text: 'Sunan Abi Dawud', url: 'https://sunnah.com/abudawud:5095', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'entering-masjid',
    situation: { en: 'Entering the Masjid', bn: 'মসজিদে প্রবেশ', ar: 'دخول المسجد' },
    arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
    transliteration: 'Allahumma-ftah li abwaba rahmatik',
    translation: {
      en: 'O Allah, open the gates of Your mercy for me.',
      bn: 'হে আল্লাহ, তোমার রহমতের দরজাগুলো আমার জন্য খুলে দাও।',
    },
    arabicNote: 'يُستحب قوله عند دخول المسجد، وعند الخروج يقال: اللهم إني أسألك من فضلك.',
    reference: { text: 'Sahih Muslim', url: 'https://sunnah.com/muslim:713', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'rain',
    situation: { en: 'Rain', bn: 'বৃষ্টি', ar: 'المطر' },
    arabic: 'اللَّهُمَّ صَيِّبًا نَافِعًا',
    transliteration: "Allahumma sayyiban nafi'an",
    translation: {
      en: 'O Allah, (make it) a beneficial rain cloud.',
      bn: 'হে আল্লাহ, এটাকে উপকারী বৃষ্টি বানিয়ে দাও।',
    },
    arabicNote:
      'كان النبي ﷺ إذا رأى المطر قال هذا الدعاء، لأن وقت نزول المطر من أوقات إجابة الدعاء.',
    reference: { text: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:1032', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'forgiveness',
    situation: { en: 'Seeking Forgiveness', bn: 'ক্ষমা প্রার্থনা', ar: 'الاستغفار' },
    arabic:
      'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ',
    transliteration:
      "Allahumma anta Rabbi la ilaha illa anta, khalaqtani wa ana 'abduka, wa ana 'ala 'ahdika wa wa'dika mastata'tu, a'udhu bika min sharri ma sana'tu, abu'u laka bini'matika 'alayya, wa abu'u bidhanbi faghfir li fa'innahu la yaghfirudh-dhunuba illa anta",
    translation: {
      en: 'O Allah, You are my Lord, there is no god but You. You created me and I am Your servant, and I hold to Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favor upon me, and I acknowledge my sin, so forgive me — for none forgives sins except You.',
      bn: 'হে আল্লাহ, তুমিই আমার রব, তুমি ছাড়া কোনো সত্য ইলাহ নেই। তুমি আমাকে সৃষ্টি করেছ, আর আমি তোমার বান্দা, আমি যথাসাধ্য তোমার প্রতিশ্রুতি ও ওয়াদার উপর আছি। আমি আমার কৃতকর্মের অনিষ্ট থেকে তোমার কাছে আশ্রয় চাই। আমি তোমার নিয়ামতের কথা স্বীকার করছি, আর আমার পাপের কথাও স্বীকার করছি, তাই আমাকে ক্ষমা করে দাও, কারণ তুমি ছাড়া কেউ পাপ ক্ষমা করতে পারে না।',
    },
    arabicNote:
      'هذا الدعاء هو "سيد الاستغفار"، ومن قاله موقنًا به في الصباح فمات من يومه دخل الجنة، وكذا في المساء.',
    reference: { text: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:6306', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'waking-up',
    situation: { en: 'Waking Up', bn: 'ঘুম থেকে জাগা', ar: 'الاستيقاظ من النوم' },
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: "Alhamdu lillahil-ladhi ahyana ba'da ma amatana wa ilayhin-nushur",
    translation: {
      en: 'All praise is for Allah who gave us life after having taken it from us (in sleep), and to Him is the resurrection.',
      bn: 'সমস্ত প্রশংসা আল্লাহর জন্য, যিনি আমাদের মৃত্যু দেওয়ার পর (ঘুমের মাধ্যমে) আবার জীবিত করলেন, আর তাঁরই কাছে পুনরুত্থান।',
    },
    arabicNote:
      'يُستحب قول هذا الذكر فور الاستيقاظ من النوم، تذكيرًا بنعمة الحياة وبالبعث بعد الموت.',
    reference: { text: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:6324', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'before-sleep',
    situation: { en: 'Before Sleep', bn: 'ঘুমানোর আগে', ar: 'قبل النوم' },
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: {
      en: 'In Your name, O Allah, I die and I live.',
      bn: 'হে আল্লাহ, তোমার নামেই আমি মরি এবং তোমার নামেই বাঁচি।',
    },
    arabicNote: 'يُقال هذا الذكر عند الأخذ في المضجع للنوم، وهو تسليم كامل للحياة والموت بيد الله.',
    reference: { text: 'Sahih al-Bukhari', url: 'https://sunnah.com/bukhari:6324', grade: 'Ṣaḥīḥ' },
  },
  {
    id: 'before-eating',
    situation: { en: 'Before Eating', bn: 'খাবার আগে', ar: 'قبل الطعام' },
    arabic: 'بِسْمِ اللَّهِ أَوَّلَهُ وَآخِرَهُ',
    transliteration: 'Bismillahi awwalahu wa akhirah',
    translation: {
      en: '(If you forget to say Bismillah at the start) In the name of Allah, at its beginning and its end.',
      bn: '(শুরুতে বিসমিল্লাহ বলতে ভুলে গেলে) আল্লাহর নামে, এর শুরুতেও এবং এর শেষেও।',
    },
    arabicNote: 'السنة أن يقول "بسم الله" قبل الأكل، فإن نسي في أوله قال هذا الدعاء عند تذكره.',
    reference: { text: 'Sunan Abi Dawud', url: 'https://sunnah.com/abudawud:3767', grade: 'Ḥasan' },
  },
  {
    id: 'after-eating',
    situation: { en: 'After Eating', bn: 'খাবার পরে', ar: 'بعد الطعام' },
    arabic:
      'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ',
    transliteration:
      "Alhamdu lillahil-ladhi at'amani hadha wa razaqanihi min ghayri hawlin minni wa la quwwah",
    translation: {
      en: 'All praise is for Allah who fed me this and provided it for me, without any might or power on my part.',
      bn: 'সমস্ত প্রশংসা আল্লাহর জন্য, যিনি আমাকে এই খাবার খাওয়ালেন এবং আমার কোনো শক্তি-সামর্থ্য ছাড়াই আমাকে এটা দান করলেন।',
    },
    arabicNote: 'من قال هذا الدعاء بعد الطعام غُفر له ما تقدم من ذنبه، كما ورد في الحديث.',
    reference: { text: 'Sunan Abi Dawud', url: 'https://sunnah.com/abudawud:4023', grade: 'Ḥasan' },
  },
];
