import User from '../models/User.js';
import QuranProfile from '../models/QuranProfile.js';

/**
 * localStorage keys that follow the user across devices. Mirrors
 * frontend/src/utils/prefsSync.ts (SYNCED_KEYS) — a key must be in BOTH lists
 * to sync. Unknown keys are silently dropped. Device-specific state (location,
 * reader zoom/split, caches, tokens) deliberately stays out.
 */
export const SYNCED_PREF_KEYS: ReadonlySet<string> = new Set([
  // Zikr counter + display
  'bustandeen_reduce_motion',
  'bustandeen_high_contrast',
  'bustandeen_noor_alltime',
  'bustandeen_noor_today',
  'bustandeen_vibration',
  'bustandeen_zikr_sound',
  'bustandeen_tasbih_mode',
  'bustandeen_tasbih_target',
  'bustandeen_zikr_audio',
  'bustandeen_zikr_volume',
  'bustandeen_zikr_hidden',
  'bustandeen_share_card_prefs',
  'bustandeen_lang',
  // Rayhanah display
  'bustandeen_discreet_mode',
  'bustandeen_cycle_height_unit',
  'bustandeen_cycle_weight_unit',
  'bustandeen_hide_bmi',
  // Salat
  'bustandeen_tasbih_breakdown',
  'bustandeen_salat_auto_count',
  'bustandeen_show_sunnah_guide',
  'bustandeen_show_nafl_guide',
  'bustandeen_asr_madhab',
  'bustandeen_calc_method',
  // Musafir mode (journey state + past journeys)
  'bustandeen_musafir',
  'bustandeen_musafir_history',
  // Quran
  'bustandeen_arabic_font',
  'bustandeen_qfs_arabic',
  'bustandeen_qfs_translation',
  'bustandeen_qfs_translit',
  'bustandeen_qfs_tafsir',
  'bustandeen_quran_translit',
  'bustandeen_quran_listen_counts',
  'bustandeen_reciter',
  'bustandeen_quran_translations',
  'bustandeen_tafsir_edition',
]);

export type PrefEntry = { v: string; t: number };
export type PrefsMap = Record<string, PrefEntry>;

/** Tolerate a little client clock skew, but never let a bogus far-future
 * timestamp make one key permanently un-overwritable. */
const MAX_FUTURE_SKEW_MS = 5 * 60_000;

/**
 * Before this feature, Quran display prefs synced through QuranProfile. Surface
 * those as prefs (stamped with the profile's last update) for any key the user
 * has no newer entry for, so nobody loses their Quran setup on the move.
 */
async function quranProfileSeed(uid: string): Promise<Map<string, PrefEntry>> {
  const p = await QuranProfile.findOne({ userId: uid }).lean();
  const seed = new Map<string, PrefEntry>();
  if (!p || !p.displayPrefsSet) return seed;
  const t = new Date(p.updatedAt ?? Date.now()).getTime();
  const put = (key: string, value: unknown) => {
    if (value !== undefined && value !== null) seed.set(key, { v: String(value), t });
  };
  put('bustandeen_arabic_font', p.arabicFont);
  put('bustandeen_qfs_arabic', p.fontArabicPx);
  put('bustandeen_qfs_translation', p.fontTranslationPx);
  put('bustandeen_qfs_translit', p.fontTranslitPx);
  put('bustandeen_qfs_tafsir', p.fontTafsirPx);
  put('bustandeen_quran_translit', p.translitEnabled ? '1' : '0');
  put('bustandeen_quran_listen_counts', p.listenCountsAsAyat ? '1' : '0');
  put('bustandeen_reciter', p.reciterId);
  if (Array.isArray(p.translations) && p.translations.length) {
    put('bustandeen_quran_translations', JSON.stringify(p.translations));
  }
  return seed;
}

export async function getPrefs(uid: string): Promise<PrefsMap> {
  const user = await User.findOne({ uid }).select('+prefs').lean();
  const stored = (user?.prefs ?? {}) as PrefsMap;
  const seed = await quranProfileSeed(uid);
  const out = new Map(seed);
  for (const [k, e] of Object.entries(stored)) {
    if (!SYNCED_PREF_KEYS.has(k)) continue;
    // A stored entry only beats the legacy seed if it is at least as new.
    const legacy = out.get(k);
    if (!legacy || e.t >= legacy.t) out.set(k, e);
  }
  return Object.fromEntries(out);
}

/** Merge client entries newest-wins per key (atomic per key), return the result. */
export async function mergePrefs(uid: string, incoming: PrefsMap): Promise<PrefsMap> {
  const now = Date.now();
  for (const [key, entry] of Object.entries(incoming)) {
    if (!SYNCED_PREF_KEYS.has(key)) continue;
    const t = Math.min(entry.t, now + MAX_FUTURE_SKEW_MS);
    const path = `prefs.${key}`;
    await User.updateOne(
      { uid, $or: [{ [`${path}.t`]: { $lt: t } }, { [path]: { $exists: false } }] },
      { $set: { [path]: { v: entry.v, t } } }
    );
  }
  return getPrefs(uid);
}
