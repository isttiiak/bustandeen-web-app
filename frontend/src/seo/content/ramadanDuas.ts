// The duʿā on the Ramadan print sheets (R4, approved 2026-10-17). Checked on
// sunnah.com via search (it blocks fetches); the Arabic is copied verbatim
// from the Ibn Majah 3850 matn (hadithunlocked.com, Tirmidhi 3513 page),
// never retyped. Some printed editions of Tirmidhi 3513 add "كَرِيمٌ"; the
// Tuhfat al-Ahwadhi text, Ibn Majah, Ahmad and al-Nasa'i al-Kubra do not, so
// the wording without it is used.

export const LAYLAT_AL_QADR_DUA = {
  arabic: 'اللَّهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي',
  transliteration: {
    en: 'Allāhumma innaka ʿafuwwun tuḥibbul-ʿafwa faʿfu ʿannī.',
    bn: 'আল্লাহুম্মা ইন্নাকা আফুউউন তুহিব্বুল আফওয়া ফাফু আন্নি।',
  },
  meaning: {
    en: 'O Allah, You are the One who pardons and You love to pardon, so pardon me.',
    bn: 'হে আল্লাহ, তুমি ক্ষমাশীল, ক্ষমা করতে ভালোবাসো, তাই আমাকে ক্ষমা করো।',
  },
  source: {
    en: 'Tirmidhi 3513 (Sahih, Darussalam), Ibn Majah 3850',
    bn: 'তিরমিজি ৩৫১৩ (সহিহ, দারুসসালাম), ইবনে মাজাহ ৩৮৫০',
  },
  url: 'https://sunnah.com/tirmidhi:3513',
} as const;
