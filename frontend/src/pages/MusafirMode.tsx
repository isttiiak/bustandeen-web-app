import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CheckIcon,
  ChevronDownIcon,
  GiftIcon,
  HomeIcon,
  LinkIcon,
  MapIcon,
  MapPinIcon,
  PencilSquareIcon,
  ScissorsIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import ConfirmDialog from '../components/ConfirmDialog.js';
import Seo from '../components/Seo.js';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, SECTION_TITLE } from '../components/bustanStyles.js';
import {
  CrescentIcon,
  DuaHandsIcon,
  MosqueIcon,
  PrayerGlyph,
} from '../components/icons/IslamicIcons.js';
import { DuaIcon, RulingIcon } from '../components/musafir/musafirIcons.js';
import { getTrackingDay } from '../utils/trackingDay.js';
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
  deleteMusafirJourney,
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

const PRAYERS: { id: PrayerId; name: string }[] = [
  { id: 'fajr', name: 'Fajr' },
  { id: 'dhuhr', name: 'Dhuhr' },
  { id: 'asr', name: 'Asr' },
  { id: 'maghrib', name: 'Maghrib' },
  { id: 'isha', name: 'Isha' },
];

const STAY_PRESETS = [0, 2, 3, 5, 10, 20];

/** Inputs: the theme's surface; the date picker follows the theme's color-scheme. */
const FIELD =
  'mt-1.5 w-full rounded-control border border-brand-border bg-brand-surface/50 px-3 py-2.5 text-white text-sm placeholder:text-white/50 focus:border-brand-emerald focus:outline-none transition-colors';
