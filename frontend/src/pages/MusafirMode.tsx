import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import AnimatedBackground from '../components/AnimatedBackground.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import Seo from '../components/Seo.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import { useUiStore } from '../store/useUiStore.js';
import { translateSalatName } from '../utils/prayerTimes.js';
import { translateReference } from '../utils/localeReference.js';
import { formatLocaleDate, formatLocaleNumber } from '../utils/localeDate.js';
import { celebrateSmall, celebrateGoal } from '../utils/celebrate.js';
import type { PrayerId } from '../hooks/useSalatLog.js';
import {
  useMusafir,
  startMusafir,
  updateMusafir,
  endMusafir,
  defaultSchool,
  journeyDay,
  schoolMeta,
  staysAsResident,
  jamAllowed,
  getMusafirHistory,
  getDuasSaid,
  suggestStartAfter,
  setDuasSaid,
  FARD_RAKAT,
  travelRakat,
  isQasrPrayer,
  SCHOOLS,
  MUSAFIR_RULINGS,
  MUSAFIR_DUAS,
  REF_SADAQAH,
  REF_REWARD_FLOWS,
  REF_DUA_ANSWERED,
  REF_HASTEN_HOME,
  REF_RETURN_MASJID,
  type MusafirSchool,
  type MusafirRef,
  type PastJourney,
} from '../utils/musafir.js';

const PRAYERS: { id: PrayerId; name: string; icon: string }[] = [
  { id: 'fajr', name: 'Fajr', icon: '🌅' },
  { id: 'dhuhr', name: 'Dhuhr', icon: '☀️' },
  { id: 'asr', name: 'Asr', icon: '🌤️' },
  { id: 'maghrib', name: 'Maghrib', icon: '🌆' },
  { id: 'isha', name: 'Isha', icon: '🌙' },
];

const STAY_PRESETS = [0, 2, 3, 5, 10, 20];

/** One cited quote — the same "text · source · grade ↗" contract used across the app. */
function RefQuote({
  r,
  lang,
  tone = 'gold',
}: {
  r: MusafirRef;
  lang: string;
  tone?: 'gold' | 'info';
}) {
  return (
    <div>
      <p className="text-white/70 text-xs sm:text-sm leading-relaxed">
        {/* Quran lines carry their own quotation marks. */}
        {r.text.startsWith('“') ? '' : '“'}
        {lang === 'bn' ? r.textBn : r.text}
        {r.text.startsWith('“') ? '' : '”'}
      </p>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className={`inline-block mt-1 text-[11px] underline underline-offset-2 ${
          tone === 'gold'
            ? 'text-brand-gold/50 hover:text-brand-gold'
            : 'text-brand-info/60 hover:text-brand-info'
        }`}
      >
        📖 {translateReference(r.source, lang)}
        {r.grade !== 'Quran' && ` · ${translateReference(r.grade, lang)}`} ↗
      </a>
    </div>
  );
}

/** The dashed road with a little vehicle moving along it. Purely decorative. */
function JourneyRoad({ reduce }: { reduce: boolean }) {
  return (
    <div className="relative h-8 mt-4" aria-hidden>
      <div className="absolute inset-x-6 top-1/2 border-t-2 border-dashed border-white/15" />
      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg">🏠</span>
      <span className="absolute right-0 top-1/2 -translate-y-1/2 text-lg">📍</span>
      <motion.span
        className="absolute top-1/2 -translate-y-1/2 text-xl"
        initial={{ left: '8%' }}
        animate={reduce ? { left: '50%' } : { left: ['8%', '82%'] }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 6, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }
        }
      >
        🚌
      </motion.span>
    </div>
  );
}

