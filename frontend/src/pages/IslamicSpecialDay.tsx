import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import DaifExplainer, { type DaifTopic } from '../components/DaifExplainer.js';
import ReportReference from '../components/ReportReference.js';
import { Star8Icon } from '../components/icons/IslamicIcons.js';
import { BTN_PRIMARY, CARD, SECTION_TITLE } from '../components/bustanStyles.js';
import { SPECIAL_DAYS } from '../utils/islamicCalendar.js';

const TYPE_BADGE: Record<string, string> = {
  weekly: 'Weekly Sunnah',
  monthly: 'Monthly Sunnah',
  annual: 'Annual Occasion',
  ramadan: 'Ramadan Special',
};

// Special days whose primary act of worship is fasting → deep-link to the tracker
const FASTING_DAY_IDS = new Set([
  'fast_mon_thu',
  'ayyam_al_bid',
  'ashura',
  'arafah',
  'dhul_hijjah_first10',
]);

// Days with a reference graded ḍaʿīf by any grader: the explainer card names
// the defective narrator and who graded it (guarded in specialDayScreen.test.ts).
const DAIF_TOPICS_BY_DAY: Partial<Record<string, DaifTopic[]>> = {
  fast_mon_thu: ['iftar-dua'],
  shab_e_barat: ['mid-shaban'],
};

export default function IslamicSpecialDay() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const day = SPECIAL_DAYS.find((d) => d.id === id);

  if (!day) {
    return (
      <AnimatedBackground variant="dark">
        <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4 p-8 text-center">
          <span className="w-14 h-14 rounded-full bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center">
            <MagnifyingGlassIcon className="w-7 h-7 text-brand-gold" aria-hidden="true" />
          </span>
          <p className="text-white/80 text-lg font-semibold">
            {t('specialDays.notFound', 'Special day not found.')}
          </p>
          <Link to="/" className={BTN_PRIMARY}>
            <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
            {t('specialDays.backHome', 'Back to Home')}
          </Link>
        </div>
      </AnimatedBackground>
    );
  }

  const daifTopics = DAIF_TOPICS_BY_DAY[day.id];

  return (
    <AnimatedBackground variant="dark">
      <div className="p-4 sm:p-6 lg:p-8 pb-16">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 sm:px-8 text-center"
          >
            <Star8Icon className="w-14 h-14 mx-auto mb-4 text-brand-gold" aria-hidden="true" />
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 border border-brand-gold/30 bg-brand-gold/10 text-brand-gold">
              {t(`specialDays.typeBadge.${day.type}`, TYPE_BADGE[day.type])}
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-1">
              {t(`specialDays.${day.id}.name`, day.name)}
            </h1>
            <p className="font-arabic text-white/70 text-lg mb-3">{day.arabicName}</p>
            <p className="text-white/80 text-sm leading-relaxed max-w-lg mx-auto">
              {t(`specialDays.${day.id}.shortDesc`, day.shortDesc)}
            </p>

            {FASTING_DAY_IDS.has(day.id) && (
              <Link to="/fasting" className={`${BTN_PRIMARY} mt-5`}>
                <MoonIcon className="w-4 h-4" aria-hidden="true" />
                {t('specialDays.trackFast', 'Track this fast')}
              </Link>
            )}
          </motion.div>

          {/* Significance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={`${CARD} p-5 sm:p-6`}
          >
            <h2 className={`${SECTION_TITLE} mb-3`}>
              <SparklesIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              {t('specialDays.significanceLabel', 'Significance')}
            </h2>
            <p className="text-white/80 text-sm leading-relaxed">
              {t(`specialDays.${day.id}.significance`, day.significance)}
            </p>
          </motion.div>

          {/* Todos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className={`${CARD} p-5 sm:p-6`}
          >
            <h2 className={`${SECTION_TITLE} mb-4`}>
              <ClipboardDocumentListIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              {t('specialDays.whatToDoLabel', 'What to do today')}
            </h2>
            <div className="space-y-3">
              {day.todos.map((todo, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.14 + i * 0.05 }}
                  className="flex items-start gap-3 p-3 rounded-control border border-brand-border bg-brand-surface/50"
                >
                  <CheckCircleIcon
                    className="w-5 h-5 shrink-0 mt-0.5 text-brand-emerald"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold leading-snug">
                      {t(`specialDays.${day.id}.todos.${i}.action`, todo.action)}
                    </p>
                    {todo.note && (
                      <p className="text-white/70 text-xs mt-0.5 leading-relaxed">
                        {t(`specialDays.${day.id}.todos.${i}.note`, todo.note)}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* References */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${CARD} p-5 sm:p-6`}
          >
            <h2 className={`${SECTION_TITLE} mb-4`}>
              <BookOpenIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
              {t('specialDays.referencesLabel', 'References')}
            </h2>
            <div className="space-y-3">
              {day.references.map((ref, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-brand-emerald text-xs font-bold shrink-0 mt-0.5">
                    [{i + 1}]
                  </span>
                  <div className="min-w-0">
                    <p className="text-white/80 text-xs leading-relaxed italic">
                      {t(`specialDays.${day.id}.references.${i}.text`, ref.text)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {ref.grade && (
                        <span className="text-brand-emerald text-[10px] font-semibold bg-brand-emerald/10 px-2 py-0.5 rounded-full">
                          {t(`specialDays.${day.id}.references.${i}.grade`, ref.grade)}
                        </span>
                      )}
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-gold text-xs underline underline-offset-2 hover:brightness-110 transition"
                      >
                        {t('specialDays.viewSource', 'View source')}
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {daifTopics && <DaifExplainer topics={daifTopics} />}
        </div>
        <ReportReference variant="card" what={day.name} className="mt-6" />
      </div>
    </AnimatedBackground>
  );
}
