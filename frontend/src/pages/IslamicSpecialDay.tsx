import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import AnimatedBackground from '../components/AnimatedBackground.js';
import ReportReference from '../components/ReportReference.js';
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

export default function IslamicSpecialDay() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const day = SPECIAL_DAYS.find((d) => d.id === id);

  if (!day) {
    return (
      <AnimatedBackground variant="dark">
        <div className="min-h-[60vh] flex items-center justify-center flex-col gap-4 p-8">
          <span className="text-5xl">🔍</span>
          <p className="text-white/60 text-lg font-semibold">
            {t('specialDays.notFound', 'Special day not found.')}
          </p>
          <Link
            to="/"
            className="btn btn-sm bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 text-on-color border-0"
          >
            {t('specialDays.backHome', '← Back to Home')}
          </Link>
        </div>
      </AnimatedBackground>
    );
  }

  const colorStyle = { color: day.color };
  const borderStyle = { borderColor: `${day.color}40` };
  const bgStyle = { background: `${day.color}12` };

  return (
    <AnimatedBackground variant="dark">
      <div className="p-4 sm:p-6 lg:p-8 pb-16">
        <div className="max-w-2xl mx-auto space-y-5">
          {/* Hero card */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border overflow-hidden"
            style={{ ...bgStyle, ...borderStyle }}
          >
            <div className="p-6 sm:p-8 text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="text-7xl mb-4 leading-none"
              >
                {day.icon}
              </motion.div>
              <span
                className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3 border"
                style={{ ...colorStyle, ...borderStyle, background: `${day.color}20` }}
              >
                {t(`specialDays.typeBadge.${day.type}`, TYPE_BADGE[day.type])}
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
                {t(`specialDays.${day.id}.name`, day.name)}
              </h1>
              <p className="font-arabic text-white/40 text-lg mb-3">{day.arabicName}</p>
              <p className="text-white/60 text-sm leading-relaxed max-w-lg mx-auto">
                {t(`specialDays.${day.id}.shortDesc`, day.shortDesc)}
              </p>

              {FASTING_DAY_IDS.has(day.id) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <Link
                    to="/fasting"
                    className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-transform hover:scale-105"
                    style={{ background: day.color }}
                  >
                    {t('specialDays.trackFast', '🌙 Track this fast →')}
                  </Link>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Significance */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="card bg-brand-surface border border-brand-border rounded-2xl"
          >
            <div className="card-body p-5 sm:p-6">
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">
                {t('specialDays.significanceLabel', '✨ Significance')}
              </p>
              <p className="text-white/70 text-sm leading-relaxed">
                {t(`specialDays.${day.id}.significance`, day.significance)}
              </p>
            </div>
          </motion.div>

          {/* Todos */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="card bg-brand-surface border border-brand-border rounded-2xl"
          >
            <div className="card-body p-5 sm:p-6">
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-4">
                {t('specialDays.whatToDoLabel', '📋 What to do today')}
              </p>
              <div className="space-y-3">
                {day.todos.map((todo, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.14 + i * 0.05 }}
                    className="flex items-start gap-3 p-3 rounded-xl border"
                    style={{ ...bgStyle, borderColor: `${day.color}25` }}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{todo.icon}</span>
                    <div className="min-w-0">
                      <p className="text-white/80 text-sm font-semibold leading-snug">
                        {t(`specialDays.${day.id}.todos.${i}.action`, todo.action)}
                      </p>
                      {todo.note && (
                        <p className="text-white/30 text-xs mt-0.5 leading-relaxed">
                          {t(`specialDays.${day.id}.todos.${i}.note`, todo.note)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* References */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card bg-brand-surface border border-brand-border rounded-2xl"
          >
            <div className="card-body p-5 sm:p-6">
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest mb-4">
                {t('specialDays.referencesLabel', '📖 References')}
              </p>
              <div className="space-y-3">
                {day.references.map((ref, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-brand-emerald/60 text-xs font-bold shrink-0 mt-0.5">
                      [{i + 1}]
                    </span>
                    <div className="min-w-0">
                      <p className="text-white/60 text-xs leading-relaxed italic">
                        {t(`specialDays.${day.id}.references.${i}.text`, ref.text)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {ref.grade && (
                          <span className="text-brand-emerald/60 text-[10px] font-semibold bg-brand-emerald/10 px-2 py-0.5 rounded-full">
                            {t(`specialDays.${day.id}.references.${i}.grade`, ref.grade)}
                          </span>
                        )}
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-gold/60 text-xs underline hover:text-brand-gold/90 transition-colors"
                        >
                          {t('specialDays.viewSource', 'View source ↗')}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Motivational footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center py-4"
          >
            <p className="text-white/25 text-xs italic">
              {t(
                'specialDays.footerQuote',
                '"Whoever acts on knowledge given to him, Allah will give him knowledge of what he did not know." — Ibn al-Qayyim'
              )}
            </p>
          </motion.div>
        </div>
        <ReportReference variant="card" what={day.name} className="mt-6" />
      </div>
    </AnimatedBackground>
  );
}
