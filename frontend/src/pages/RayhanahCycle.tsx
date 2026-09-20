import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ChevronLeftIcon, ChevronRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import RayhanahSettingsDrawer from '../components/RayhanahSettingsDrawer.js';
import { useAuthStore } from '../store/useAuthStore.js';
import {
  useCycleSummary,
  useStartCycle,
  useEndCycle,
  useIsFemale,
  useUpsertCycleDay,
  useEditCycleLog,
  usePartnerSync,
  useSetPregnancy,
  type CycleFlow,
  type CycleMood,
} from '../hooks/useCycle.js';
import { useFriendsList } from '../hooks/useSocial.js';
import CycleCalendar from '../components/CycleCalendar.js';
import TabNav from '../components/TabNav.js';
import { useFastingSummary, useUpdateFastingProfile } from '../hooks/useFasting.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { getHijriDate } from '../utils/islamicCalendar.js';
import { getRamadanWindow } from '../utils/ramadan.js';
import { celebrateSmall } from '../utils/celebrate.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { translateReference } from '../utils/localeReference.js';
import MoodComfort from '../components/MoodComfort.js';
import CycleGuidance from '../components/CycleGuidance.js';

// ─── Sweet, powerful phrases for excused days (Istiak's spec) ─────────────────
const PHRASES = [
  '🌸 Your rest is written by the Most Merciful — and your reward never pauses.',
  '🌷 Allah lifted the prayer from you these days; He never lifted His love.',
  '🌺 A heart that remembers Allah blooms in every season.',
  '🌹 These days are not a gap in your worship — they are a different garden of it.',
  '🌼 Dhikr, duʿā, gratitude — your garden is still growing.',
  "💮 What is with Allah is never lost — He sees every gentle 'SubhanAllah'.",
  '🌸 Ease is also from Him. Rest, remember, and let your heart do the worshipping.',
  '🌻 The Beloved ﷺ said the deeds most loved by Allah are the constant ones — your dhikr counts.',
];

function phraseOfDayIdx(offset = 0): number {
  const day = Math.floor(new Date(getTrackingDay() + 'T12:00:00').getTime() / 86_400_000);
  return (day + offset) % PHRASES.length;
}

// ─── Garden of Light — daily checklist (device-local, never sent anywhere) ────
interface GardenItem {
  id: string;
  icon: string;
  label: string;
  link?: string;
}
const GARDEN_ITEMS: GardenItem[] = [
  { id: 'adhkar', icon: '🌅', label: 'Morning & evening adhkār' },
  { id: 'dhikr', icon: '📿', label: 'A dhikr session (any amount counts)', link: '/zikr' },
  { id: 'salawat', icon: '💚', label: 'Ṣalawāt upon the Prophet ﷺ', link: '/zikr' },
  { id: 'istighfar', icon: '🌧️', label: 'Istighfār — seek forgiveness', link: '/zikr' },
  { id: 'listen', icon: '🎧', label: 'Listen to Quran (log it as pages)', link: '/quran' },
  { id: 'learn', icon: '📚', label: 'Learn one thing (tafsīr, a lecture, a hadith)' },
  { id: 'kindness', icon: '🎁', label: 'One act of kindness or charity' },
];

// ─── Ghusl steps (Bukhari 248 — Maimunah's description) ───────────────────────
const GHUSL_STEPS = [
  'Make the intention (niyyah) in your heart to purify yourself',
  'Wash both hands, then wash away any traces of blood',
  'Perform a complete wuḍū as for prayer',
  'Pour water over your head three times, massaging it to the roots of the hair',
  'Pour water over your whole body — right side first, then left',
];

// ─── "How are you today?" chips ───────────────────────────────────────────────
const FLOW_OPTIONS: Array<{ id: CycleFlow; label: string }> = [
  { id: 'light', label: '💧 Light' },
  { id: 'medium', label: '💧💧 Medium' },
  { id: 'heavy', label: '💧💧💧 Heavy' },
];
const SYMPTOM_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'cramps', label: '🌀 Cramps' },
  { id: 'headache', label: '🤕 Headache' },
  { id: 'fatigue', label: '🪫 Fatigue' },
  { id: 'nausea', label: '🌊 Nausea' },
  { id: 'backache', label: '🦴 Backache' },
  { id: 'bloating', label: '🎈 Bloating' },
  { id: 'tenderness', label: '🌡️ Tenderness' },
  { id: 'insomnia', label: '🌙 Insomnia' },
];
const MOOD_OPTIONS: Array<{ id: CycleMood; label: string }> = [
  { id: 'calm', label: '🕊️ Calm' },
  { id: 'happy', label: '🌈 Happy' },
  { id: 'low', label: '🌧️ Low' },
  { id: 'irritable', label: '🌪️ Irritable' },
  { id: 'anxious', label: '〰️ Anxious' },
  { id: 'tired', label: '🛌 Tired' },
];