const LABEL = 'text-white/80 text-xs font-bold flex items-center gap-1.5';
/** A choice chip in the form. */
const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-control text-xs font-bold border transition-colors ${
    on
      ? 'bg-brand-emerald/15 border-brand-emerald text-brand-emerald'
      : 'bg-brand-surface/50 border-brand-border text-white/70 hover:text-white'
  }`;
/** A small label pill inside the hero. */
const PILL =
  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border border-brand-border bg-brand-surface/60 text-white/80';

/** One cited quote: the same "text · source · grade" contract used across the app. */
function RefQuote({ r, lang }: { r: MusafirRef; lang: string }) {
  return (
    <div>
      <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
        {/* Quran lines carry their own quotation marks. */}
        {r.text.startsWith('“') ? '' : '“'}
        {lang === 'bn' ? r.textBn : r.text}
        {r.text.startsWith('“') ? '' : '”'}
      </p>
      <a
        href={r.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 mt-1 text-[11px] text-brand-gold underline underline-offset-2"
      >
        <BookOpenIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
        {translateReference(r.source, lang)}
        {r.grade !== 'Quran' && ` · ${translateReference(r.grade, lang)}`}
        <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" aria-hidden />
      </a>
    </div>
  );
}

/** Home to destination as a dashed road. Purely decorative, and still. */
function JourneyRoad() {
  return (
    <div className="flex items-center gap-2 mt-4 max-w-xs mx-auto" aria-hidden>
      <HomeIcon className="w-5 h-5 text-white/70 shrink-0" />
      <span className="flex-1 border-t-2 border-dashed border-brand-border" />
      <BriefcaseIcon className="w-5 h-5 text-brand-gold shrink-0" />
      <span className="flex-1 border-t-2 border-dashed border-brand-border" />
      <MapPinIcon className="w-5 h-5 text-white/70 shrink-0" />
    </div>
  );
}

export default function MusafirMode() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const bn = lang === 'bn';
  const today = getTrackingDay();
  const musafir = useMusafir();

  // setup / edit form
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
      toast.success(t('musafir.updated', 'Journey updated'));
    } else {
      startMusafir({ today, startedAt: startDate, startAfter, destination, plannedStay, school });
      celebrateSmall();
      toast.success(t('musafir.started', 'Safe travels! Musafir mode is on.'), {
        duration: 3500,
      });
    }
    setFormOpen(false);
  };

  // ending the journey
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [returned, setReturned] = useState<PastJourney | null>(null);
  const finishJourney = () => {
    setConfirmEnd(false);
    const trip = endMusafir(today);
    setReturned(trip);
    celebrateGoal();
  };

  // du'a checklist
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
        title={t('musafir.seoTitle', 'Musafir Mode: Salah & Sunnah for Travellers')}
        description={t(
          'musafir.seoDescription',
          'Travelling? Shorten and join your prayers the Sunnah way: qasr, jam‘, fasting, wiping over socks and the travel du‘as, each with its authentic hadith reference.'
        )}
        path="/musafir"
      />
      <h1 className="sr-only">{t('musafir.title', 'Musafir mode')}</h1>
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-16 space-y-4">
        {/* Arch hero: the journey (or the invitation to start one) and its actions */}
        <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 sm:px-7 pt-10 pb-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
            <BriefcaseIcon className="w-8 h-8 text-brand-gold" aria-hidden />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-brand-gold inline-flex items-center gap-2">
            {t('musafir.kicker', 'Musafir mode')}
            {active && (
              <span className="inline-flex items-center gap-1 normal-case tracking-normal font-semibold text-brand-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-emerald" />
                {t('musafir.onBadge', 'on')}
              </span>
            )}
          </p>

          {active && musafir ? (
            <>
              <h2 className="font-display text-3xl font-bold text-white mt-1">
                {t('musafir.dayOfSafar', 'Day {{day}} of your safar', {
                  day: formatLocaleNumber(day),
                })}
              </h2>
              <p className="text-white/75 text-sm mt-1">
                {musafir.destination
                  ? t('musafir.toDestination', 'On the way to {{place}}', {
                      place: musafir.destination,
                    })
                  : t('musafir.onTheRoad', 'On the road')}
                <span className="text-white/60">
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
                    className="underline underline-offset-2 text-white/70 hover:text-white"
                  >
                    {t('musafir.changeStart', 'change')}
                  </button>
                </span>
              </p>
              <JourneyRoad />
              <div className="flex flex-wrap justify-center items-center gap-2 mt-3">
                <span className={PILL}>
                  <BookOpenIcon className="w-3.5 h-3.5" aria-hidden />
                  {bn ? meta.labelBn : meta.label}
                </span>
                {musafir.plannedStay ? (
                  <span className={PILL}>
                    <BuildingOfficeIcon className="w-3.5 h-3.5" aria-hidden />
                    {t('musafir.stayChip', 'staying {{count}} days', {
                      count: musafir.plannedStay,
                    })}
                  </span>
                ) : null}
              </div>

              {/* Status: still a traveller, or a resident once you arrive */}
              <div
                className={`mt-4 rounded-control border p-3 text-xs sm:text-sm leading-relaxed text-left flex gap-2 ${
                  resident
                    ? 'border-brand-gold/40 bg-brand-gold/10 text-white/85'
                    : 'border-brand-emerald/40 bg-brand-emerald/10 text-white/85'
                }`}
              >
                {resident ? (
                  <BuildingOfficeIcon
                    className="w-4 h-4 mt-0.5 shrink-0 text-brand-gold"
                    aria-hidden
                  />
                ) : (
                  <ScissorsIcon
                    className="w-4 h-4 mt-0.5 shrink-0 text-brand-emerald"
                    aria-hidden
                  />
                )}
                <span>
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
                        'Qaṣr applies: pray Ẓuhr, ʿAṣr and ʿIshāʾ as 2 rak’ahs. Your salat tracker already knows.'
                      )}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Link to="/salat" className={BTN_PRIMARY}>
                  <MosqueIcon className="w-4 h-4" aria-hidden />
                  {t('musafir.logPrayers', 'Log today’s prayers')}
                </Link>
                <button onClick={openForm} className={BTN_SECONDARY}>
                  <PencilSquareIcon className="w-4 h-4" aria-hidden />
                  {t('musafir.edit', 'Edit journey')}
                </button>
                <button
                  onClick={() => setConfirmEnd(true)}
                  className={`${BTN_SECONDARY} !text-brand-gold !border-brand-gold/40`}
                >
                  <HomeIcon className="w-4 h-4" aria-hidden />
                  {t('musafir.imHome', 'I’m home')}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1 leading-tight">
                {t('musafir.heroTitle', 'Travelling? Allah has made it easy for you.')}
              </h2>
              <div className="mt-3 rounded-control border border-brand-border bg-shade/20 p-3 text-left">
                <RefQuote r={REF_SADAQAH} lang={lang} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 text-left">
                {(
                  [
                    [ScissorsIcon, t('musafir.giftQasr', '4 rak’ahs become 2')],
                    [LinkIcon, t('musafir.giftJam', 'Join prayers on the move')],
                    [CrescentIcon, t('musafir.giftFast', 'Fasting may wait')],
                    [DuaHandsIcon, t('musafir.giftDua', 'Your du‘ā is answered')],
                  ] as const
                ).map(([Icon, label]) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-control border border-brand-border bg-brand-surface/60 px-3 py-2"
                  >
                    <Icon className="w-5 h-5 shrink-0 text-brand-gold" aria-hidden />
                    <span className="text-white/85 text-xs font-semibold leading-tight">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              {!formOpen && (
                <button
                  onClick={openForm}
                  className={`${BTN_PRIMARY} mt-5 w-full !py-3 !text-base`}
                >
                  <BriefcaseIcon className="w-5 h-5" aria-hidden />
                  {t('musafir.start', 'Start my journey')}
                </button>
              )}
            </>
          )}
        </section>

        {/* Welcome home */}
        <AnimatePresence>
          {returned && !active && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`${CARD} p-5`}
            >
              <h3 className={SECTION_TITLE}>
                <HomeIcon className="w-5 h-5 text-brand-emerald" aria-hidden />
                {t('musafir.welcomeHome', 'Welcome home! Alhamdulillah.')}
              </h3>
              <p className="text-white/75 text-sm mt-1">
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
                <div className="rounded-control bg-shade/20 p-3">
                  <p className="text-white/70 text-[11px] font-bold uppercase tracking-wider mb-1">
                    {t('musafir.returnSunnah', 'The returning sunnah')}
                  </p>
                  <RefQuote r={REF_RETURN_MASJID} lang={lang} />
                </div>
                <button
                  onClick={() => setReturned(null)}
                  className="text-white/70 text-xs underline hover:text-white"
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Setup / edit form */}
        <AnimatePresence>
          {formOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className={`${CARD} p-5 space-y-5`}>
                <h3 className={SECTION_TITLE}>
                  <MapIcon className="w-5 h-5 text-brand-gold" aria-hidden />
                  {active
                    ? t('musafir.editTitle', 'Your journey')
                    : t('musafir.setupTitle', 'Where are you heading?')}
                </h3>

                <div>
                  <label className="block">
                    <span className={LABEL}>
                      <CalendarDaysIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                      {t('musafir.startDateLabel', 'When did you set out?')}
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
                      className={FIELD}
                    />
                  </label>
                  <p className={`${LABEL} mt-3`}>
                    <MosqueIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                    {t('musafir.startAfterLabel', 'Last prayer you prayed at home that day')}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {([undefined, 'fajr', 'dhuhr', 'asr', 'maghrib'] as const).map((p) => (
                      <button
                        key={p ?? 'none'}
                        onClick={() => setStartAfter(p)}
                        aria-pressed={startAfter === p}
                        className={chip(startAfter === p)}
                      >
                        {p
                          ? translateSalatName(p, p, t)
                          : t('musafir.startAfterNone', 'None, left before Fajr')}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/65 text-[11px] mt-1.5 leading-relaxed">
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
                  <span className={LABEL}>
                    <MapPinIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                    {t('musafir.destinationLabel', 'Destination (optional)')}
                  </span>
                  <input
                    value={destination}
                    maxLength={60}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={t(
                      'musafir.destinationPlaceholder',
                      'e.g. Makkah, Sylhet, grandma’s village'
                    )}
                    className={FIELD}
                  />
                </label>

                <div>
                  <span className={LABEL}>
                    <BuildingOfficeIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                    {t('musafir.stayLabel', 'How many days will you stay there?')}
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {STAY_PRESETS.map((d) => (
                      <button
                        key={d}
                        onClick={() => setPlannedStay(d)}
                        aria-pressed={plannedStay === d}
                        className={chip(plannedStay === d)}
                      >
                        {d === 0
                          ? t('musafir.stayUnsure', 'Not sure / moving on')
                          : t('musafir.stayDays', '{{count}} days', { count: d })}
                      </button>
                    ))}
                  </div>
                  <p className="text-white/65 text-[11px] mt-1.5 leading-relaxed">
                    {t(
                      'musafir.stayHint',
                      'Used only to tell you whether you become a resident on arrival (4+ days majority, 15+ Ḥanafī).'
                    )}
                  </p>
                </div>

                <div>
                  <span className={LABEL}>
                    <BookOpenIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                    {t('musafir.schoolLabel', 'Which view do you follow?')}
                  </span>
                  <div className="grid sm:grid-cols-2 gap-2 mt-1.5">
                    {SCHOOLS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSchool(s.id)}
                        aria-pressed={school === s.id}
                        className={`text-left rounded-control border p-3 transition-colors ${
                          school === s.id
                            ? 'bg-brand-emerald/15 border-brand-emerald'
                            : 'bg-brand-surface/50 border-brand-border hover:border-brand-gold/40'
                        }`}
                      >
                        <p
                          className={`text-sm font-bold ${school === s.id ? 'text-brand-emerald' : 'text-white/85'}`}
                        >
                          {bn ? s.labelBn : s.label}
                        </p>
                        <p className="text-white/65 text-[11px] mt-0.5">{bn ? s.whoBn : s.who}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={submitForm} className={`${BTN_PRIMARY} flex-1 !py-3`}>
                    {!active && <BriefcaseIcon className="w-4 h-4" aria-hidden />}
                    {active
                      ? t('musafir.save', 'Save')
                      : t('musafir.bismillah', 'Bismillah, let’s go')}
                  </button>
                  <button onClick={() => setFormOpen(false)} className={BTN_SECONDARY}>
                    {t('musafir.cancel', 'Cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Today's prayers as a traveller */}
        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h3 className={SECTION_TITLE}>
              <MosqueIcon className="w-5 h-5 text-brand-gold" aria-hidden />
              {t('musafir.prayersTitle', 'Your prayers on the road')}
            </h3>
            <span className="text-brand-emerald text-[11px] font-bold">
              {t('musafir.savedRakat', '{{count}} rak’ahs lighter a day', {
                count: savedRakat,
              })}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-3">
            {PRAYERS.map((p) => {
              const shortened = isQasrPrayer(p.id);
              return (
                <div
                  key={p.id}
                  className={`min-w-0 rounded-control border text-center py-2.5 sm:py-3 px-0.5 sm:px-1 ${
                    shortened
                      ? 'border-brand-emerald/50 bg-brand-emerald/10'
                      : 'border-brand-border bg-brand-surface/50'
                  }`}
                >
                  <PrayerGlyph
                    id={p.id}
                    className={`w-5 h-5 sm:w-6 sm:h-6 mx-auto ${shortened ? 'text-brand-emerald' : 'text-white/70'}`}
                    aria-hidden
                  />
                  <p className="text-white/80 text-[9px] min-[360px]:text-[10px] sm:text-[11px] font-bold mt-1 leading-tight tracking-tight sm:tracking-normal whitespace-nowrap">
                    {translateSalatName(p.id, p.name, t)}
                  </p>
                  <p className="mt-1 leading-none">
                    {shortened && (
                      <span className="text-white/50 text-[10px] sm:text-xs line-through mr-0.5 sm:mr-1">
                        {formatLocaleNumber(FARD_RAKAT[p.id])}
                      </span>
                    )}
                    <span
                      className={`font-display text-xl sm:text-2xl font-bold ${shortened ? 'text-brand-emerald' : 'text-white/85'}`}
                    >
                      {formatLocaleNumber(travelRakat(p.id))}
                    </span>
                  </p>
                  <p className="text-white/60 text-[8px] sm:text-[9px] mt-1 uppercase sm:tracking-wide">
                    {shortened ? t('musafir.qasrTag', 'qaṣr') : t('musafir.unchanged', 'same')}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-control border border-brand-border bg-shade/20 p-3">
            {canJoin ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-white/75 font-bold inline-flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4 text-brand-gold" aria-hidden />
                  {t('musafir.canJoin', 'May be joined:')}
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
              <p className="text-white/75 text-xs leading-relaxed flex gap-1.5">
                <LinkIcon className="w-4 h-4 shrink-0 text-brand-gold" aria-hidden />
                <span>{bn ? meta.jamBn : meta.jam}</span>
              </p>
            )}
          </div>
        </section>

        {/* Motivation: the traveller's two gifts */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className={`${CARD} p-4`}>
            <h3 className={`${SECTION_TITLE} !text-sm`}>
              <SparklesIcon className="w-5 h-5 text-brand-gold" aria-hidden />
              {t('musafir.rewardTitle', 'Your good deeds keep flowing')}
            </h3>
            <p className="text-white/70 text-[11px] mt-0.5 mb-2">
              {t(
                'musafir.rewardSub',
                'Can’t keep your usual adhkar or nafl on the road? The reward is still written.'
              )}
            </p>
            <RefQuote r={REF_REWARD_FLOWS} lang={lang} />
          </div>
          <div className={`${CARD} p-4`}>
            <h3 className={`${SECTION_TITLE} !text-sm`}>
              <DuaHandsIcon className="w-5 h-5 text-brand-gold" aria-hidden />
              {t('musafir.duaTitle', 'Your du‘ā is answered')}
            </h3>
            <p className="text-white/70 text-[11px] mt-0.5 mb-2">
              {t(
                'musafir.duaSub',
                'Use the journey: ask for your parents, your family, the ummah and your own heart.'
              )}
            </p>
            <RefQuote r={REF_DUA_ANSWERED} lang={lang} />
          </div>
        </div>

        {/* Journey du'as checklist */}
        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="flex items-center justify-between gap-2">
            <h3 className={SECTION_TITLE}>
              <DuaHandsIcon className="w-5 h-5 text-brand-gold" aria-hidden />
              {t('musafir.duasTitle', 'Du‘ās of the journey')}
            </h3>
            <span className="text-brand-emerald text-xs font-bold tabular-nums">
              {formatLocaleNumber(saidCount)}/{formatLocaleNumber(MUSAFIR_DUAS.length)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-brand-surface mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-emerald transition-[width] duration-500"
              style={{ width: `${(saidCount / MUSAFIR_DUAS.length) * 100}%` }}
            />
          </div>
          <p className="text-white/65 text-[11px] mt-1.5">
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
                  className={`rounded-control border transition-colors ${
                    done
                      ? 'border-brand-emerald/50 bg-brand-emerald/10'
                      : 'border-brand-border bg-brand-surface/50'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={() => toggleSaid(d.id)}
                      aria-pressed={done}
                      aria-label={t('musafir.markSaid', 'Mark as said')}
                      className={`shrink-0 w-8 h-8 rounded-full border-2 grid place-items-center transition-colors active:scale-90 ${
                        done
                          ? 'bg-brand-emerald-dim border-brand-emerald-dim text-on-color'
                          : 'border-brand-border text-transparent hover:border-brand-emerald'
                      }`}
                    >
                      <CheckIcon className="w-4 h-4" strokeWidth={3} aria-hidden />
                    </button>
                    <button
                      onClick={() => setOpenDua(open ? null : d.id)}
                      aria-expanded={open}
                      className="flex-1 min-w-0 text-left flex items-center gap-2"
                    >
                      <DuaIcon id={d.id} className="w-5 h-5 shrink-0 text-brand-gold" />
                      <span className="min-w-0">
                        <span
                          className={`block text-sm font-bold leading-tight ${done ? 'text-brand-emerald' : 'text-white/90'}`}
                        >
                          {bn ? d.whenBn : d.when}
                        </span>
                        {d.returning && (
                          <span className="text-brand-gold text-[10px] font-bold uppercase tracking-wide">
                            {t('musafir.onReturn', 'on return')}
                          </span>
                        )}
                      </span>
                      <ChevronDownIcon
                        className={`ml-auto w-4 h-4 shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
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
                          <p className="text-brand-gold text-xs italic leading-relaxed">
                            {d.translit}
                          </p>
                          <p className="text-white/75 text-xs leading-relaxed">
                            {bn ? d.meaningBn : d.meaning}
                          </p>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-brand-gold underline underline-offset-2"
                          >
                            <BookOpenIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                            {translateReference(d.source, lang)} ·{' '}
                            {translateReference(d.grade, lang)}
                            <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" aria-hidden />
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

        {/* The concessions, with evidence */}
        <section>
          <h3 className={`${SECTION_TITLE} px-1`}>
            <GiftIcon className="w-5 h-5 text-brand-gold" aria-hidden />
            {t('musafir.rulingsTitle', 'The traveller’s concessions')}
          </h3>
          <p className="text-white/70 text-xs px-1 mt-0.5 mb-3">
            {t('musafir.rulingsSub', 'Tap any card for the details and the hadith behind it.')}
          </p>
          <div className="space-y-2">
            {MUSAFIR_RULINGS.map((r) => {
              const open = openRuling === r.id;
              return (
                <div
                  key={r.id}
                  className={`rounded-control border bg-brand-deep shadow-elev-1 overflow-hidden transition-colors ${
                    open ? 'border-brand-gold/50' : 'border-brand-border'
                  }`}
                >
                  <button
                    onClick={() => setOpenRuling(open ? null : r.id)}
                    aria-expanded={open}
                    className="w-full text-left p-3.5 flex items-start gap-3"
                  >
                    <span className="w-9 h-9 shrink-0 rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/25">
                      <RulingIcon id={r.id} className="w-5 h-5 text-brand-gold" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-white font-bold text-sm leading-snug">
                        {bn ? r.titleBn : r.title}
                      </span>
                      <span className="block text-white/70 text-xs mt-0.5 leading-relaxed">
                        {bn ? r.summaryBn : r.summary}
                      </span>
                    </span>
                    <ChevronDownIcon
                      className={`w-4 h-4 mt-1 shrink-0 text-white/60 transition-transform ${open ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
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
                                className="text-white/80 text-xs sm:text-sm leading-relaxed flex gap-2"
                              >
                                <span className="text-brand-gold shrink-0">•</span>
                                <span>{bn ? pt.bn : pt.en}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="space-y-2.5 border-t border-brand-border pt-3">
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
                </div>
              );
            })}
          </div>
        </section>

        {/* Madhab comparison */}
        <section className={`${CARD} p-4 sm:p-5`}>
          <h3 className={SECTION_TITLE}>
            <BookOpenIcon className="w-5 h-5 text-brand-gold" aria-hidden />
            {t('musafir.schoolsTitle', 'Where the madhabs differ')}
          </h3>
          <p className="text-white/70 text-xs mt-0.5">
            {t(
              'musafir.schoolsSub',
              'Both are valid scholarly positions. Your choice is highlighted.'
            )}
          </p>
          <div className="mt-3 space-y-3">
            {(
              [
                [MapIcon, t('musafir.rowDistance', 'Minimum distance'), 'distance'],
                [BuildingOfficeIcon, t('musafir.rowStay', 'Staying at one place'), 'stay'],
                [LinkIcon, t('musafir.rowJam', 'Joining prayers'), 'jam'],
              ] as const
            ).map(([Icon, label, key]) => (
              <div key={key}>
                <p className="text-white/75 text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-brand-gold" aria-hidden />
                  {label}
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
                        className={`rounded-control border p-2.5 ${
                          mine
                            ? 'border-brand-emerald/60 bg-brand-emerald/10'
                            : 'border-brand-border bg-shade/20'
                        }`}
                      >
                        <p
                          className={`text-[10px] font-bold uppercase ${mine ? 'text-brand-emerald' : 'text-white/60'}`}
                        >
                          {bn ? s.labelBn : s.label}
                        </p>
                        <p className="text-white/80 text-xs mt-0.5 leading-relaxed">{text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Coming home */}
        <section className={`${CARD} p-4 sm:p-5 space-y-3`}>
          <h3 className={SECTION_TITLE}>
            <HomeIcon className="w-5 h-5 text-brand-emerald" aria-hidden />
            {t('musafir.homeTitle', 'When the work is done, go home')}
          </h3>
          <RefQuote r={REF_HASTEN_HOME} lang={lang} />
          <RefQuote r={REF_RETURN_MASJID} lang={lang} />
        </section>

        <p className="text-white/60 text-[11px] leading-relaxed px-1">
          {t(
            'musafir.disclaimer',
            'Every reference links to its source. Details (exact distance, socks, special cases like a job that keeps you travelling) differ between scholars: when in doubt, ask a scholar you trust. Your journey is saved to your account settings and stays private.'
          )}
        </p>

        {/* Travel history: the current journey and every past one */}
        <section className={`${CARD} p-4 sm:p-5`}>
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h3 className={SECTION_TITLE}>
              <MapIcon className="w-5 h-5 text-brand-gold" aria-hidden />
              {t('musafir.historyTitle', 'Travel history')}
            </h3>
            {(history.length > 0 || musafir) && (
              <span className="text-white/65 text-[11px] font-bold">
                {t('musafir.historyTotals', '{{journeys}} journeys · {{days}} days on the road', {
                  journeys: formatLocaleNumber(history.length + (musafir ? 1 : 0)),
                  days: formatLocaleNumber(
                    history.reduce((n, j) => n + j.days, 0) + (musafir ? day : 0)
                  ),
                })}
              </span>
            )}
          </div>
          {history.length === 0 && !musafir ? (
            <p className="text-white/70 text-xs mt-2 leading-relaxed">
              {t(
                'musafir.historyEmpty',
                'Your journeys will be listed here: where you went, when you set out and came back, and how many days.'
              )}
            </p>
          ) : (
            <ol className="mt-3 relative border-l border-brand-border ml-2 space-y-3">
              {musafir && (
                <li className="pl-4 relative">
                  <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-brand-emerald ring-4 ring-brand-emerald/20" />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white/90 text-sm font-bold min-w-0 break-words inline-flex items-center gap-1">
                      <MapPinIcon className="w-4 h-4 shrink-0 text-brand-gold" aria-hidden />
                      {musafir.destination || t('musafir.aJourney', 'A journey')}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-brand-emerald/15 text-brand-emerald">
                      {t('musafir.historyOngoing', 'ongoing')}
                    </span>
                  </div>
                  <p className="text-white/65 text-xs mt-0.5">
                    {fmtDate(musafir.startedAt)}
                    {musafir.startAfter &&
                      ` (${t('musafir.historyAfter', 'after {{prayer}}', {
                        prayer: translateSalatName(musafir.startAfter, musafir.startAfter, t),
                      })})`}{' '}
                    → {t('musafir.historyNow', 'now')} ·{' '}
                    {t('musafir.daysShort', '{{count}}d', { count: day })}
                  </p>
                </li>
              )}
              {history.map((j, idx) => (
                <li key={`${j.from}-${j.to}-${idx}`} className="pl-4 relative">
                  <span className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-white/40" />
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-white/85 text-sm font-bold break-words inline-flex items-center gap-1">
                        <MapPinIcon className="w-4 h-4 shrink-0 text-white/60" aria-hidden />
                        {j.destination || t('musafir.aJourney', 'A journey')}
                      </p>
                      <p className="text-white/65 text-xs mt-0.5">
                        {fmtDate(j.from)}
                        {j.startAfter &&
                          ` (${t('musafir.historyAfter', 'after {{prayer}}', {
                            prayer: translateSalatName(j.startAfter, j.startAfter, t),
                          })})`}{' '}
                        → {fmtDate(j.to)}
                        {j.endAfter &&
                          ` (${t('musafir.historyUntil', 'until {{prayer}}', {
                            prayer: translateSalatName(j.endAfter, j.endAfter, t),
                          })})`}{' '}
                        · {t('musafir.daysShort', '{{count}}d', { count: j.days })}
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteIdx(idx)}
                      aria-label={t('musafir.historyDelete', 'Remove this journey')}
                      title={t('musafir.historyDelete', 'Remove this journey')}
                      className="shrink-0 w-7 h-7 rounded-lg grid place-items-center text-white/60 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <XMarkIcon className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={deleteIdx !== null}
        title={t('musafir.historyDeleteTitle', 'Remove this journey?')}
        message={t(
          'musafir.historyDeleteMessage',
          'Its days will no longer count as travel days, so missed prayers from them move out of Travel kaza. Your prayer logs are not changed.'
        )}
        confirmLabel={t('musafir.historyDeleteConfirm', 'Remove')}
        onConfirm={() => {
          if (deleteIdx !== null) deleteMusafirJourney(deleteIdx);
          setDeleteIdx(null);
        }}
        onCancel={() => setDeleteIdx(null)}
      />

      <ConfirmDialog
        open={confirmEnd}
        title={t('musafir.endTitle', 'Back home?')}
        message={t(
          'musafir.endMessage',
          'Musafir mode turns off and your prayers return to their full rak’ahs. Your prayers already logged on the journey keep their qaṣr marks.'
        )}
        confirmLabel={t('musafir.endConfirm', 'Yes, I’m home')}
        icon={<HomeIcon className="w-6 h-6" aria-hidden />}
        onConfirm={finishJourney}
        onCancel={() => setConfirmEnd(false)}
      />
    </AnimatedBackground>
  );
}
