// Zikr counter data (audit T2.4: moved out of pages/ZikrCounter.tsx unchanged): built-in meanings, hadith references and the full predefined texts.

// Meanings for all built-in dhikr — transliteration/meaning are i18n KEYS with
// their English fallback carried alongside, resolved with t(key, fallback) at
// render time. Library/custom items store raw text (no key), rendered as-is.
export const DEFAULT_MEANINGS: Record<
  string,
  {
    arabic: string;
    translitKey: string;
    translitFallback: string;
    meaningKey: string;
    meaningFallback: string;
  }
> = {
  SubhanAllah: {
    arabic: 'سُبْحَانَ اللَّهِ',
    translitKey: 'zikr.translit.subhanallah',
    translitFallback: 'Subḥāna-llāh',
    meaningKey: 'zikr.meanings.subhanallah',
    meaningFallback: 'Glory be to Allah: praising His perfection above all imperfections',
  },
  Alhamdulillah: {
    arabic: 'الْحَمْدُ لِلَّهِ',
    translitKey: 'zikr.translit.alhamdulillah',
    translitFallback: 'Al-ḥamdu li-llāh',
    meaningKey: 'zikr.meanings.alhamdulillah',
    meaningFallback: 'All praise belongs to Allah: gratitude for every blessing, seen and unseen',
  },
  'Allahu Akbar': {
    arabic: 'اللَّهُ أَكْبَرُ',
    translitKey: 'zikr.translit.allahuAkbar',
    translitFallback: 'Allāhu Akbar',
    meaningKey: 'zikr.meanings.allahuAkbar',
    meaningFallback: 'Allah is the Greatest: His greatness transcends all of creation',
  },
  'La ilaha illallah': {
    arabic: 'لَا إِلَهَ إِلَّا اللَّهُ',
    translitKey: 'zikr.translit.laIlahaIllallah',
    translitFallback: 'Lā ilāha illā-llāh',
    meaningKey: 'zikr.meanings.laIlahaIllallah',
    meaningFallback: 'There is no god but Allah: the declaration of Tawhid, key to Jannah',
  },
  Astaghfirullah: {
    arabic: 'أَسْتَغْفِرُ اللَّهَ',
    translitKey: 'zikr.translit.astaghfirullah',
    translitFallback: 'Astaghfiru-llāh',
    meaningKey: 'zikr.meanings.astaghfirullah',
    meaningFallback:
      'I seek forgiveness from Allah. The Prophet ﷺ sought forgiveness 70–100 times a day',
  },
  'SubhanAllah wa bihamdihi': {
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
    translitKey: 'zikr.translit.subhanallahWaBihamdihi',
    translitFallback: 'Subḥāna-llāhi wa bi-ḥamdih',
    meaningKey: 'zikr.meanings.subhanallahWaBihamdihi',
    meaningFallback:
      'Glory be to Allah and all praise is His: light on the tongue, heavy on the scales, beloved to the Most Merciful',
  },
  'La hawla wa la quwwata illa billah': {
    arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
    translitKey: 'zikr.translit.laHawla',
    translitFallback: 'Lā ḥawla wa lā quwwata illā bi-llāh',
    meaningKey: 'zikr.meanings.laHawla',
    meaningFallback:
      'There is no power and no strength except with Allah: a treasure from the treasures of Jannah',
  },
  'SubhanAllah wal hamdulillah wa la ilaha illAllah wa Allahu akbar': {
    arabic: 'سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ',
    translitKey: 'zikr.translit.fourBeloved',
    translitFallback: 'Subḥāna-llāhi wal-ḥamdu li-llāhi wa lā ilāha illā-llāhu wa-llāhu akbar',
    meaningKey: 'zikr.meanings.fourBeloved',
    meaningFallback:
      'The four most beloved words to Allah. Whoever says them, sins fall as leaves fall from a dry tree',
  },
  'Ayatul Kursi': {
    arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ',
    translitKey: 'zikr.translit.ayatulKursi',
    translitFallback: 'Allāhu lā ilāha illā huwal-ḥayyul-qayyūm... (Quran 2:255)',
    meaningKey: 'zikr.meanings.ayatulKursi',
    meaningFallback:
      'The Verse of the Throne, the greatest verse in the Quran. Recite after every prayer; nothing prevents entry to Jannah except death',
  },
  'Durud Ibrahim': {
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
    translitKey: 'zikr.translit.durudIbrahim',
    translitFallback: 'Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad...',
    meaningKey: 'zikr.meanings.durudIbrahim',
    meaningFallback:
      'Salutations upon the Prophet ﷺ and his family. Allah sends tenfold blessings upon the one who sends one salutation',
  },
};

// Hadith references for built-in dhikr (shown at bottom of counter)
export const DHIKR_HADITHS: Record<
  string,
  { textKey: string; textFallback: string; source: string; url: string; grade?: string }