function formatDay(dateStr: string): string {
  return formatLocaleDate(new Date(dateStr + 'T12:00:00'), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
function shiftStr(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86_400_000
  );
}

// ─── Curated du'a/adhkar for excused days (verified references) ──────────────
const EXCUSED_ADHKAR = [
  {
    icon: '🤲',
    label: 'Sayyid al-Istighfār',
    arabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ خَلَقْتَنِي وَأَنَا عَبْدُكَ',
    transliteration: 'Allāhumma anta rabbī, lā ilāha illā anta, khalaqtanī wa ana ʿabduka…',
    note: 'The master of seeking forgiveness',
    ref: { text: 'Bukhārī 6306', url: 'https://sunnah.com/bukhari:6306' },
  },
  {
    icon: '💚',
    label: 'Ṣalawāt upon the Prophet ﷺ',
    arabic: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
    transliteration: 'Allāhumma ṣalli ʿalā Muḥammad wa ʿalā āli Muḥammad…',
    note: 'Especially on Friday — open to you always',
    ref: { text: 'Bukhārī 3370', url: 'https://sunnah.com/bukhari:3370' },
  },
  {
    icon: '🛡️',
    label: 'Morning/evening protection',
    arabic:
      'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ',
    transliteration: 'Bismillāhilladhī lā yaḍurru maʿasmihi shayʾun fil-arḍi wa lā fis-samāʾ…',
    note: 'Say 3× morning and evening',
    ref: { text: 'Abū Dāwūd 5088', url: 'https://sunnah.com/abudawud:5088' },
  },
  {
    icon: '🌿',
    label: 'When in pain or discomfort',
    arabic: 'أَعُوذُ بِاللَّهِ وَقُدْرَتِهِ مِنْ شَرِّ مَا أَجِدُ وَأُحَاذِرُ',
    transliteration: 'Aʿūdhu billāhi wa qudratihi min sharri mā ajidu wa uḥādhiru',
    note: 'Place hand on the area of pain, say Bismillāh (3×), then this (7×)',
    ref: { text: 'Muslim 2202', url: 'https://sunnah.com/muslim:2202a' },
  },
  {
    icon: '🌧️',
    label: 'Istighfār — constant forgiveness',
    arabic: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullāha wa atūbu ilayh',
    note: 'The Prophet ﷺ sought forgiveness 100× daily',
    ref: { text: 'Muslim 2702', url: 'https://sunnah.com/muslim:2702a' },
  },
  {
    icon: '✨',
    label: 'SubḥānAllāh wa biḥamdih',
    arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ',
    transliteration: 'SubḥānAllāhi wa biḥamdih, SubḥānAllāhil-ʿAẓīm',
    note: 'Two phrases heavy on the scales, light on the tongue',
    ref: { text: 'Bukhārī 6406', url: 'https://sunnah.com/bukhari:6406' },
  },
];

/** Count days in [start..end] that fall in (adjusted) Ramadan — for auto-qada */
function ramadanDaysIn(start: string, end: string): number {
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

export default function RayhanahCycle() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isFemale = useIsFemale();
  const today = getTrackingDay();

  const { data: summary, isLoading, isError, refetch } = useCycleSummary();
  const { data: fastingSummary } = useFastingSummary();
  const startCycle = useStartCycle();
  const endCycle = useEndCycle();
  const updateFastingProfile = useUpdateFastingProfile();
  const upsertDay = useUpsertCycleDay();
  const partnerSync = usePartnerSync();
  const setPregnancy = useSetPregnancy();

  const [partnerPickerOpen, setPartnerPickerOpen] = useState(false);
  const { data: friends } = useFriendsList(partnerPickerOpen || !!summary?.partnerSync.enabled);

  const [pregnancyFormOpen, setPregnancyFormOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState('');

  const [startOpen, setStartOpen] = useState(false);
  const [startDate, setStartDate] = useState(today);
  const [startType, setStartType] = useState<'hayd' | 'nifas'>('hayd');
  const [ghuslOpen, setGhuslOpen] = useState(false);
  const [ghuslChecked, setGhuslChecked] = useState<boolean[]>(GHUSL_STEPS.map(() => false));
  const [qadaPrompt, setQadaPrompt] = useState<{ days: number } | null>(null);
  // Day navigation for "How are you today?" — allows editing past days within the active period
  const [viewDay, setViewDay] = useState(today);
  // Settings drawer (body stats + preferences), shared with Analytics
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Edit an episode (dates) or reopen the most recent one ("I'm not done yet")
  const editCycle = useEditCycleLog();

  const active = summary?.active ?? null;
  const todayNote = summary?.days?.find((d) => d.date === today) ?? null;
  const viewDayNote = summary?.days?.find((d) => d.date === viewDay) ?? null;
  // Reset viewDay to today whenever active period changes (e.g. period ends)
  useEffect(() => {
    if (!active) setViewDay(today);
  }, [active, today]);

  // Garden of Light checklist — server-synced (see useUpsertCycleDay), so
  // progress survives a device switch or cache clear instead of living only
  // in localStorage. One-time migration: any pre-existing local checklist
  // data (from before this was server-synced) is moved up on first load,
  // then every orphaned `bustandeen_rayhanah_garden_*` key is cleared — those
  // used to accumulate one new key per day forever with no cleanup.
  const gardenIds = useMemo(() => todayNote?.garden ?? [], [todayNote]);
  const garden = useMemo(() => Object.fromEntries(gardenIds.map((id) => [id, true])), [gardenIds]);
  useEffect(() => {
    const legacyKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith('bustandeen_rayhanah_garden_')
    );
    if (!legacyKeys.length) return;
    const todayKey = `bustandeen_rayhanah_garden_${today}`;
    if (legacyKeys.includes(todayKey) && !todayNote?.garden?.length) {
      try {
        const local = JSON.parse(localStorage.getItem(todayKey) ?? '{}') as Record<string, boolean>;
        const ids = Object.keys(local).filter((id) => local[id]);
        if (ids.length) upsertDay.mutate({ date: today, garden: ids });
      } catch {
        /* corrupt legacy entry — nothing to migrate */
      }
    }
    for (const k of legacyKeys) localStorage.removeItem(k);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time migration + cleanup pass; todayNote/upsertDay change identity often and re-running this after the first pass would be a no-op anyway
  }, []);

  const toggleGarden = (id: string) => {
    const already = gardenIds.includes(id);
    const next = already ? gardenIds.filter((g) => g !== id) : [...gardenIds, id];
    upsertDay.mutate({ date: today, garden: next });
    if (!already) celebrateSmall();
  };
  const gardenDone = gardenIds.length;

  // "I'm not done yet": the most recent completed episode, offered for reopen
  // when it ended within the last 3 days and nothing is active. Daily notes
  // belong to their dates, so reopening loses NOTHING.
  const lastEnded = useMemo(() => {
    if (active) return null;
    const done = (summary?.logs ?? []).filter((l) => l.endDate);
    if (!done.length) return null;
    const latest = [...done].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0]!;
    const diffDays = Math.round(
      (new Date(today + 'T12:00:00').getTime() - new Date(latest.endDate + 'T12:00:00').getTime()) /
        86_400_000
    );
    return diffDays >= 0 && diffDays <= 3 ? latest : null;
  }, [summary, active, today]);

  const setFlow = (flow: CycleFlow) =>
    upsertDay.mutate({ date: viewDay, flow: viewDayNote?.flow === flow ? null : flow });
  const toggleSymptom = (id: string) => {
    const cur = viewDayNote?.symptoms ?? [];
    upsertDay.mutate({
      date: viewDay,
      symptoms: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    });
  };
  // Moods are multi-select — a day can hold several feelings (Istiak).
  const toggleMood = (mood: CycleMood) => {
    const cur = viewDayNote?.moods ?? [];
    upsertDay.mutate({
      date: viewDay,
      moods: cur.includes(mood) ? cur.filter((m) => m !== mood) : [...cur, mood],
    });
  };

  const handleEndConfirmed = () => {
    const startedOn = active?.startDate;
    endCycle.mutate(
      { date: today },
      {
        onSuccess: () => {
          setGhuslOpen(true);
          setGhuslChecked(GHUSL_STEPS.map(() => false));
          if (startedOn) {
            const n = ramadanDaysIn(startedOn, today);
            if (n > 0) setQadaPrompt({ days: n });
          }
        },
      }
    );
  };

  const addQada = () => {
    if (!qadaPrompt) return;
    const current = fastingSummary?.profile?.qadaOwed ?? 0;
    updateFastingProfile.mutate(
      { qadaOwed: current + qadaPrompt.days },
      {
        onSuccess: () => {
          toast.success(
            t(
              'rayhanah.qadaAddedToast',
              '{{count, number}} qaḍā day(s) added — the tracker will guide you 🌸',
              { count: qadaPrompt.days }
            )
          );
          setQadaPrompt(null);
        },
      }
    );
  };

  const nextStartLabel = useMemo(() => {
    const ns = summary?.prediction?.nextStart;
    return ns ? formatDay(ns) : null;
  }, [summary]);

  // PMS heads-up: days until predicted next period
  const daysUntilNext = useMemo(() => {
    const ns = summary?.prediction?.nextStart;
    if (!ns || active) return null;
    return daysBetween(today, ns);
  }, [summary, active, today]);
  const pmsAlert = daysUntilNext !== null && daysUntilNext >= 0 && daysUntilNext <= 7;

  // Fasting makeup summary
  const qadaOwed = fastingSummary?.profile?.qadaOwed ?? 0;
  const qadaCompleted = fastingSummary?.qadaCompleted ?? 0;
  const qadaRemaining = Math.max(0, qadaOwed - qadaCompleted);
  const ramadanWindow = getRamadanWindow();
  const showRamadanQadaWarning =
    !ramadanWindow.active &&
    ramadanWindow.daysUntil > 0 &&
    ramadanWindow.daysUntil <= 30 &&
    qadaRemaining > 0;

  if (!user) return null;
  if (!isFemale) {
    // Gentle gate — the page is reachable only from the female-only menu entry
    return (
      <div className="min-h-[60vh] grid place-items-center px-4 text-center">
        <div>
          <div className="text-5xl mb-4">🌸</div>
          <p className="text-white/60 text-sm max-w-sm">
            {t(
              'rayhanah.genderGate',
              'Rayhanah Cycle is a private space for our sisters. Set your gender to female in'
            )}{' '}
            <button className="text-brand-emerald underline" onClick={() => navigate('/profile')}>
              {t('rayhanah.genderGateLink', 'your profile')}
            </button>{' '}
            {t('rayhanah.genderGateSuffix', 'to open it.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AnimatedBackground variant="dark">
      <h1 className="sr-only">{t('rayhanah.title', 'Rayhanah Cycle')}</h1>
      <div className="px-4 pt-3">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <TabNav
              items={[
                { label: `🌸 ${t('rayhanah.tabCycle', 'Cycle')}`, to: '/cycle', active: true },
                { label: `📊 ${t('rayhanah.tabAnalytics', 'Analytics')}`, to: '/cycle/analytics' },
              ]}
            />
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label={t('rayhanah.settings', 'Settings')}
            title={t('rayhanah.settings', 'Settings')}
            className="shrink-0 p-2 rounded-xl border border-brand-pink/20 bg-white/5 text-white/50 hover:text-brand-pink hover:border-brand-pink/40 transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="relative max-w-2xl mx-auto px-4 pt-4 pb-16 space-y-5">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-10 grid place-items-center">
            <span className="loading loading-spinner loading-lg text-brand-pink" />
          </div>
        ) : isError ? (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-8 text-center space-y-3">
            <p className="text-white/60 text-sm">
              {t('rayhanah.loadError', "Couldn't load your cycle data.")}
            </p>
            <button
              className="btn btn-sm bg-brand-pink/20 border-brand-pink/30 text-brand-pink"
              onClick={() => void refetch()}
            >
              {t('rayhanah.tryAgain', 'Try again')}
            </button>
          </div>
        ) : active ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 sm:p-8 border border-brand-pink/25 bg-gradient-to-br from-brand-pink/15 via-brand-pink/10 to-brand-info/10 relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-pink/15 blur-2xl animate-pulse" />
            <div className="relative">
              <div className="flex items-center gap-2 text-brand-pink/90 text-xs font-bold uppercase tracking-widest">
                {active.type === 'nifas'
                  ? `🤱 ${t('rayhanah.nifasHeader', 'Nifās — post-natal rest')}`
                  : `🌸 ${t('rayhanah.haydHeader', 'Rayhanah days')}`}
              </div>
              <h1 className="text-3xl font-black text-white mt-2">
                {t('rayhanah.dayCount', 'Day {{count, number}}', { count: active.dayCount })}
                <span className="text-white/40 text-lg font-semibold">
                  {' '}
                  ·{' '}
                  {t('rayhanah.sinceDate', 'since {{date}}', { date: formatDay(active.startDate) })}
                </span>
              </h1>
              <p className="text-brand-pink/80 text-sm mt-3 leading-relaxed">
                {t(`rayhanah.phrase${phraseOfDayIdx()}`, PHRASES[phraseOfDayIdx()]!)}
              </p>

              {active.beyondMax && (
                <div className="mt-4 rounded-2xl bg-brand-gold/15 border border-brand-gold/30 p-4 text-brand-gold/90 text-xs leading-relaxed">
                  <span className="font-bold">
                    {t(
                      'rayhanah.beyondMaxWarning',
                      'Day {{dayCount, number}} has passed the {{maxDays, number}}-day maximum ({{madhab}} view{{nifas}}).',
                      {
                        dayCount: active.dayCount,
                        maxDays: active.maxDays,
                        madhab: summary?.madhab === 'hanafi' ? 'Ḥanafī' : 'majority',
                        nifas: active.type === 'nifas' ? ', nifās' : '',
                      }
                    )}
                  </span>{' '}
                  {t('rayhanah.istihadaNote', 'Bleeding beyond the maximum is usually')}{' '}
                  <span className="font-bold">{t('rayhanah.istihadaLabel', 'istiḥāḍa')}</span> —{' '}
                  {t('rayhanah.istihadaResume', 'prayer resumes with fresh wuḍū for each prayer')} (
                  <a
                    className="underline"
                    href="https://sunnah.com/bukhari:306"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Bukhārī 306', i18n.language)}
                  </a>
                  ). {t('rayhanah.scholarAdvice', 'Please confirm with a scholar you trust.')}
                </div>
              )}

              <div className="mt-4">
                <CycleGuidance dayCount={active.dayCount} />
              </div>

              <button
                className="mt-5 w-full btn h-14 rounded-2xl border-0 text-white text-base font-black bg-gradient-to-r from-brand-pink to-brand-pink hover:from-brand-pink hover:to-brand-pink shadow-lg shadow-brand-pink-dim/40"
                onClick={handleEndConfirmed}
                disabled={endCycle.isPending}
              >
                {endCycle.isPending ? (
                  <span className="loading loading-spinner" />
                ) : (
                  `🕊️ ${t('rayhanah.endPeriod', 'My period has ended')}`
                )}
              </button>
              <p className="text-white/30 text-[11px] text-center mt-2">
                {t(
                  'rayhanah.endPeriodHelp',
                  'Tap when the bleeding has fully stopped — the ghusl guide opens next.'
                )}
              </p>
            </div>
          </motion.div>
        ) : summary?.pregnancy.active ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 sm:p-8 border border-brand-emerald/20 bg-gradient-to-br from-brand-emerald/10 via-brand-deep/80 to-brand-info/10 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 text-brand-emerald/80 text-xs font-bold uppercase tracking-widest">
              🤰 {t('rayhanah.pregnancyHeader', 'Expecting')}
            </div>
            <h1 className="text-2xl font-black text-white mt-2">
              {summary.pregnancy.weeksAlong != null
                ? t('rayhanah.pregnancyWeek', 'Week {{week, number}}', {
                    week: summary.pregnancy.weeksAlong,
                  })
                : t('rayhanah.pregnancyHeader', 'Expecting')}
            </h1>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              {t(
                'rayhanah.pregnancyMessage',
                "May Allah grant you ease and a safe delivery. Cycle predictions are paused while you're expecting — salat and fasting are unaffected by pregnancy alone."
              )}
            </p>
            {summary.pregnancy.dueDate && (
              <p className="text-white/30 text-xs mt-3">
                {t('rayhanah.pregnancyDueDate', 'Expected due date: {{date}}', {
                  date: formatDay(summary.pregnancy.dueDate),
                })}
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl p-6 sm:p-8 border border-brand-border bg-brand-deep/80 relative overflow-hidden"
          >
            <div className="flex items-center gap-2 text-brand-emerald/80 text-xs font-bold uppercase tracking-widest">
              ✨ {t('rayhanah.daysOfPurity', 'Days of purity')}
            </div>
            <h1 className="text-2xl font-black text-white mt-2">
              {t('rayhanah.greeting', 'Assalamu alaikum, {{name}}', {
                name: user.displayName?.split(' ')[0] ?? t('rayhanah.sister', 'sister'),
              })}{' '}
              🌷
            </h1>
            <p className="text-white/50 text-sm mt-2 leading-relaxed">
              {nextStartLabel ? (
                <>
                  {t(
                    'rayhanah.nextPeriodPrediction',
                    'Based on your history, your next period is expected around'
                  )}{' '}
                  <span className="text-brand-pink font-semibold">{nextStartLabel}</span>{' '}
                  {t('rayhanah.avgCycleNote', '(avg cycle {{days, number}} days).', {
                    days: summary?.prediction.avgCycleDays ?? 0,
                  })}
                </>
              ) : (
                t(
                  'rayhanah.firstCycleNote',
                  'Log your first cycle and Rayhanah will learn your rhythm to predict the next one.'
                )
              )}
            </p>
            {pmsAlert && (
              <div className="mt-3 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 p-3 text-xs leading-relaxed">
                <span className="font-bold text-brand-gold/90">
                  {daysUntilNext === 0
                    ? t('rayhanah.pmsToday', '🌸 Your period may start today')
                    : daysUntilNext === 1
                      ? t('rayhanah.pmsTomorrow', '🌸 Your period may start tomorrow')
                      : t(
                          'rayhanah.pmsCountdown',
                          '🌸 ~{{days, number}} days until your expected period',
                          { days: daysUntilNext }
                        )}
                </span>
                <p className="text-white/40 mt-1">
                  {t(
                    'rayhanah.pmsSymptomNote',
                    'You may notice PMS symptoms. Be gentle with yourself — extra dhikr and rest are your friends.'
                  )}
                </p>
              </div>
            )}
            {summary?.prediction?.nextStart &&
              (summary?.prediction?.basedOnCycles ?? 0) > 0 &&
              !pmsAlert && (
                <div className="mt-3 rounded-2xl bg-brand-info/10 border border-brand-info/15 p-3 text-xs leading-relaxed">
                  <span className="font-bold text-brand-info/90">
                    {t('rayhanah.fertileWindowEstimate', '🌿 Fertile window estimate')}
                  </span>
                  <p className="text-white/40 mt-1">
                    ~{formatDay(shiftStr(summary.prediction.nextStart, -16))} –{' '}
                    {formatDay(shiftStr(summary.prediction.nextStart, -12))}
                    <span className="text-white/25">
                      {' '}
                      ·{' '}
                      {t('rayhanah.ovulationApprox', 'ovulation ~{{date}}', {
                        date: formatDay(shiftStr(summary.prediction.nextStart, -14)),
                      })}
                    </span>
                  </p>
                </div>
              )}
            <button
              className="mt-5 w-full btn h-14 rounded-2xl border border-brand-pink/30 bg-brand-pink/15 hover:bg-brand-pink/25 text-brand-pink text-base font-black"
              onClick={() => {
                setStartDate(today);
                setStartType('hayd');
                setStartOpen(true);
              }}
            >
              {t('rayhanah.myPeriodStarted', '🌸 My period started')}
            </button>
          </motion.div>
        )}

        {/* ── Garden of Light (only during excused days) ────────────────────── */}
        {active && (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black">
                {t('rayhanah.gardenOfLight', '🪻 Garden of Light')}
              </h2>
              <span className="text-xs font-bold text-brand-pink/80">
                {t('rayhanah.gardenProgress', '{{done, number}}/{{total, number}} today', {
                  done: gardenDone,
                  total: GARDEN_ITEMS.length,
                })}
              </span>
            </div>
            <p className="text-white/40 text-xs mt-1">
              {t(
                'rayhanah.gardenIntro',
                'Everything here remains fully open to you — the Prophet ﷺ remembered Allah in all states'
              )}
              (
              <a
                className="underline"
                href="https://sunnah.com/muslim:373"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Muslim 373', i18n.language)}
              </a>
              ).
            </p>
            <div className="mt-3 space-y-1.5">
              {GARDEN_ITEMS.map((g) => {
                const gLabel = t(`rayhanah.garden.${g.id}`, g.label);
                return (
                  <div
                    key={g.id}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 bg-white/5 hover:bg-white/5 transition-colors"
                  >
                    <button
                      aria-label={t('rayhanah.markItem', 'Mark {{label}}', { label: gLabel })}
                      onClick={() => toggleGarden(g.id)}
                      className={`w-6 h-6 rounded-full grid place-items-center border transition-all flex-shrink-0 ${garden[g.id] ? 'bg-brand-pink border-brand-pink text-white' : 'border-brand-emerald/20 text-transparent hover:border-brand-pink/60'}`}
                    >
                      ✓
                    </button>
                    <span
                      className={`text-sm flex-1 ${garden[g.id] ? 'text-white/40 line-through' : 'text-white/80'}`}
                    >
                      {g.icon} {gLabel}
                    </span>
                    {g.link && (
                      <button
                        className="text-xs text-brand-pink/80 hover:text-brand-pink"
                        onClick={() => navigate(g.link!)}
                      >
                        {t('rayhanah.openArrow', 'Open →')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {gardenDone === GARDEN_ITEMS.length && (
              <p className="text-center text-brand-pink/90 text-sm font-semibold mt-3">
                {t('rayhanah.gardenComplete', '🌺 Mā shāʾ Allāh — a full garden today!')}
              </p>
            )}
          </div>
        )}

        {/* ── How are you today? (private wellness note) ────────────────────── */}
        {active && (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-white font-black">
                {viewDay === today
                  ? t('rayhanah.howAreYouToday', '🌷 How are you today?')
                  : t('rayhanah.editingDay', '🌷 {{date}}', { date: formatDay(viewDay) })}
              </h2>
              <span className="text-[10px] text-white/25">
                {t('rayhanah.privateNote', 'private — only you can see this')}
              </span>
            </div>

            {/* Day navigation — only shown during an active period */}
            <div className="flex items-center gap-2">
              <button
                aria-label={t('rayhanah.dayNavBack', 'Previous day')}
                disabled={viewDay <= active.startDate}
                onClick={() => setViewDay((d) => shiftStr(d, -1))}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>
              <span className="flex-1 text-center text-xs text-white/50 font-semibold">
                {viewDay === today ? t('common.today', 'Today') : formatDay(viewDay)}
              </span>
              <button
                aria-label={t('rayhanah.dayNavForward', 'Next day')}
                disabled={viewDay >= today}
                onClick={() => setViewDay((d) => shiftStr(d, 1))}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
              {viewDay !== today && (
                <button
                  onClick={() => setViewDay(today)}
                  className="text-[10px] text-brand-pink/70 hover:text-brand-pink font-semibold px-2 py-1 rounded-lg hover:bg-brand-pink/10 transition-colors"
                >
                  {t('rayhanah.backToToday', 'Back to today')}
                </button>
              )}
            </div>

            {viewDay !== today && (
              <p className="text-white/30 text-[11px] leading-relaxed">
                {t('rayhanah.editingDayNote', 'Editing {{date}} — changes are saved immediately.', {
                  date: formatDay(viewDay),
                })}
              </p>
            )}

            <div>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-wide mb-1.5">
                {t('rayhanah.flowLabel', 'Flow')}{' '}
                <span className="normal-case font-normal text-white/25">
                  · {t('rayhanah.pickOne', 'pick one')}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {FLOW_OPTIONS.map((f) => {
                  const on = viewDayNote?.flow === f.id;
                  return (
                    <button
                      key={f.id}
                      aria-pressed={on}
                      className={`btn btn-xs rounded-full border font-bold ${on ? 'bg-brand-pink/30 border-brand-pink/70 text-white ring-1 ring-brand-pink/50' : 'bg-white/5 border-brand-emerald/10 text-white/50 hover:text-white'}`}
                      onClick={() => setFlow(f.id)}
                    >
                      {on && '✓ '}
                      {t(`rayhanah.flow.${f.id}`, f.label)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-wide mb-1.5">
                {t('rayhanah.bodyLabel', 'Body')}{' '}
                <span className="normal-case font-normal text-white/25">
                  · {t('rayhanah.pickAnyThatFit', 'pick any that fit')}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_OPTIONS.map((sy) => {
                  const on = !!viewDayNote?.symptoms?.includes(sy.id);
                  return (
                    <button
                      key={sy.id}
                      aria-pressed={on}
                      className={`btn btn-xs rounded-full border font-bold ${on ? 'bg-brand-pink/30 border-brand-pink/70 text-white ring-1 ring-brand-pink/50' : 'bg-white/5 border-brand-emerald/10 text-white/50 hover:text-white'}`}
                      onClick={() => toggleSymptom(sy.id)}
                    >
                      {on && '✓ '}
                      {t(`rayhanah.symptom.${sy.id}`, sy.label)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-white/40 text-[11px] font-bold uppercase tracking-wide mb-1.5">
                {t('rayhanah.heartLabel', 'Heart')}{' '}
                <span className="normal-case font-normal text-white/25">
                  · {t('rayhanah.pickAnyThatFit', 'pick any that fit')}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MOOD_OPTIONS.map((mo) => {
                  const on = !!viewDayNote?.moods?.includes(mo.id);
                  return (
                    <button
                      key={mo.id}
                      aria-pressed={on}
                      className={`btn btn-xs rounded-full border font-bold ${on ? 'bg-brand-info/30 border-brand-info/70 text-white ring-1 ring-brand-info/50' : 'bg-white/5 border-brand-emerald/10 text-white/50 hover:text-white'}`}
                      onClick={() => toggleMood(mo.id)}
                    >
                      {on && '✓ '}
                      {t(`rayhanah.mood.${mo.id}`, mo.label)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* A gentle fixed line for the feelings she named (today only). On-device only: no cycle data goes to any AI. */}
            {viewDay === today && <MoodComfort moods={todayNote?.moods ?? []} />}

            {(viewDayNote?.symptoms?.length ?? 0) > 0 && (
              <p className="text-brand-pink/70 text-xs leading-relaxed border-t border-brand-emerald/5 pt-2.5">
                {t(
                  'rayhanah.easeHadith',
                  'May Allah give you ease — no fatigue or pain touches a Muslim except that Allah wipes away sins with it'
                )}{' '}
                (
                <a
                  className="underline"
                  href="https://sunnah.com/bukhari:5641"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Bukhārī 5641', i18n.language)}
                </a>
                ). 🌸
              </p>
            )}
          </div>
        )}

        {/* ── Du'a & adhkar for excused days ────────────────────────────── */}
        {active && (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5 space-y-3">
            <h2 className="text-white font-black">
              {t('rayhanah.adhkarGardenTitle', '🤲 Your adhkār garden')}
            </h2>
            <p className="text-white/40 text-xs leading-relaxed">
              {t(
                'rayhanah.adhkarGardenIntro',
                "Curated authentic du'a you can recite right now — dhikr, istighfār and ṣalawāt are fully open to you in every state"
              )}{' '}
              (
              <a
                className="underline"
                href="https://sunnah.com/muslim:373"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Muslim 373', i18n.language)}
              </a>
              ).
            </p>
            <div className="space-y-2">
              {EXCUSED_ADHKAR.map((dua, i) => (
                <details
                  key={dua.label}
                  className="group rounded-2xl bg-white/[0.03] border border-brand-emerald/10 overflow-hidden"
                >
                  <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer list-none">
                    <span className="text-lg shrink-0">{dua.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-bold">
                        {t(`rayhanah.adhkar.${i}.label`, dua.label)}
                      </p>
                      <p className="text-white/30 text-[10px]">
                        {t(`rayhanah.adhkar.${i}.note`, dua.note)}
                      </p>
                    </div>
                    <span className="text-white/20 text-xs group-open:rotate-180 transition-transform">
                      ▾
                    </span>
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    <p
                      className="text-xl text-white/90 font-semibold leading-loose text-right"
                      dir="rtl"
                      lang="ar"
                    >
                      {dua.arabic}
                    </p>
                    <p className="text-white/50 text-xs italic">{dua.transliteration}</p>
                    <a
                      className="text-brand-emerald/80 text-[11px] underline"
                      href={dua.ref.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      📖 {translateReference(dua.ref.text, i18n.language)}
                    </a>
                  </div>
                </details>
              ))}
            </div>
            <div className="rounded-2xl bg-brand-info/10 border border-brand-info/15 p-3 space-y-1.5">
              <p className="text-brand-info/90 text-xs font-bold">
                {t('rayhanah.reciteQuranQ', '📖 Can I recite the Quran?')}
              </p>
              <p className="text-white/50 text-[11px] leading-relaxed">
                <span className="font-semibold text-white/60">
                  {t('rayhanah.listening', 'Listening')}
                </span>{' '}
                {t('rayhanah.listeningAgreed', 'is agreed upon by all scholars.')}{' '}
                <span className="font-semibold text-white/60">
                  {t('rayhanah.recitingFromMemory', 'Reciting from memory')}
                </span>{' '}
                {t(
                  'rayhanah.recitingDifference',
                  'is a matter of scholarly difference: the majority (Ḥanafī, Shāfiʿī, Ḥanbalī) say it is not permitted during menses, while the Mālikī school and Ibn Taymiyyah permit it.'
                )}{' '}
                {t(
                  'rayhanah.duaConsensus',
                  "Du'ā using Quranic phrases is permitted by consensus. Ask a scholar you trust for your situation."
                )}
              </p>
            </div>
          </div>
        )}

        {/* ── Fasting makeup summary ─────────────────────────────────────────
            Gated on qadaRemaining (not qadaOwed, which is the lifetime total)
            so the card disappears once every owed fast is made up, instead of
            leaving a stale "0 remaining" reminder around forever. */}
        {qadaRemaining > 0 && (
          <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-black">
                {t('rayhanah.fastingMakeupTitle', '🌙 Fasting makeup')}
              </h2>
              <button
                className="text-brand-info text-xs font-bold hover:underline"
                onClick={() => navigate('/fasting')}
              >
                {t('rayhanah.openTrackerArrow', 'Open tracker →')}
              </button>
            </div>
            <p className="text-white/30 text-xs mt-1">
              {t('rayhanah.missedFastsMadeUp', 'Missed Ramadan fasts are made up after')} (
              <a
                className="underline"
                href="https://sunnah.com/muslim:335"
                target="_blank"
                rel="noreferrer"
              >
                {translateReference('Muslim 335', i18n.language)}
              </a>
              ).
            </p>
            {showRamadanQadaWarning && (
              <p className="text-brand-gold/90 text-xs mt-2 leading-relaxed">
                🌙{' '}
                {t(
                  'rayhanah.ramadanQadaWarning',
                  'Ramadan starts in {{days, number}} days — {{count, number}} still to go before then.',
                  {
                    days: ramadanWindow.daysUntil,
                    count: qadaRemaining,
                  }
                )}
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-brand-gold/10 border border-brand-gold/15 p-3 text-center">
                <p className="text-xl font-black text-brand-gold">{formatLocaleNumber(qadaOwed)}</p>
                <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
                  {t('rayhanah.owed', 'owed')}
                </p>
              </div>
              <div className="rounded-xl bg-brand-emerald/10 border border-brand-emerald/15 p-3 text-center">
                <p className="text-xl font-black text-brand-emerald">
                  {formatLocaleNumber(qadaCompleted)}
                </p>
                <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
                  {t('rayhanah.madeUp', 'made up')}
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-brand-border p-3 text-center">
                <p className="text-xl font-black text-white/70">
                  {formatLocaleNumber(qadaRemaining)}
                </p>
                <p className="text-white/30 text-[10px] font-bold uppercase mt-1">
                  {t('rayhanah.remaining', 'remaining')}
                </p>
              </div>
            </div>
            {qadaRemaining > 0 && (
              <p className="text-white/25 text-[10px] mt-3 leading-relaxed">
                {qadaRemaining === 1
                  ? t('rayhanah.oneDayToGo', 'One more day to go — you can do it!')
                  : t(
                      'rayhanah.daysRemainingNote',
                      '{{count, number}} days remaining. Take your time — every made-up fast counts.',
                      { count: qadaRemaining }
                    )}
              </p>
            )}
          </div>
        )}

        {/* ── "I'm not done yet" — ABOVE the calendar so it's the first thing
               she sees after ending too early (Istiak's spec) ── */}
        {lastEnded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-brand-pink/25 bg-brand-pink/[0.06] p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-brand-pink/90 text-sm font-bold">
                {t('rayhanah.endedTooEarly', 'Ended too early?')}
              </p>
              <p className="text-white/40 text-xs mt-0.5 leading-relaxed">
                {t(
                  'rayhanah.endedTooEarlyDesc',
                  'If the flow returned after you marked {{date}} as the end, you can reopen that cycle — all your daily notes stay exactly where they are.',
                  { date: formatDay(lastEnded.endDate!) }
                )}
              </p>
            </div>
            <button
              className="btn btn-sm rounded-xl border border-brand-pink/40 bg-brand-pink/15 text-brand-pink hover:bg-brand-pink/25 shrink-0"
              disabled={editCycle.isPending}
              onClick={() =>
                editCycle.mutate(
                  { logId: lastEnded._id, endDate: null },
                  {
                    onSuccess: () =>
                      toast.success(
                        t('rayhanah.cycleReopenedToast', 'Cycle reopened — take your time 🌸'),
                        { id: 'cycle-reopen' }
                      ),
                  }
                )
              }
            >
              {t('rayhanah.notDoneYet', "🌸 I'm not done yet")}
            </button>
          </motion.div>
        )}

        {/* ── Cycle calendar + stats ────────────────────────────────────────── */}
        {summary && <CycleCalendar summary={summary} today={today} />}

        {/* ── Settings + history ─────────────────────────────────────────────── */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5 space-y-4">
          {/* ── Partner sync — opt-in, revocable, status-only ── */}
          <div className="pt-3 border-t border-brand-border/50">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">
                  🤝 {t('rayhanah.partnerSyncTitle', 'Share cycle status')}
                </p>
                <p className="text-white/30 text-xs leading-relaxed">
                  {t(
                    'rayhanah.partnerSyncDesc',
                    'One friend sees only "on her cycle" / "not" — never dates, symptoms, or notes. Turn off anytime.'
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm border-brand-pink/40 [--tglbg:theme(colors.brand-surface)] checked:bg-brand-pink checked:border-brand-pink shrink-0"
                checked={summary?.partnerSync.enabled ?? false}
                disabled={partnerSync.isPending}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPartnerPickerOpen(true);
                  } else {
                    partnerSync.mutate({ enabled: false });
                    setPartnerPickerOpen(false);
                  }
                }}
              />
            </div>

            {summary?.partnerSync.enabled && summary.partnerSync.partnerUid && (
              <p className="text-brand-emerald/70 text-xs mt-2">
                {t('rayhanah.sharingWith', 'Currently sharing with {{name}}', {
                  name:
                    friends?.find((f) => f.uid === summary.partnerSync.partnerUid)?.displayName ??
                    t('rayhanah.aFriend', 'a friend'),
                })}
              </p>
            )}

            {partnerPickerOpen && !summary?.partnerSync.enabled && (
              <div className="mt-2 space-y-1.5">
                {!friends?.length ? (
                  <p className="text-white/25 text-xs">
                    {t(
                      'rayhanah.partnerSyncNoFriends',
                      'Connect with a friend first — Friends page — then come back here.'
                    )}
                  </p>
                ) : (
                  friends.map((f) => (
                    <button
                      key={f.uid}
                      className="w-full flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-2 text-xs text-white/70 text-left transition-colors"
                      onClick={() => {
                        partnerSync.mutate({ enabled: true, partnerUid: f.uid });
                        setPartnerPickerOpen(false);
                      }}
                    >
                      <span>👤</span>
                      <span className="truncate">{f.displayName}</span>
                    </button>
                  ))
                )}
                <button
                  className="text-white/25 text-xs hover:text-white/50"
                  onClick={() => setPartnerPickerOpen(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            )}
          </div>

          {/* ── Pregnancy — pauses hayd predictions only; salat/fasting unaffected ── */}
          <div className="pt-3 border-t border-brand-border/50">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-white font-bold text-sm">
                  🤰 {t('rayhanah.pregnancyToggleTitle', "I'm currently pregnant")}
                </p>
                <p className="text-white/30 text-xs leading-relaxed">
                  {t(
                    'rayhanah.pregnancyToggleDesc',
                    'Pauses period predictions and shows a week count instead. Does not change your salat or fasting tracking.'
                  )}
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm border-brand-emerald/40 [--tglbg:theme(colors.brand-surface)] checked:bg-brand-emerald checked:border-brand-emerald shrink-0"
                checked={summary?.pregnancy.active ?? false}
                disabled={setPregnancy.isPending}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDueDateInput(summary?.pregnancy.dueDate ?? '');
                    setPregnancyFormOpen(true);
                  } else {
                    setPregnancy.mutate({ active: false });
                    setPregnancyFormOpen(false);
                  }
                }}
              />
            </div>

            {pregnancyFormOpen && !summary?.pregnancy.active && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="date"
                  className="input input-sm bg-white/5 border-brand-border text-white/80 flex-1"
                  value={dueDateInput}
                  onChange={(e) => setDueDateInput(e.target.value)}
                />
                <button
                  className="btn btn-sm bg-brand-emerald/20 border-brand-emerald/30 text-brand-emerald disabled:opacity-40"
                  disabled={!dueDateInput || setPregnancy.isPending}
                  onClick={() => {
                    setPregnancy.mutate({ active: true, dueDate: dueDateInput });
                    setPregnancyFormOpen(false);
                  }}
                >
                  {t('rayhanah.pregnancySave', 'Save')}
                </button>
                <button
                  className="text-white/25 text-xs hover:text-white/50"
                  onClick={() => setPregnancyFormOpen(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            )}
            {!pregnancyFormOpen && summary?.pregnancy.active && summary.pregnancy.dueDate && (
              <p className="text-brand-emerald/70 text-xs mt-2">
                {t('rayhanah.pregnancyDueDate', 'Expected due date: {{date}}', {
                  date: formatDay(summary.pregnancy.dueDate),
                })}
              </p>
            )}
          </div>

          <p className="text-white/25 text-[10px] leading-relaxed border-t border-brand-emerald/5 pt-3">
            {t(
              'rayhanah.privacyNote',
              '🔒 Your cycle data is visible only to you. It is never shown to friends — on the leaderboard your Noor simply flows from the dhikr, Quran and ṣalawāt you do, exactly like any other day.'
            )}
          </p>
        </div>

        {/* ── What changes / what stays (education) ─────────────────────────── */}
        <div className="rounded-3xl bg-brand-deep/80 border border-brand-border p-5 space-y-4">
          <h2 className="text-white font-black">
            {t('rayhanah.fiqhCompanionTitle', '📖 Your fiqh companion')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3 text-xs leading-relaxed">
            <div className="rounded-2xl bg-brand-pink/10 border border-brand-pink/20 p-4">
              <p className="font-bold text-brand-pink mb-1.5">
                {t('rayhanah.pausedForNow', 'Paused for now 🌙')}
              </p>
              <ul className="space-y-1 text-white/60">
                <li>
                  • {t('rayhanah.salatExcusedPre', 'Ṣalāt — fully excused,')}{' '}
                  <span className="font-semibold text-brand-pink/90">
                    {t('rayhanah.neverMadeUp', 'never made up')}
                  </span>{' '}
                  (
                  <a
                    className="underline"
                    href="https://sunnah.com/muslim:335"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Muslim 335', i18n.language)}
                  </a>
                  )
                </li>
                <li>
                  • {t('rayhanah.fastingExcusedLater', 'Fasting — excused now, made up later')} (
                  <a
                    className="underline"
                    href="https://sunnah.com/muslim:335"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Muslim 335', i18n.language)}
                  </a>
                  )
                </li>
                <li>
                  • {t('rayhanah.tawafExcused', 'Ṭawāf around the Kaʿbah')} (
                  <a
                    className="underline"
                    href="https://sunnah.com/bukhari:305"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Bukhārī 305', i18n.language)}
                  </a>
                  )
                </li>
                <li>
                  • {t('rayhanah.intimacyExcused', 'Intimacy during menses')} (
                  <a
                    className="underline"
                    href="https://quran.com/2/222"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Quran 2:222', i18n.language)}
                  </a>
                  )
                </li>
              </ul>
            </div>
            <div className="rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20 p-4">
              <p className="font-bold text-brand-emerald mb-1.5">
                {t('rayhanah.fullyOpenToYou', 'Fully open to you 🌸')}
              </p>
              <ul className="space-y-1 text-white/60">
                <li>
                  • {t('rayhanah.dhikrDuaSalawat', 'All dhikr, duʿā & ṣalawāt')} (
                  <a
                    className="underline"
                    href="https://sunnah.com/muslim:373"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Muslim 373', i18n.language)}
                  </a>
                  )
                </li>
                <li>
                  •{' '}
                  {t('rayhanah.listeningQuranTafsir', 'Listening to the Quran, tafsīr & knowledge')}
                </li>
                <li>
                  • {t('rayhanah.attendingGatherings', 'Attending gatherings of good & duʿā')} (
                  <a
                    className="underline"
                    href="https://sunnah.com/bukhari:971"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {translateReference('Bukhārī 971', i18n.language)}
                  </a>
                  )
                </li>
                <li>• {t('rayhanah.charityKindness', 'Charity, kindness, and serving others')}</li>
              </ul>
            </div>
          </div>
          <p className="text-white/30 text-[11px] leading-relaxed">
            {t(
              'rayhanah.aishahHajjStory',
              'The Prophet ﷺ told ʿĀʾishah (may Allah be pleased with her) during Hajj: do everything the pilgrim does, except ṭawāf'
            )}{' '}
            —{' '}
            <a
              className="underline"
              href="https://sunnah.com/bukhari:305"
              target="_blank"
              rel="noreferrer"
            >
              {translateReference('Ṣaḥīḥ al-Bukhārī 305', i18n.language)}
            </a>
            .{' '}
            {t(
              'rayhanah.recitingScholarlyDifference',
              'Reciting Quran from memory is a matter of scholarly difference; listening is agreed upon. Ask a scholar you trust.'
            )}
          </p>

          {/* Istihadah guide */}
          <details className="group rounded-2xl bg-brand-gold/[0.06] border border-brand-gold/20 p-4 cursor-pointer">
            <summary className="list-none flex items-center justify-between">
              <p className="font-bold text-brand-gold text-sm">
                {t('rayhanah.istihadaQ', '🩸 What is istiḥāḍa?')}
              </p>
              <span className="text-white/20 text-xs group-open:rotate-180 transition-transform">
                ▾
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-xs leading-relaxed text-white/60">
              <p>
                <span className="font-bold text-white/80">
                  {t('rayhanah.istihadaTerm', 'Istiḥāḍa')}
                </span>{' '}
                {t(
                  'rayhanah.istihadaDefinition',
                  '(irregular/non-menstrual bleeding) is bleeding that goes beyond the maximum period length (Ḥanafī: 10 days, majority: 15 days), or that occurs outside the normal menstrual pattern.'
                )}
              </p>
              <p>
                {t('rayhanah.fatimahHadithIntro', 'The Prophet ﷺ told')}{' '}
                <span className="font-semibold">
                  {t('rayhanah.fatimahName', 'Fāṭimah bint Abī Ḥubaysh')}
                </span>
                :{' '}
                <span className="italic text-white/70">
                  {t(
                    'rayhanah.fatimahHadithQuote',
                    '"That is a vein, not menstruation. When your period comes, stop praying, and when it ends, wash the blood off and pray."'
                  )}
                </span>{' '}
                (
                <a
                  className="underline text-brand-gold/80"
                  href="https://sunnah.com/bukhari:306"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Bukhārī 306', i18n.language)}
                </a>
                )
              </p>
              <div className="rounded-xl bg-white/[0.04] p-3 space-y-1.5">
                <p className="font-bold text-brand-gold/90">
                  {t('rayhanah.duringIstihada', 'During istiḥāḍa:')}
                </p>
                <ul className="space-y-1 ml-3">
                  <li>
                    •{' '}
                    <span className="font-semibold text-white/70">
                      {t('rayhanah.salatResumes', 'Ṣalāt resumes')}
                    </span>{' '}
                    — {t('rayhanah.salatResumesDesc', 'perform wuḍū for each prayer time')}
                  </li>
                  <li>
                    •{' '}
                    <span className="font-semibold text-white/70">
                      {t('rayhanah.fastingValid', 'Fasting is valid')}
                    </span>{' '}
                    — {t('rayhanah.fastingValidDesc', 'no makeup needed for these days')}
                  </li>
                  <li>
                    •{' '}
                    <span className="font-semibold text-white/70">
                      {t('rayhanah.intimacyPermitted', 'Intimacy is permitted')}
                    </span>{' '}
                    {t('rayhanah.majorityView', '(majority view)')}
                  </li>
                  <li>
                    •{' '}
                    <span className="font-semibold text-white/70">
                      {t('rayhanah.quranRecitationPermitted', 'Quran recitation is permitted')}
                    </span>
                  </li>
                </ul>
              </div>
              <p className="text-white/30 text-[10px]">
                {t(
                  'rayhanah.istihadaAutoFlag',
                  "Rayhanah automatically flags when your cycle exceeds the maximum for your chosen madhab. If you're unsure, consult a scholar you trust."
                )}
              </p>
            </div>
          </details>
        </div>
      </div>

      <RayhanahSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── Start modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {startOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
            onClick={() => setStartOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-3xl bg-brand-deep border border-brand-pink/25 p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-white font-black text-lg">
                {t('rayhanah.logTheStart', '🌸 Log the start')}
              </h3>
              <div>
                <label className="text-white/50 text-xs font-bold" htmlFor="cycle-start-date">
                  {t('rayhanah.startDate', 'Start date')}
                </label>
                <input
                  id="cycle-start-date"
                  type="date"
                  value={startDate}
                  max={today}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input input-bordered w-full mt-1 bg-white/5 border-brand-emerald/10 text-white"
                />
              </div>
              <div className="flex gap-2">
                {(['hayd', 'nifas'] as const).map((item) => (
                  <button
                    key={item}
                    className={`flex-1 btn btn-sm rounded-xl ${startType === item ? 'bg-brand-pink/30 border-brand-pink/40 text-brand-pink' : 'bg-white/5 border-brand-emerald/10 text-white/50'}`}
                    onClick={() => setStartType(item)}
                  >
                    {item === 'hayd'
                      ? t('rayhanah.periodHayd', '🌸 Period (hayd)')
                      : t('rayhanah.postNatal', '🤱 Post-natal (nifās)')}
                  </button>
                ))}
              </div>
              <button
                className="w-full btn rounded-2xl border-0 text-white font-black bg-gradient-to-r from-brand-pink to-brand-pink"
                disabled={startCycle.isPending}
                onClick={() =>
                  startCycle.mutate(
                    { date: startDate, type: startType },
                    { onSuccess: () => setStartOpen(false) }
                  )
                }
              >
                {startCycle.isPending ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  t('rayhanah.beginRayhanahDays', 'Begin Rayhanah days')
                )}
              </button>
              <p className="text-white/30 text-[11px] text-center leading-relaxed">
                {t(
                  'rayhanah.startModalFooter',
                  'Salat & fasting pause automatically — your Noor continues from dhikr, Quran & ṣalawāt. 🌷'
                )}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ghusl modal ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {ghuslOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-3xl bg-brand-deep border border-brand-emerald/25 p-6 space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <h3 className="text-white font-black text-lg">
                {t('rayhanah.welcomeBackToSalat', '🕊️ Welcome back to salat')}
              </h3>
              <p className="text-white/50 text-xs leading-relaxed">
                {t('rayhanah.performGhuslIntro', 'Perform ghusl the way the Prophet ﷺ did')} (
                <a
                  className="underline"
                  href="https://sunnah.com/bukhari:248"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Bukhārī 248', i18n.language)}
                </a>
                ):
              </p>
              <div className="space-y-1.5">
                {GHUSL_STEPS.map((step, i) => (
                  <button
                    key={step}
                    className="w-full flex items-start gap-3 rounded-xl px-3 py-2.5 bg-white/5 hover:bg-white/5 text-left"
                    onClick={() => setGhuslChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
                  >
                    <span
                      className={`w-5 h-5 rounded-full grid place-items-center border text-[10px] flex-shrink-0 mt-0.5 ${ghuslChecked[i] ? 'bg-brand-emerald border-brand-emerald text-white' : 'border-brand-emerald/20 text-white/30'}`}
                    >
                      {ghuslChecked[i] ? '✓' : i + 1}
                    </span>
                    <span
                      className={`text-xs leading-relaxed ${ghuslChecked[i] ? 'text-white/40 line-through' : 'text-white/75'}`}
                    >
                      {t(`rayhanah.ghuslStep${i}`, step)}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-brand-emerald/80 text-xs leading-relaxed">
                {t(
                  'rayhanah.prayCurrentTime',
                  "Then pray the ṣalāt of the time you're now in — no past prayers to make up"
                )}{' '}
                (
                <a
                  className="underline"
                  href="https://sunnah.com/muslim:335"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Muslim 335', i18n.language)}
                </a>
                ). {t('rayhanah.welcomeBackShort', 'Welcome back 🌸')}
              </p>
              <button
                className="w-full btn rounded-2xl border-0 text-white font-black bg-gradient-to-r from-brand-emerald to-brand-info"
                onClick={() => {
                  setGhuslOpen(false);
                  celebrateSmall();
                }}
              >
                {t('rayhanah.alhamdulillah', 'Alhamdulillah 🤲')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ramadan qada prompt ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {qadaPrompt && !ghuslOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-sm rounded-3xl bg-brand-deep border border-brand-gold/25 p-6 space-y-4"
            >
              <h3 className="text-white font-black text-lg">
                {t('rayhanah.ramadanDaysToMakeUp', '🌙 Ramadan days to make up')}
              </h3>
              <p className="text-white/60 text-sm leading-relaxed">
                {t(
                  'rayhanah.qadaPromptCount',
                  '{{count, number}} day(s) of this cycle fell in Ramadan.',
                  { count: qadaPrompt.days }
                )}{' '}
                {t('rayhanah.missedFastsMadeUp', 'Missed Ramadan fasts are made up after')} (
                <a
                  className="underline"
                  href="https://sunnah.com/muslim:335"
                  target="_blank"
                  rel="noreferrer"
                >
                  {translateReference('Muslim 335', i18n.language)}
                </a>
                ).{' '}
                {qadaPrompt.days > 1
                  ? t('rayhanah.addThemToQada', 'Add them to your qaḍā counter?')
                  : t('rayhanah.addItToQada', 'Add it to your qaḍā counter?')}
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 btn btn-sm rounded-xl bg-white/5 border-brand-emerald/10 text-white/60"
                  onClick={() => setQadaPrompt(null)}
                >
                  {t('rayhanah.notNow', 'Not now')}
                </button>
                <button
                  className="flex-1 btn btn-sm rounded-xl border-0 text-white font-bold bg-gradient-to-r from-brand-gold to-brand-warm"
                  disabled={updateFastingProfile.isPending}
                  onClick={addQada}
                >
                  {t('rayhanah.addToQada', 'Add to qaḍā ✓')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatedBackground>
  );
}
