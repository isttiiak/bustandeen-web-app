import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import api from '../lib/api.js';
import ConfirmDialog from './ConfirmDialog.js';
import { useQuranSummary, useUpdateQuranProfile } from '../hooks/useQuran.js';
import { TRANSLATIONS, selectedTranslations } from '../utils/quranData.js';
import {
  ARABIC_FONTS,
  getArabicFont,
  setArabicFont,
  FONT_RANGES,
  getFontPx,
  setFontPx,
  type FontKind,
  translitEnabled,
  setTranslitEnabled,
  listenCountsAsAyat,
  setListenCountsAsAyat,
  getReciterId,
  setReciterId,
  applyServerQuranPrefs,
  getLocalQuranPrefsForSync,
} from '../utils/quranPrefs.js';

/** FontKind → the PATCH /api/quran/profile field it syncs to. */
const FONT_SYNC_FIELD = {
  arabic: 'fontArabicPx',
  translation: 'fontTranslationPx',
  translit: 'fontTranslitPx',
  tafsir: 'fontTafsirPx',
} as const satisfies Record<FontKind, string>;

/**
 * Quran settings — a right-side DRAWER (Istiak's spec), available from every
 * Quran tab. Manages: daily āyāt goal, default reciter, up to TWO
 * translations (English + Bengali), Arabic & translation font sizes.
 */
const RECITER_OPTIONS = [
  { id: 'dossari', name: 'Yasser Al-Dossari (default)' },
  { id: 'alafasy', name: 'Mishary Alafasy' },
  { id: 'abdulbasit', name: 'Abdul Basit (Murattal)' },
  { id: 'husary', name: 'Mahmoud Al-Husary' },
  { id: 'sudais', name: 'Abdur-Rahman As-Sudais' },
  { id: 'maher', name: 'Maher Al-Muaiqly' },
  { id: 'minshawi', name: 'Muhammad Al-Minshawi' },
];

/** Free-range px slider (Istiak's spec: full flexibility, not 3 steps).
 * Writes straight to localStorage for instant feedback — the parent also
 * gets `onCommit` on every change so it can push the value to the server
 * (debounced, since a drag fires this continuously) for cross-device sync. */
function SizeSlider({
  label,
  kind,
  sample,
  sampleStyle,
  value,
  onCommit,
}: {
  label: string;
  kind: FontKind;
  sample?: string;
  sampleStyle?: CSSProperties;
  value: number;
  onCommit: (px: number) => void;
}) {
  const { min, max } = FONT_RANGES[kind];
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-white/50 text-xs font-bold">{label}</p>
        <span className="text-white/30 text-[10px] tabular-nums">{value}px</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={`${label} size`}
        onChange={(e) => {
          const n = Number(e.target.value);
          setFontPx(kind, n);
          onCommit(n);
        }}
        className="range range-xs w-full [--range-shdw:theme(colors.brand.emerald)]"
      />
      {sample && (
        <p className="text-white/60 mt-1 truncate" style={{ fontSize: value, ...sampleStyle }}>
          {sample}
        </p>
      )}
    </div>
  );
}

const GOAL_PRESETS = [1, 3, 5, 10, 20];

