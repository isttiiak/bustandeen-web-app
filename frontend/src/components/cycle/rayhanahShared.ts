import { type CycleFlow, type CycleMood } from '../../hooks/useCycle.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import { getHijriDate } from '../../utils/islamicCalendar.js';
import { formatLocaleDate } from '../../utils/localeDate.js';

// ─── Sweet, powerful phrases for excused days (Istiak's spec) ─────────────────
export const PHRASES = [
  'Your rest is written by the Most Merciful, and your reward never pauses.',
  'Allah lifted the prayer from you these days; He never lifted His love.',
  'A heart that remembers Allah blooms in every season.',
  'These days are not a gap in your worship. They are a different garden of it.',
  'Dhikr, duʿā, gratitude: your garden is still growing.',
  "What is with Allah is never lost. He sees every gentle 'SubhanAllah'.",
  'Ease is also from Him. Rest, remember, and let your heart do the worshipping.',
  'The Beloved ﷺ said the deeds most loved by Allah are the constant ones. Your dhikr counts.',
];

export function phraseOfDayIdx(offset = 0): number {
  const day = Math.floor(new Date(getTrackingDay() + 'T12:00:00').getTime() / 86_400_000);
  return (day + offset) % PHRASES.length;
}

// ─── Garden of Light: daily checklist (server-synced, see toggleGarden) ───────
interface GardenItem {
  id: string;
  label: string;
  link?: string;
}
export const GARDEN_ITEMS: GardenItem[] = [
  { id: 'adhkar', label: 'Morning & evening adhkār' },
  { id: 'dhikr', label: 'A dhikr session (any amount counts)', link: '/zikr' },
  { id: 'salawat', label: 'Ṣalawāt upon the Prophet ﷺ', link: '/zikr' },
  { id: 'istighfar', label: 'Istighfār: seek forgiveness', link: '/zikr' },
  { id: 'listen', label: 'Listen to Quran (log it as pages)', link: '/quran' },
  { id: 'learn', label: 'Learn one thing (tafsīr, a lecture, a hadith)' },
  { id: 'kindness', label: 'One act of kindness or charity' },
];

// ─── Ghusl steps (Bukhari 248, ʿĀʾishah's description) ───────────────────────
export const GHUSL_STEPS = [
  'Make the intention (niyyah) in your heart to purify yourself',
  'Wash both hands, then wash away any traces of blood',
  'Perform a complete wuḍū as for prayer',
  'Pour water over your head three times, massaging it to the roots of the hair',
  'Pour water over your whole body, right side first, then left',
];

// ─── "How are you today?" chips ───────────────────────────────────────────────
export const FLOW_OPTIONS: Array<{ id: CycleFlow; label: string; drops: 1 | 2 | 3 }> = [
  { id: 'light', label: 'Light', drops: 1 },
  { id: 'medium', label: 'Medium', drops: 2 },
  { id: 'heavy', label: 'Heavy', drops: 3 },
];
export const SYMPTOM_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'headache', label: 'Headache' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'backache', label: 'Backache' },
  { id: 'bloating', label: 'Bloating' },
  { id: 'tenderness', label: 'Tenderness' },
  { id: 'insomnia', label: 'Insomnia' },
];
export const MOOD_OPTIONS: Array<{ id: CycleMood; label: string }> = [
  { id: 'calm', label: 'Calm' },
  { id: 'happy', label: 'Happy' },
  { id: 'low', label: 'Low' },
  { id: 'irritable', label: 'Irritable' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'tired', label: 'Tired' },
];

// Shared classes for this screen (theme tokens only, both themes).
export const CHIP =
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors';
export const CHIP_IDLE =
  'bg-brand-surface/50 border-brand-border text-white/75 hover:text-white hover:border-brand-pink/40';
export const CHIP_PINK = 'bg-brand-pink/15 border-brand-pink/60 text-brand-pink';
export const CHIP_INFO = 'bg-brand-info/15 border-brand-info/60 text-brand-info';
export const BTN_PINK =
  'inline-flex items-center justify-center gap-2 rounded-control px-4 py-2.5 text-sm font-bold border border-brand-pink/50 bg-brand-pink/10 hover:bg-brand-pink/20 text-brand-pink shadow-elev-1 transition-colors disabled:opacity-50';
export const NOTE = 'text-white/70 text-xs leading-relaxed';
export const LABEL = 'text-white/70 text-[11px] font-bold uppercase tracking-wide mb-1.5';
export const DIALOG =
  'w-full max-w-sm rounded-card bg-brand-deep border shadow-elev-3 p-6 space-y-4';
export const BACKDROP =
  'fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4';

export function formatDay(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
export function shiftStr(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86_400_000
  );
}

// ─── Curated du'a/adhkar for excused days (verified references) ──────────────
export const EXCUSED_ADHKAR = [
  {
    label: 'Sayyid al-Istighfār',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ',
    transliteration: 'Allāhumma anta rabbī, lā ilāha illā anta, khalaqtanī wa ana ʿabduka…',
    note: 'The master of seeking forgiveness',
    ref: { text: 'Bukhārī 6306', url: 'https://sunnah.com/bukhari:6306' },
  },
  {
    label: 'Ṣalawāt upon the Prophet ﷺ',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
    transliteration: 'Allāhumma ṣalli ʿalā Muḥammad wa ʿalā āli Muḥammad…',
    note: 'Especially on Friday, and open to you always',
    ref: { text: 'Bukhārī 3370', url: 'https://sunnah.com/bukhari:3370' },
  },
  {
    label: 'Morning/evening protection',
    arabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ',
    transliteration: 'Bismillāhilladhī lā yaḍurru maʿasmihi shayʾun fil-arḍi wa lā fis-samāʾ…',
    note: 'Say 3× morning and evening',
    ref: { text: 'Abū Dāwūd 5088', url: 'https://sunnah.com/abudawud:5088' },
  },
  {
    label: 'When in pain or discomfort',
    arabic: 'أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ',
    transliteration: 'Aʿūdhu billāhi wa qudratihi min sharri mā ajidu wa uḥādhiru',
    note: 'Place hand on the area of pain, say Bismillāh (3×), then this (7×)',
    ref: { text: 'Muslim 2202', url: 'https://sunnah.com/muslim:2202a' },
  },
  {
    label: 'Istighfār: constant forgiveness',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullāha wa atūbu ilayh',
    note: 'The Prophet ﷺ sought forgiveness 100× daily',
    ref: { text: 'Muslim 2702', url: 'https://sunnah.com/muslim:2702a' },
  },
  {
    label: 'SubḥānAllāh wa biḥamdih',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ',
    transliteration: 'SubḥānAllāhi wa biḥamdih, SubḥānAllāhil-ʿAẓīm',
    note: 'Two phrases heavy on the scales, light on the tongue',
    ref: { text: 'Bukhārī 6406', url: 'https://sunnah.com/bukhari:6406' },
  },
];

/** Count days in [start..end] that fall in (adjusted) Ramadan, for auto-qada */
export function ramadanDaysIn(start: string, end: string): number {
  let n = 0;
  const d = new Date(start + 'T12:00:00');
  const stop = new Date(end + 'T12:00:00');
  let guard = 0;
  while (d <= stop && guard < 90) {
    if (getHijriDate(d)?.month === 9) n++;
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return n;
}