export default function MusafirMode() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const bn = lang === 'bn';
  const today = getTrackingDay();
  const musafir = useMusafir();
  const appReduceMotion = useUiStore((s) => s.reduceMotion);
  const reduceMotion =
    appReduceMotion ||
    (typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));

  // ── setup / edit form ──
  const [formOpen, setFormOpen] = useState(false);
  const [destination, setDestination] = useState('');
  const [plannedStay, setPlannedStay] = useState<number>(0);
  const [school, setSchool] = useState<MusafirSchool>(() => defaultSchool());
  // When the journey began: a date plus the last prayer prayed at home that day
  // (for a sudden trip logged later). Unset = left before Fajr.
  const [startDate, setStartDate] = useState(today);
  const [startAfter, setStartAfter] = useState<PrayerId | undefined>(undefined);
  const openForm = () => {
    setStartDate(musafir?.startedAt ?? today);
    setStartAfter(musafir ? musafir.startAfter : suggestStartAfter(today));
    setDestination(musafir?.destination ?? '');
    setPlannedStay(musafir?.plannedStay ?? 0);
    setSchool(musafir?.school ?? defaultSchool());
    setFormOpen(true);
  };
  const submitForm = () => {
    if (musafir) {
      updateMusafir({
        startedAt: startDate <= today ? startDate : today,
        startAfter,
        destination: destination.trim() || undefined,
        plannedStay,
        school,
      });
      toast.success(t('musafir.updated', 'Journey updated'), { icon: '🧭' });
    } else {
      startMusafir({ today, startedAt: startDate, startAfter, destination, plannedStay, school });
      celebrateSmall();
      toast.success(t('musafir.started', 'Safe travels! Musafir mode is on.'), {
        icon: '✈️',
        duration: 3500,
      });
    }
    setFormOpen(false);
  };

  // ── ending the journey ──
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [returned, setReturned] = useState<PastJourney | null>(null);
  const finishJourney = () => {
    setConfirmEnd(false);
    const trip = endMusafir(today);
    setReturned(trip);
    celebrateGoal();
  };

  // ── du'a checklist ──
  const [said, setSaid] = useState<string[]>(() => getDuasSaid(today));
  const [openDua, setOpenDua] = useState<string | null>('riding');
  const toggleSaid = (id: string) => {
    const next = said.includes(id) ? said.filter((x) => x !== id) : [...said, id];
    setSaid(next);
    setDuasSaid(today, next);
    if (!said.includes(id)) {
      if (next.length === MUSAFIR_DUAS.length) celebrateGoal();
      else celebrateSmall();
    }
  };

  const [openRuling, setOpenRuling] = useState<string | null>(null);
  // Small localStorage read; re-evaluated on every render so it follows start/end.
  const history = getMusafirHistory();

  const active = !!musafir;
  const day = musafir ? journeyDay(musafir, today) : 0;
  const meta = schoolMeta(musafir?.school ?? school);
  const resident = musafir ? staysAsResident(musafir) : false;
  const canJoin = jamAllowed(musafir?.school ?? school);
  const savedRakat = PRAYERS.reduce((n, p) => n + FARD_RAKAT[p.id] - travelRakat(p.id), 0);
  const saidCount = said.length;

  // A forgotten trip can be back-dated up to 60 days.
  const minStartDate = (() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 60);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const fmtDate = (d: string) =>
    formatLocaleDate(new Date(d + 'T12:00:00'), { day: 'numeric', month: 'short' });

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('musafir.seoTitle', 'Musafir Mode — Salah & Sunnah for Travellers')}
        description={t(
          'musafir.seoDescription',
          'Travelling? Shorten and join your prayers the Sunnah way: qasr, jam‘, fasting, wiping over socks and the travel du‘as, each with its authentic hadith reference.'
        )}
        path="/musafir"
      />
      <h1 className="sr-only">{t('musafir.title', 'Musafir mode')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16 space-y-5">
        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl p-5 sm:p-7 border relative overflow-hidden ${
            active
              ? 'border-brand-info/40 bg-gradient-to-br from-brand-info/20 via-brand-emerald/10 to-brand-gold/10'
              : 'border-brand-gold/25 bg-gradient-to-br from-brand-gold/15 via-brand-info/10 to-brand-emerald/10'
          }`}
        >
          <motion.span
            aria-hidden
            className="absolute -right-4 -top-6 text-[7rem] opacity-10 select-none"
            animate={reduceMotion ? {} : { y: [0, -8, 0], rotate: [0, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✈️
          </motion.span>
          <div className="relative">
            <p
              className={`text-xs font-bold uppercase tracking-widest ${
                active ? 'text-brand-info' : 'text-brand-gold/80'
              }`}
            >
              🧳 {t('musafir.kicker', 'Musafir mode')}
              {active && (
                <span className="ml-2 inline-flex items-center gap-1 normal-case tracking-normal font-semibold text-brand-info/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-info animate-pulse" />
                  {t('musafir.onBadge', 'on')}
                </span>
              )}
            </p>

            {active && musafir ? (
              <>
                <h2 className="text-3xl font-black text-white mt-1">
                  {t('musafir.dayOfSafar', 'Day {{day}} of your safar', {
                    day: formatLocaleNumber(day),
                  })}
                </h2>
                <p className="text-white/60 text-sm mt-1">
                  {musafir.destination
                    ? t('musafir.toDestination', 'On the way to {{place}}', {
                        place: musafir.destination,
                      })
                    : t('musafir.onTheRoad', 'On the road')}
                  <span className="text-white/30">
                    {' · '}
                    {musafir.startAfter
                      ? t('musafir.sinceAfter', 'since {{date}}, after {{prayer}}', {
                          date: fmtDate(musafir.startedAt),
                          prayer: translateSalatName(musafir.startAfter, musafir.startAfter, t),
                        })
                      : t('musafir.since', 'since {{date}}', {
                          date: fmtDate(musafir.startedAt),
                        })}{' '}
                    <button
                      onClick={openForm}
                      className="underline underline-offset-2 text-white/40 hover:text-white/70"
                    >
                      {t('musafir.changeStart', 'change')}
                    </button>
                  </span>
                </p>
                <JourneyRoad reduce={reduceMotion} />
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-white/15 bg-white/5 text-white/70">
                    📚 {bn ? meta.labelBn : meta.label}
                  </span>
                  {musafir.plannedStay ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border border-white/15 bg-white/5 text-white/70">
                      🏨{' '}
                      {t('musafir.stayChip', 'staying {{count}} days', {
                        count: musafir.plannedStay,
                      })}
                    </span>
                  ) : null}
                </div>

                {/* Status: still a traveller, or a resident once you arrive */}
                <div
                  className={`mt-4 rounded-2xl border p-3 text-xs sm:text-sm leading-relaxed ${
                    resident
                      ? 'border-brand-gold/40 bg-brand-gold/10 text-brand-gold'
                      : 'border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald'
                  }`}
                >
                  {resident
                    ? t(
                        'musafir.residentWarning',
                        'You plan to stay {{stay}} days. In the {{school}} view an intended stay of {{limit}}+ days makes you a resident: shorten on the road, then pray in full once you arrive.',
                        {
                          stay: musafir.plannedStay,
                          school: bn ? meta.labelBn : meta.label,
                          limit: meta.residentAfterDays,
                        }
                      )
                    : t(
                        'musafir.qasrApplies',
                        '✂️ Qaṣr applies: pray Ẓuhr, ʿAṣr and ʿIshāʾ as 2 rak’ahs. Your salat tracker already knows.'
                      )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  <Link
                    to="/salat"
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-brand-emerald text-white shadow-[0_0_14px_rgba(122,158,110,0.35)] hover:brightness-110"
                  >
                    🕌 {t('musafir.logPrayers', 'Log today’s prayers')}
                  </Link>
                  <button
                    onClick={openForm}
                    className="px-4 py-2 rounded-xl text-sm font-bold border border-white/15 bg-white/5 text-white/70 hover:text-white"
                  >
                    ✏️ {t('musafir.edit', 'Edit journey')}
                  </button>
                  <button
                    onClick={() => setConfirmEnd(true)}
                    className="px-4 py-2 rounded-xl text-sm font-bold border border-brand-gold/40 bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20"
                  >
                    🏡 {t('musafir.imHome', 'I’m home')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-1 leading-tight">
                  {t('musafir.heroTitle', 'Travelling? Allah has made it easy for you.')}
                </h2>
                <div className="mt-3 rounded-2xl border border-brand-gold/20 bg-black/20 p-3">
                  <RefQuote r={REF_SADAQAH} lang={lang} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {[
                    ['✂️', t('musafir.giftQasr', '4 rak’ahs become 2')],
                    ['🔗', t('musafir.giftJam', 'Join prayers on the move')],
                    ['🍽️', t('musafir.giftFast', 'Fasting may wait')],
                    ['🤲', t('musafir.giftDua', 'Your du‘ā is answered')],
                  ].map(([emoji, label]) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                    >
                      <span className="text-lg">{emoji}</span>
                      <span className="text-white/75 text-xs font-semibold leading-tight">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
                {!formOpen && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={openForm}
                    className="mt-5 w-full py-3 rounded-2xl text-base font-black bg-gradient-to-r from-brand-info to-brand-emerald text-white shadow-[0_0_20px_rgba(90,158,142,0.35)] hover:brightness-110"
                  >
                    ✈️ {t('musafir.start', 'Start my journey')}
                  </motion.button>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* ── Welcome home ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {returned && !active && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-brand-emerald/40 bg-brand-emerald/10 p-5"
            >
              <h3 className="text-brand-emerald font-black text-lg">
                🏡 {t('musafir.welcomeHome', 'Welcome home! Alhamdulillah.')}
              </h3>
              <p className="text-white/60 text-sm mt-1">
                {t(
                  'musafir.tripSummary',
                  '{{days}}-day journey, {{from}} → {{to}}. Musafir mode is off.',
                  {
                    days: formatLocaleNumber(returned.days),
                    from: fmtDate(returned.from),
                    to: fmtDate(returned.to),
                  }
                )}
              </p>
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl bg-black/20 p-3">
                  <p className="text-white/40 text-[11px] font-bold uppercase tracking-wider mb-1">
                    {t('musafir.returnSunnah', 'The returning sunnah')}
                  </p>
                  <RefQuote r={REF_RETURN_MASJID} lang={lang} />
                </div>
                <button
                  onClick={() => setReturned(null)}
                  className="text-white/40 text-xs underline hover:text-white/70"
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Setup / edit form ─────────────────────────────────────────── */}
        <AnimatePresence>
          {formOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-3xl border border-brand-info/30 bg-white/[0.04] p-5 space-y-5">
                <h3 className="text-white font-black">
                  {active
                    ? t('musafir.editTitle', 'Your journey')
                    : t('musafir.setupTitle', 'Where are you heading?')}
                </h3>

                <div>
                  <label className="block">
                    <span className="text-white/50 text-xs font-bold">
                      🗓️ {t('musafir.startDateLabel', 'When did you set out?')}
                    </span>
                    <input
                      type="date"
                      value={startDate}
                      max={today}
                      min={minStartDate}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v && v <= today && v >= minStartDate) setStartDate(v);
                      }}
                      className="mt-1.5 w-full rounded-xl bg-brand-deep border border-brand-border px-3 py-2.5 text-white text-sm focus:outline-none focus:border-brand-info/60 [color-scheme:dark]"
                    />
                  </label>
                  <p className="text-white/50 text-xs font-bold mt-3">
                    🕌 {t('musafir.startAfterLabel', 'Last prayer you prayed at home that day')}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {([undefined, 'fajr', 'dhuhr', 'asr', 'maghrib'] as const).map((p) => (
                      <button
                        key={p ?? 'none'}
                        onClick={() => setStartAfter(p)}
                        aria-pressed={startAfter === p}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          startAfter === p
                            ? 'bg-brand-info/25 border-brand-info/70 text-brand-info'
                            : 'bg-brand-deep border-brand-border text-white/50 hover:text-white/80'
                        }`}
                      >
                        {p
                          ? translateSalatName(p, p, t)
                          : t('musafir.startAfterNone', 'None, left before Fajr')}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/35 text-[11px] mt-1.5 leading-relaxed">
                    {startAfter
                      ? t(
                          'musafir.startAfterHint',
                          'Shortening starts with the prayer after {{prayer}} on that day. Left after ʿIshāʾ? Pick the next day and “None”.',
                          { prayer: translateSalatName(startAfter, startAfter, t) }
                        )
                      : t(
                          'musafir.startAfterHintNone',
                          'Every prayer of that day counts as a travel prayer. Left after ʿIshāʾ? Pick the next day.'
                        )}
                  </p>
                </div>

                <label className="block">
                  <span className="text-white/50 text-xs font-bold">
                    📍 {t('musafir.destinationLabel', 'Destination (optional)')}
                  </span>
                  <input
                    value={destination}
                    maxLength={60}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={t(
                      'musafir.destinationPlaceholder',
                      'e.g. Makkah, Sylhet, grandma’s village'
                    )}
                    className="mt-1.5 w-full rounded-xl bg-brand-deep border border-brand-border px-3 py-2.5 text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-brand-info/60"
                  />
                </label>

                <div>
                  <span className="text-white/50 text-xs font-bold">
                    🏨 {t('musafir.stayLabel', 'How many days will you stay there?')}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {STAY_PRESETS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setPlannedStay(d)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          plannedStay === d
                            ? 'bg-brand-info/25 border-brand-info/70 text-brand-info'
                            : 'bg-brand-deep border-brand-border text-white/50 hover:text-white/80'
                        }`}
                      >
                        {d === 0
                          ? t('musafir.stayUnsure', 'Not sure / moving on')
                          : t('musafir.stayDays', '{{count}} days', { count: d })}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/35 text-[11px] mt-1.5 leading-relaxed">
                    {t(
                      'musafir.stayHint',
                      'Used only to tell you whether you become a resident on arrival (4+ days majority, 15+ Ḥanafī).'
                    )}
                  </p>
                </div>

                <div>
                  <span className="text-white/50 text-xs font-bold">
                    📚 {t('musafir.schoolLabel', 'Which view do you follow?')}
                  </span>
                  <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
                    {SCHOOLS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSchool(s.id)}
                        className={`text-left rounded-2xl border p-3 transition-all ${
                          school === s.id
                            ? 'bg-brand-emerald/15 border-brand-emerald/60'
                            : 'bg-brand-deep border-brand-border hover:border-white/25'
                        }`}
                      >
                        <p
                          className={`text-sm font-bold ${school === s.id ? 'text-brand-emerald' : 'text-white/80'}`}
                        >
                          {bn ? s.labelBn : s.label}
                        </p>
                        <p className="text-white/40 text-[11px] mt-0.5">{bn ? s.whoBn : s.who}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={submitForm}
                    className="flex-1 py-3 rounded-2xl font-black bg-gradient-to-r from-brand-info to-brand-emerald text-white hover:brightness-110"
                  >
                    {active
                      ? t('musafir.save', 'Save')
                      : `✈️ ${t('musafir.bismillah', 'Bismillah, let’s go')}`}
                  </motion.button>
                  <button
                    onClick={() => setFormOpen(false)}
                    className="px-4 rounded-2xl border border-brand-border text-white/50 hover:text-white text-sm font-bold"
                  >
                    {t('musafir.cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Today's prayers as a traveller ──────────────────────────────── */}
        <section className="rounded-3xl border border-brand-emerald/15 bg-white/[0.04] p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-white font-black">
              🕌 {t('musafir.prayersTitle', 'Your prayers on the road')}
            </h3>
            <span className="text-brand-emerald/70 text-[11px] font-bold">
              {t('musafir.savedRakat', '{{count}} rak’ahs lighter a day', {
                count: savedRakat,
              })}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-3">
            {PRAYERS.map((p, i) => {
              const shortened = isQasrPrayer(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className={`rounded-2xl border text-center py-3 px-1 ${
                    shortened
                      ? 'border-brand-info/40 bg-brand-info/10'
                      : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="text-xl">{p.icon}</div>
                  <p className="text-white/70 text-[11px] font-bold mt-1 truncate">
                    {translateSalatName(p.id, p.name, t)}
                  </p>
                  <p className="mt-1 leading-none">
                    {shortened && (
                      <span className="text-white/25 text-xs line-through mr-1">
                        {formatLocaleNumber(FARD_RAKAT[p.id])}
                      </span>
                    )}
                    <span
                      className={`text-2xl font-black ${shortened ? 'text-brand-info' : 'text-white/80'}`}
                    >
                      {formatLocaleNumber(travelRakat(p.id))}
                    </span>
                  </p>
                  <p className="text-white/30 text-[9px] mt-1 uppercase tracking-wide">
                    {shortened ? t('musafir.qasrTag', 'qaṣr') : t('musafir.unchanged', 'same')}
                  </p>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            {canJoin ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-white/50 font-bold">
                  🔗 {t('musafir.canJoin', 'May be joined:')}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-brand-gold/15 text-brand-gold font-bold">
                  {translateSalatName('dhuhr', 'Dhuhr', t)} + {translateSalatName('asr', 'Asr', t)}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-brand-gold/15 text-brand-gold font-bold">
                  {translateSalatName('maghrib', 'Maghrib', t)} +{' '}
                  {translateSalatName('isha', 'Isha', t)}
                </span>
              </div>
            ) : (
              <p className="text-white/55 text-xs leading-relaxed">
                🔗 {bn ? meta.jamBn : meta.jam}
              </p>
            )}
          </div>
        </section>

        {/* ── Motivation: the traveller's two gifts ───────────────────────── */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-3xl border border-brand-gold/25 bg-brand-gold/[0.06] p-4">
            <h3 className="text-brand-gold font-black text-sm">
              ✨ {t('musafir.rewardTitle', 'Your good deeds keep flowing')}
            </h3>
            <p className="text-white/45 text-[11px] mt-0.5 mb-2">
              {t(
                'musafir.rewardSub',
                'Can’t keep your usual adhkar or nafl on the road? The reward is still written.'
              )}
            </p>
            <RefQuote r={REF_REWARD_FLOWS} lang={lang} />
          </div>
          <div className="rounded-3xl border border-brand-info/30 bg-brand-info/[0.07] p-4">
            <h3 className="text-brand-info font-black text-sm">
              🤲 {t('musafir.duaTitle', 'Your du‘ā is answered')}
            </h3>
            <p className="text-white/45 text-[11px] mt-0.5 mb-2">
              {t(
                'musafir.duaSub',
                'Use the journey: ask for your parents, your family, the ummah and your own heart.'
              )}
            </p>
            <RefQuote r={REF_DUA_ANSWERED} lang={lang} tone="info" />
          </div>
        </div>

        {/* ── Journey du'as checklist ─────────────────────────────────────── */}
        <section className="rounded-3xl border border-brand-emerald/15 bg-white/[0.04] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white font-black">
              📿 {t('musafir.duasTitle', 'Du‘ās of the journey')}
            </h3>
            <span className="text-brand-emerald text-xs font-black tabular-nums">
              {formatLocaleNumber(saidCount)}/{formatLocaleNumber(MUSAFIR_DUAS.length)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 mt-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-emerald to-brand-gold"
              animate={{ width: `${(saidCount / MUSAFIR_DUAS.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
          <p className="text-white/35 text-[11px] mt-1.5">
            {saidCount === MUSAFIR_DUAS.length
              ? t('musafir.duasAllDone', 'MashaAllah, every travel sunnah du‘ā today!')
              : t('musafir.duasHint', 'Tap the circle once you’ve said it. Resets each day.')}
          </p>
          <ul className="mt-3 space-y-2">
            {MUSAFIR_DUAS.map((d) => {
              const done = said.includes(d.id);
              const open = openDua === d.id;
              return (
                <li
                  key={d.id}
                  className={`rounded-2xl border transition-colors ${
                    done
                      ? 'border-brand-emerald/40 bg-brand-emerald/[0.08]'
                      : 'border-white/10 bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => toggleSaid(d.id)}
                      aria-pressed={done}
                      aria-label={t('musafir.markSaid', 'Mark as said')}
                      className={`shrink-0 w-8 h-8 rounded-full border-2 grid place-items-center text-sm font-black transition-all ${
                        done
                          ? 'bg-brand-emerald border-brand-emerald text-white'
                          : 'border-white/25 text-transparent hover:border-brand-emerald/60'
                      }`}
                    >
                      ✓
                    </motion.button>
                    <button
                      onClick={() => setOpenDua(open ? null : d.id)}
                      className="flex-1 min-w-0 text-left flex items-center gap-2"
                    >
                      <span className="text-lg shrink-0">{d.emoji}</span>
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-bold leading-tight ${done ? 'text-brand-emerald' : 'text-white/85'}`}
                        >
                          {bn ? d.whenBn : d.when}
                        </span>
                        {d.returning && (
                          <span className="text-brand-gold/60 text-[10px] font-bold uppercase tracking-wide">
                            {t('musafir.onReturn', 'on return')}
                          </span>
                        )}
                      </span>
                      <span className="ml-auto text-white/30 text-xs">{open ? '▲' : '▼'}</span>
                    </button>
                  </div>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-2">
                          <p
                            dir="rtl"
                            lang="ar"
                            className="text-white text-xl leading-loose font-arabic text-right"
                          >
                            {d.arabic}
                          </p>
                          <p className="text-brand-gold/70 text-xs italic leading-relaxed">
                            {d.translit}
                          </p>
                          <p className="text-white/60 text-xs leading-relaxed">
                            {bn ? d.meaningBn : d.meaning}
                          </p>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-[11px] text-brand-gold/50 hover:text-brand-gold underline underline-offset-2"
                          >
                            📖 {translateReference(d.source, lang)} ·{' '}
                            {translateReference(d.grade, lang)} ↗
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── The concessions, with evidence ──────────────────────────────── */}
        <section>
          <h3 className="text-white font-black px-1">
            🎁 {t('musafir.rulingsTitle', 'The traveller’s concessions')}
          </h3>
          <p className="text-white/40 text-xs px-1 mt-0.5 mb-3">
            {t('musafir.rulingsSub', 'Tap any card for the details and the hadith behind it.')}
          </p>
          <div className="space-y-2">
            {MUSAFIR_RULINGS.map((r) => {
              const open = openRuling === r.id;
              return (
                <motion.div
                  key={r.id}
                  layout
                  className={`rounded-2xl border overflow-hidden transition-colors ${
                    open
                      ? 'border-brand-gold/40 bg-brand-gold/[0.06]'
                      : 'border-white/10 bg-white/[0.04]'
                  }`}
                >
                  <button
                    onClick={() => setOpenRuling(open ? null : r.id)}
                    aria-expanded={open}
                    className="w-full text-left p-3.5 flex items-start gap-3"
                  >
                    <span className="text-2xl shrink-0 leading-none mt-0.5">{r.emoji}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-white font-bold text-sm leading-snug">
                        {bn ? r.titleBn : r.title}
                      </span>
                      <span className="block text-white/50 text-xs mt-0.5 leading-relaxed">
                        {bn ? r.summaryBn : r.summary}
                      </span>
                    </span>
                    <span className="text-white/30 text-xs mt-1">{open ? '▲' : '▼'}</span>
                  </button>
                  <AnimatePresence>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-3">
                          <ul className="space-y-1.5">
                            {r.points.map((pt, i) => (
                              <li
                                key={i}
                                className="text-white/70 text-xs sm:text-sm leading-relaxed flex gap-2"
                              >
                                <span className="text-brand-gold shrink-0">•</span>
                                <span>{bn ? pt.bn : pt.en}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="space-y-2.5 border-t border-white/10 pt-3">
                            {r.refs.map((ref) => (
                              <RefQuote
                                key={ref.source + ref.text.slice(0, 12)}
                                r={ref}
                                lang={lang}
                              />
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Madhab comparison ───────────────────────────────────────────── */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <h3 className="text-white font-black">
            📚 {t('musafir.schoolsTitle', 'Where the madhabs differ')}
          </h3>
          <p className="text-white/40 text-xs mt-0.5">
            {t(
              'musafir.schoolsSub',
              'Both are valid scholarly positions. Your choice is highlighted.'
            )}
          </p>
          <div className="mt-3 space-y-3">
            {(
              [
                ['🛣️', t('musafir.rowDistance', 'Minimum distance'), 'distance'],
                ['🏨', t('musafir.rowStay', 'Staying at one place'), 'stay'],
                ['🔗', t('musafir.rowJam', 'Joining prayers'), 'jam'],
              ] as const
            ).map(([emoji, label, key]) => (
              <div key={key}>
                <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                  {emoji} {label}
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {SCHOOLS.map((s) => {
                    const mine = s.id === (musafir?.school ?? school);
                    const text = bn
                      ? key === 'distance'
                        ? s.distanceBn
                        : key === 'stay'
                          ? s.stayBn
                          : s.jamBn
                      : s[key];
                    return (
                      <div
                        key={s.id}
                        className={`rounded-xl border p-2.5 ${
                          mine
                            ? 'border-brand-emerald/50 bg-brand-emerald/10'
                            : 'border-white/10 bg-black/20'
                        }`}
                      >
                        <p
                          className={`text-[10px] font-black uppercase ${mine ? 'text-brand-emerald' : 'text-white/35'}`}
                        >
                          {bn ? s.labelBn : s.label}
                        </p>
                        <p className="text-white/70 text-xs mt-0.5 leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Coming home ─────────────────────────────────────────────────── */}
        <section className="rounded-3xl border border-brand-emerald/20 bg-brand-emerald/[0.05] p-4 sm:p-5 space-y-3">
          <h3 className="text-brand-emerald font-black">
            🏡 {t('musafir.homeTitle', 'When the work is done, go home')}
          </h3>
          <RefQuote r={REF_HASTEN_HOME} lang={lang} />
          <RefQuote r={REF_RETURN_MASJID} lang={lang} />
        </section>

        {/* ── Past journeys ──────────────────────────────────────────────── */}
        {history.length > 0 && (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <h3 className="text-white font-black">
              🗺️ {t('musafir.pastTitle', 'Your past journeys')}
            </h3>
            <ul className="mt-2 divide-y divide-white/5">
              {history.map((j) => (
                <li
                  key={j.from + j.to}
                  className="py-2 flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-white/75 truncate">
                    📍 {j.destination || t('musafir.aJourney', 'A journey')}
                  </span>
                  <span className="text-white/35 text-xs shrink-0 tabular-nums">
                    {fmtDate(j.from)} → {fmtDate(j.to)} ·{' '}
                    {t('musafir.daysShort', '{{count}}d', { count: j.days })}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-white/30 text-[11px] leading-relaxed px-1">
          {t(
            'musafir.disclaimer',
            'Every reference links to its source. Details (exact distance, socks, special cases like a job that keeps you travelling) differ between scholars: when in doubt, ask a scholar you trust. Your journey is saved to your account settings and stays private.'
          )}
        </p>
      </div>

      <ConfirmDialog
        open={confirmEnd}
        title={t('musafir.endTitle', 'Back home?')}
        message={t(
          'musafir.endMessage',
          'Musafir mode turns off and your prayers return to their full rak’ahs. Your prayers already logged on the journey keep their qaṣr marks.'
        )}
        confirmLabel={t('musafir.endConfirm', 'Yes, I’m home')}
        onConfirm={finishJourney}
        onCancel={() => setConfirmEnd(false)}
      />
    </AnimatedBackground>
  );
}