export default function QuranSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: summary } = useQuranSummary();
  const updateProfile = useUpdateQuranProfile();
  const [confirmResetKhatam, setConfirmResetKhatam] = useState(false);
  const [confirmResetReading, setConfirmResetReading] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);

  const savedGoal = summary?.profile.dailyGoalAyat ?? 0;
  const [goal, setGoal] = useState<number>(savedGoal);
  const [reciter, setReciter] = useState(getReciterId);
  const [translations, setTranslations] = useState<string[]>(selectedTranslations);
  const [arabicFontId, setArabicFontId] = useState(() => getArabicFont().id);
  const [translit, setTranslit] = useState(translitEnabled);
  const [listenCounts, setListenCounts] = useState(listenCountsAsAyat);
  const [fontSizes, setFontSizes] = useState<Record<FontKind, number>>({
    arabic: getFontPx('arabic'),
    translation: getFontPx('translation'),
    translit: getFontPx('translit'),
    tafsir: getFontPx('tafsir'),
  });

  // Keep the local goal field in sync when the drawer (re)opens with fresh data
  useEffect(() => {
    if (open) setGoal(summary?.profile.dailyGoalAyat ?? 0);
  }, [open, summary?.profile.dailyGoalAyat]);

  // Cross-device sync — runs once per drawer-open per device, when the
  // server profile first arrives. `displayPrefsSet` tells apart "nobody has
  // ever synced these fields" (push this device's current local values up,
  // so an existing single-device customization survives the migration)
  // from "already synced elsewhere" (pull those down instead, overwriting
  // whatever this device had locally). See QuranProfile.ts's doc comment.
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!open || !summary || syncedRef.current) return;
    syncedRef.current = true;
    const { profile } = summary;
    if (profile.displayPrefsSet) {
      applyServerQuranPrefs(profile);
      setReciter(profile.reciterId);
      setTranslations(profile.translations.length ? profile.translations : ['en.sahih']);
      setArabicFontId(profile.arabicFont);
      setTranslit(profile.translitEnabled);
      setListenCounts(profile.listenCountsAsAyat);
      setFontSizes({
        arabic: profile.fontArabicPx,
        translation: profile.fontTranslationPx,
        translit: profile.fontTranslitPx,
        tafsir: profile.fontTafsirPx,
      });
    } else {
      updateProfile.mutate(getLocalQuranPrefsForSync());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateProfile is a stable useMutation reference; excluding it avoids re-running this on every unrelated summary refetch
  }, [open, summary]);
  // Re-arm the one-time sync for the next time the drawer opens (e.g. after
  // another device changed something in between).
  useEffect(() => {
    if (!open) syncedRef.current = false;
  }, [open]);

  // Debounced push to the server — a slider drag fires onCommit continuously;
  // this coalesces it into one PATCH per ~600ms of inactivity, per field.
  const syncTimers = useRef<Partial<Record<string, ReturnType<typeof setTimeout>>>>({});
  const syncField = (key: string, payload: Record<string, unknown>) => {
    if (syncTimers.current[key]) clearTimeout(syncTimers.current[key]);
    syncTimers.current[key] = setTimeout(() => updateProfile.mutate(payload), 600);
  };
  useEffect(() => {
    const timers = syncTimers.current;
    return () => {
      Object.values(timers).forEach((id) => id && clearTimeout(id));
    };
  }, []);

  const primary = translations[0] ?? 'en.sahih';
  const secondary = translations[1] ?? 'none';
  const goalDirty = goal !== savedGoal;

  // Every field below saves the instant it changes — no separate "save
  // reading settings" button. persistTranslations keeps localStorage in
  // sync with whatever selectedTranslations() will read back next time.
  const persistTranslations = (next: string[]) => {
    localStorage.setItem('bustandeen_quran_translations', JSON.stringify(next));
    updateProfile.mutate({ translations: next });
  };

  const setPrimary = (id: string) => {
    setTranslations((prev) => {
      const sec = prev[1] && prev[1] !== id ? [prev[1]] : [];
      const next = [id, ...sec];
      persistTranslations(next);
      return next;
    });
  };
  const setSecondary = (id: string) => {
    setTranslations((prev) => {
      const next =
        id === 'none' || id === prev[0] ? [prev[0] ?? 'en.sahih'] : [prev[0] ?? 'en.sahih', id];
      persistTranslations(next);
      return next;
    });
  };

  // Dedicated goal save (its own button — Istiak's spec). 0 = no goal.
  const saveGoal = () => {
    const g = Math.min(6236, Math.max(0, Math.round(goal) || 0));
    setGoal(g);
    if (g === savedGoal) {
      toast('Goal unchanged', { id: 'quran-goal' });
      return;
    }
    updateProfile.mutate(
      { dailyGoalAyat: g },
      {
        onSuccess: () =>
          toast.success(
            g > 0
              ? `Daily goal set: ${g} āyah${g > 1 ? 's' : ''} 🎯`
              : 'Goal removed — read freely 🌿',
            { id: 'quran-goal' }
          ),
        onError: () => toast.error('Could not save the goal — try again.', { id: 'quran-goal' }),
      }
    );
  };

  // Portaled to <body> — this drawer is opened from inside AnimatedBackground's
  // `relative z-10` wrapper, which creates its own stacking context. Without a
  // portal, no z-index here can escape that context, so the drawer (and its
  // close button) rendered visually BELOW the navbar's sticky z-40 despite its
  // own higher z-index. Every sibling settings drawer (Salat, Zikr, Prayer
  // Times) already does this — this one was the one missing it.
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 bottom-0 z-[55] w-full max-w-sm bg-brand-deep border-l border-brand-border overflow-y-auto"
            role="dialog"
            aria-label={t('quranSettings.title', 'Quran settings')}
          >
            <div className="sticky top-0 bg-brand-deep/95 backdrop-blur border-b border-brand-emerald/5 px-5 py-4 flex items-center justify-between z-10">
              <h3 className="text-white font-black text-lg">
                ⚙️ {t('quranSettings.title', 'Quran settings')}
              </h3>
              <button
                aria-label={t('quranSettings.close', 'Close settings')}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
                onClick={onClose}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* ── Dedicated: Daily Quran goal (its own save button) ── */}
              <div className="rounded-2xl border border-brand-emerald/25 bg-brand-emerald/[0.06] p-4">
                <p className="text-white font-black text-sm">
                  {t('quranSettings.goalTitle', '🎯 Daily Quran goal')}
                </p>
                <p className="text-white/40 text-[11px] mt-0.5 leading-relaxed">
                  {t(
                    'quranSettings.goalDesc',
                    'Completely optional — set it only when YOU want a daily target. Start small: even 1 āyah a day keeps the habit alive. Reading anywhere counts.'
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button
                    onClick={() => setGoal(0)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      goal === 0
                        ? 'bg-white/15 text-white border-brand-border'
                        : 'bg-white/5 border-brand-emerald/15 text-white/60 hover:border-brand-border'
                    }`}
                  >
                    {t('quranSettings.noGoal', 'No goal')}
                  </button>
                  {GOAL_PRESETS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setGoal(p)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        goal === p
                          ? 'bg-brand-emerald text-white border-brand-emerald'
                          : 'bg-white/5 border-brand-emerald/15 text-white/60 hover:border-brand-emerald/40'
                      }`}
                    >
                      {p} āyah{p > 1 ? 's' : ''}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <label className="text-white/40 text-[11px] font-bold shrink-0" htmlFor="q-goal">
                    {t('quranSettings.custom', 'Custom')}
                  </label>
                  <input
                    id="q-goal"
                    type="number"
                    min={0}
                    max={6236}
                    value={goal}
                    onChange={(e) => setGoal(Number(e.target.value))}
                    className="input input-bordered input-sm flex-1 bg-white/5 border-brand-emerald/15 text-white"
                  />
                  <span className="text-white/30 text-[11px]">/ day</span>
                </div>
                <button
                  className="w-full btn btn-sm h-10 mt-3 rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-emerald to-brand-info disabled:opacity-50"
                  onClick={saveGoal}
                  disabled={!goalDirty || updateProfile.isPending}
                >
                  {updateProfile.isPending ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : goalDirty ? (
                    t('quranSettings.saveGoal', 'Save goal')
                  ) : (
                    t('quranSettings.goalSaved', 'Goal saved ✓')
                  )}
                </button>
              </div>

              <div className="border-t border-brand-emerald/10 pt-4">
                <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-3">
                  {t('quranSettings.readingAudio', 'Reading & audio')}
                </p>
              </div>

              <div>
                <label className="text-white/50 text-xs font-bold" htmlFor="q-reciter">
                  {t('quranSettings.reciterLabel', '🎙️ Default reciter')}
                </label>
                <select
                  id="q-reciter"
                  className="select select-sm w-full mt-1.5 bg-white/5 border-brand-emerald/10 text-white rounded-xl"
                  value={reciter}
                  onChange={(e) => {
                    setReciter(e.target.value);
                    setReciterId(e.target.value);
                    updateProfile.mutate({ reciterId: e.target.value });
                  }}
                >
                  {RECITER_OPTIONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <p className="text-white/25 text-[10px] mt-1">
                  {t(
                    'quranSettings.reciterNote',
                    'Used by the Listen tab. The single-āyah recitation in the reader uses Alafasy (the only free per-āyah source).'
                  )}
                </p>
              </div>

              <div className="space-y-2.5">
                <p className="text-white/50 text-xs font-bold">
                  {t('quranSettings.translationsLabel', '🌐 Translations')}{' '}
                  <span className="text-white/25 font-normal">
                    {t('quranSettings.translationsHint', '(up to two shown together)')}
                  </span>
                </p>
                <div>
                  <label className="text-white/30 text-[10px] font-bold" htmlFor="q-tr1">
                    {t('quranSettings.primary', 'Primary')}
                  </label>
                  <select
                    id="q-tr1"
                    className="select select-sm w-full mt-1 bg-white/5 border-brand-emerald/10 text-white rounded-xl"
                    value={primary}
                    onChange={(e) => setPrimary(e.target.value)}
                  >
                    {TRANSLATIONS.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/30 text-[10px] font-bold" htmlFor="q-tr2">
                    {t('quranSettings.secondary', 'Second (optional)')}
                  </label>
                  <select
                    id="q-tr2"
                    className="select select-sm w-full mt-1 bg-white/5 border-brand-emerald/10 text-white rounded-xl"
                    value={secondary}
                    onChange={(e) => setSecondary(e.target.value)}
                  >
                    <option value="none">
                      {t('quranSettings.noneTranslation', 'None — one translation only')}
                    </option>
                    {TRANSLATIONS.filter((tr) => tr.id !== primary).map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Arabic font — the "clean" default is the easiest to read ── */}
              <div className="rounded-2xl border border-brand-warm/20 bg-brand-warm/[0.05] p-4 space-y-2">
                <p className="text-white/60 text-xs font-bold">
                  {t('quranSettings.arabicFont', '🔤 Arabic font')}
                </p>
                <select
                  aria-label="Arabic font"
                  className="select select-sm w-full bg-white/5 border-brand-warm/15 text-white rounded-xl"
                  value={arabicFontId}
                  onChange={(e) => {
                    setArabicFontId(e.target.value);
                    setArabicFont(e.target.value);
                    updateProfile.mutate({
                      arabicFont: e.target.value as 'clean' | 'naskh' | 'uthmani',
                    });
                  }}
                >
                  {ARABIC_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-white/80 text-2xl leading-loose text-center pt-1"
                  style={{ fontFamily: ARABIC_FONTS.find((f) => f.id === arabicFontId)?.stack }}
                >
                  بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                </p>
              </div>

              {/* ── Transliteration (pronunciation aid, free source) ── */}
              <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.05] p-4">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-white/70 text-sm font-bold">
                      {t('quranSettings.translitTitle', '🗣️ Transliteration')}
                    </p>
                    <p className="text-white/30 text-[11px] mt-0.5">
                      {t(
                        'quranSettings.translitDesc',
                        'Latin pronunciation under the Arabic — for readers still learning the script.'
                      )}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-warning"
                    checked={translit}
                    onChange={(e) => {
                      setTranslit(e.target.checked);
                      setTranslitEnabled(e.target.checked);
                      updateProfile.mutate({ translitEnabled: e.target.checked });
                    }}
                  />
                </label>
              </div>

              {/* ── Listening → ayat counting ── */}
              <div className="rounded-2xl border border-brand-info/20 bg-brand-info/[0.05] p-4">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <div>
                    <p className="text-white/70 text-sm font-bold">
                      {t('quranSettings.listenTitle', '🎧 Count listening as āyāt')}
                    </p>
                    <p className="text-white/30 text-[11px] mt-0.5">
                      {t(
                        'quranSettings.listenDesc',
                        'When on, listening time is converted into āyāt and logged toward your daily goal and streak.'
                      )}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-info"
                    checked={listenCounts}
                    onChange={(e) => {
                      setListenCounts(e.target.checked);
                      setListenCountsAsAyat(e.target.checked);
                      updateProfile.mutate({ listenCountsAsAyat: e.target.checked });
                    }}
                  />
                </label>
              </div>

              {/* ── Text sizes — one slider per text kind (Istiak's spec) ── */}
              <div className="rounded-2xl border border-brand-info/20 bg-brand-info/[0.05] p-4 space-y-4">
                <p className="text-white/60 text-xs font-bold">
                  {t('quranSettings.textSizes', '📏 Text sizes')}
                </p>
                <SizeSlider
                  label="Arabic"
                  kind="arabic"
                  value={fontSizes.arabic}
                  onCommit={(px) => {
                    setFontSizes((s) => ({ ...s, arabic: px }));
                    syncField(FONT_SYNC_FIELD.arabic, { [FONT_SYNC_FIELD.arabic]: px });
                  }}
                  sample="بِسْمِ اللَّهِ"
                  sampleStyle={{
                    fontFamily: ARABIC_FONTS.find((f) => f.id === arabicFontId)?.stack,
                    direction: 'rtl',
                  }}
                />
                <SizeSlider
                  label="Translation"
                  kind="translation"
                  value={fontSizes.translation}
                  onCommit={(px) => {
                    setFontSizes((s) => ({ ...s, translation: px }));
                    syncField(FONT_SYNC_FIELD.translation, { [FONT_SYNC_FIELD.translation]: px });
                  }}
                  sample="In the name of Allah…"
                />
                <SizeSlider
                  label="Transliteration"
                  kind="translit"
                  value={fontSizes.translit}
                  onCommit={(px) => {
                    setFontSizes((s) => ({ ...s, translit: px }));
                    syncField(FONT_SYNC_FIELD.translit, { [FONT_SYNC_FIELD.translit]: px });
                  }}
                  sample="Bismillāhir-raḥmānir-raḥīm"
                />
                <SizeSlider
                  label="Tafsir"
                  kind="tafsir"
                  value={fontSizes.tafsir}
                  onCommit={(px) => {
                    setFontSizes((s) => ({ ...s, tafsir: px }));
                    syncField(FONT_SYNC_FIELD.tafsir, { [FONT_SYNC_FIELD.tafsir]: px });
                  }}
                  sample="The scholars explain…"
                />
              </div>

              {/* ── Reset options ── */}
              <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/[0.06] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowPathIcon className="w-4 h-4 text-brand-gold" />
                  <h3 className="text-brand-gold font-bold text-sm">
                    {t('quranSettings.resetProgress', 'Reset progress')}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-white/60 text-xs font-semibold">
                      {t('quranSettings.khatamJourney', 'Khatam journey')}
                    </p>
                    <p className="text-white/30 text-[11px] mb-1.5">
                      {t(
                        'quranSettings.khatamResetDesc',
                        'Bookmark back to 1:1, journey un-started. Completed count stays.'
                      )}
                    </p>
                    <button
                      onClick={() => setConfirmResetKhatam(true)}
                      disabled={!summary?.profile.khatamStartedAt}
                      className="btn btn-xs border border-brand-gold/30 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 gap-1 disabled:opacity-30"
                    >
                      <ArrowPathIcon className="w-3 h-3" />{' '}
                      {t('quranSettings.resetKhatam', 'Reset khatam')}
                    </button>
                  </div>
                  <div className="border-t border-white/[0.06] pt-2.5">
                    <p className="text-white/60 text-xs font-semibold">
                      {t('quranSettings.readingProgress', 'Reading progress')}
                    </p>
                    <p className="text-white/30 text-[11px] mb-1.5">
                      {t(
                        'quranSettings.readingResetDesc',
                        'Zero surah completion counts and reader positions. Logs, bookmarks and goal stay.'
                      )}
                    </p>
                    <button
                      onClick={() => setConfirmResetReading(true)}
                      className="btn btn-xs border border-brand-gold/30 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 gap-1"
                    >
                      <ArrowPathIcon className="w-3 h-3" />{' '}
                      {t('quranSettings.resetReading', 'Reset reading')}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-white/25 text-[11px] leading-relaxed">
                {t('quranSettings.dangerZoneHint', 'Looking for full data deletion? That lives in')}{' '}
                <a href="/settings" className="underline text-white/40">
                  {t('nav.settingsDangerZone', 'Settings → Danger zone')}
                </a>
                .
              </p>
            </div>
          </motion.aside>

          <ConfirmDialog
            open={confirmResetKhatam}
            title={t('quranSettings.khatamConfirmTitle', 'Reset khatam journey?')}
            message={t(
              'quranSettings.khatamConfirmMsg',
              'Your bookmark will go back to 1:1. The number of completed khatams stays.'
            )}
            confirmLabel={
              resetting === 'khatam'
                ? t('quranSettings.resetting', 'Resetting…')
                : t('quranSettings.yesReset', 'Yes, reset')
            }
            onConfirm={() => {
              setResetting('khatam');
              api
                .post('/api/quran/khatam/reset')
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ['quran'] });
                  toast.success(t('quranSettings.khatamResetDone', 'Khatam journey reset'), {
                    icon: '📖',
                  });
                  setConfirmResetKhatam(false);
                })
                .catch(() =>
                  toast.error(t('quranSettings.resetFail', 'Could not reset — try again'))
                )
                .finally(() => setResetting(null));
            }}
            onCancel={() => setConfirmResetKhatam(false)}
          />
          <ConfirmDialog
            open={confirmResetReading}
            title={t('quranSettings.readingConfirmTitle', 'Reset reading progress?')}
            message={t(
              'quranSettings.readingConfirmMsg',
              'Surah completion counts and reader positions will be zeroed. Your reading logs, bookmarks and goal are preserved.'
            )}
            confirmLabel={
              resetting === 'reading'
                ? t('quranSettings.resetting', 'Resetting…')
                : t('quranSettings.yesReset', 'Yes, reset')
            }
            onConfirm={() => {
              setResetting('reading');
              api
                .post('/api/quran/reset-reading')
                .then(() => {
                  queryClient.invalidateQueries({ queryKey: ['quran'] });
                  toast.success(t('quranSettings.readingResetDone', 'Reading progress reset'), {
                    icon: '📖',
                  });
                  setConfirmResetReading(false);
                })
                .catch(() =>
                  toast.error(t('quranSettings.resetFail', 'Could not reset — try again'))
                )
                .finally(() => setResetting(null));
            }}
            onCancel={() => setConfirmResetReading(false)}
          />
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