> = {
  SubhanAllah: {
    textKey: 'zikr.hadith.subhanallah',
    textFallback:
      '"Two words are light on the tongue, heavy on the scale, beloved to the Most Merciful: SubhanAllah wa bihamdihi, SubhanAllah al-Azim."',
    source: 'Ṣaḥīḥ al-Bukhārī 6682',
    url: 'https://sunnah.com/bukhari:6682',
    grade: 'Ṣaḥīḥ',
  },
  Alhamdulillah: {
    textKey: 'zikr.hadith.alhamdulillah',
    textFallback: '"Al-ḥamdu li-llāh fills the scale."',
    source: 'Ṣaḥīḥ Muslim 223',
    url: 'https://sunnah.com/muslim:223',
    grade: 'Ṣaḥīḥ',
  },
  'Allahu Akbar': {
    textKey: 'zikr.hadith.allahuAkbar',
    textFallback:
      '"The best dhikr is Lā ilāha illā-llāh, and the best supplication is Al-ḥamdu li-llāh."',
    source: 'Sunan al-Tirmidhī 3383',
    url: 'https://sunnah.com/tirmidhi:3383',
    grade: 'Ḥasan',
  },
  'La ilaha illallah': {
    textKey: 'zikr.hadith.laIlahaIllallah',
    textFallback:
      '"Renew your faith." They asked: "How?" He said: "Say: Lā ilāha illā-llāh frequently."',
    source: 'Musnad Aḥmad 8695',
    url: 'https://sunnah.com/ahmad:8695',
    grade: 'Ḥasan',
  },
  Astaghfirullah: {
    textKey: 'zikr.hadith.astaghfirullah',
    textFallback:
      '"I seek forgiveness from Allah and turn to Him in repentance more than seventy times a day."',
    source: 'Ṣaḥīḥ al-Bukhārī 6307',
    url: 'https://sunnah.com/bukhari:6307',
    grade: 'Ṣaḥīḥ',
  },
  'SubhanAllah wa bihamdihi': {
    textKey: 'zikr.hadith.subhanallahWaBihamdihi',
    textFallback:
      '"Whoever says \'SubhanAllahi wa bihamdihi\' 100 times, his sins will be forgiven even if they were as much as the foam of the sea."',
    source: 'Ṣaḥīḥ al-Bukhārī 6405',
    url: 'https://sunnah.com/bukhari:6405',
    grade: 'Ṣaḥīḥ',
  },
  'La hawla wa la quwwata illa billah': {
    textKey: 'zikr.hadith.laHawla',
    textFallback:
      '"Shall I not guide you to a treasure from the treasures of Paradise? Say: Lā ḥawla wa lā quwwata illā bi-llāh."',
    source: 'Ṣaḥīḥ al-Bukhārī 4205',
    url: 'https://sunnah.com/bukhari:4205',
    grade: 'Ṣaḥīḥ',
  },
  'SubhanAllah wal hamdulillah wa la ilaha illAllah wa Allahu akbar': {
    textKey: 'zikr.hadith.fourBeloved',
    textFallback:
      '"The most beloved words to Allah are four: SubhanAllah, Alhamdulillah, La ilaha illallah, Allahu Akbar — it does not matter which you begin with."',
    source: 'Ṣaḥīḥ Muslim 2137',
    url: 'https://sunnah.com/muslim:2137',
    grade: 'Ṣaḥīḥ',
  },
  'Ayatul Kursi': {
    textKey: 'zikr.hadith.ayatulKursi',
    textFallback:
      '"Whoever recites Āyat al-Kursī after every obligatory prayer, nothing prevents him from entering Jannah except death."',
    source: "al-Nasā'ī (al-Sunan al-Kubrā) · Ṣaḥīḥ by al-Albānī",
    url: 'https://sunnah.com/nasai:9928',
    grade: 'Ṣaḥīḥ',
  },
  'Durud Ibrahim': {
    textKey: 'zikr.hadith.durudIbrahim',
    textFallback:
      '"Whoever sends blessings upon me once, Allah will send blessings upon him tenfold, and erase ten sins, and raise him ten degrees."',
    source: "al-Nasā'ī 1297",
    url: 'https://sunnah.com/nasai:1297',
    grade: 'Ṣaḥīḥ',
  },
};

// Full texts for predefined dhikr that aren't in the curated library —
// shown in the expandable "Full text & reference" card, never truncated.
export const FULL_PREDEFINED: Record<
  string,
  {
    arabic: string;
    meaningKey: string;
    meaningFallback: string;
    source?: string;
    sourceUrl?: string;
  }
> = {
  'Ayatul Kursi': {
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَنْ ذَا الَّذِي يَشْفَعُ عِنْدَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
    meaningKey: 'zikr.meanings.ayatulKursiFull',
    meaningFallback:
      'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission? He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills. His Kursī extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great. (Quran 2:255)',
    source: 'Quran 2:255',
    sourceUrl: 'https://quran.com/2/255',
  },
};
