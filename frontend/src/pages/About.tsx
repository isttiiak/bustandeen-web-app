import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useAuthStore } from '../store/useAuthStore.js';

const FEATURE_KEYS = [
  { emoji: '📿', key: 'zikrCounter' },
  { emoji: '🕌', key: 'salatTracker' },
  { emoji: '🕐', key: 'prayerTimes' },
  { emoji: '🌙', key: 'fastingTracker' },
  { emoji: '📖', key: 'quranHabit' },
  { emoji: '🧠', key: 'hifzTracker' },
  { emoji: '🌸', key: 'rayhanah' },
  { emoji: '✨', key: 'naseeh' },
  { emoji: '🤝', key: 'friends' },
];

export default function About() {
  const { t, i18n } = useTranslation();

  // Rayhanah is never surfaced to a brother's account; the public Privacy page is the exception.
  const isMale = useAuthStore((s) => s.user?.gender === 'male');
  const features = FEATURE_KEYS.filter((f) => !(isMale && f.key === 'rayhanah')).map((f) => ({
    emoji: f.emoji,
    title: t(`about.feature.${f.key}.title`),
    desc: t(`about.feature.${f.key}.desc`),
  }));

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('about.seoTitle', 'About Bustandeen — Our Mission')}
        description={t(
          'about.seoDescription',
          'Bustandeen is a free, private Islamic productivity app for zikr, salat, fasting and Quran habits — built for the Muslim community with authentic Quran and hadith references.'
        )}
        path="/about"
      />
      <h1 className="sr-only">{t('about.srTitle')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-6 space-y-3"
          >
            <p className="text-5xl">🌱</p>
            <h2 className="text-3xl font-black text-white">{t('about.heading')}</h2>
            <p className="font-arabic text-brand-gold/70 text-xl">بستان + دين</p>
            <p className="text-white/50 text-sm leading-relaxed max-w-lg mx-auto">
              {t(
                'about.bustandeenDefinition',
                'A name born of بستان (bustān, garden) and دين (dīn, religion/faith) - a garden of faith, tended daily.'
              )}
            </p>
            <p className="text-brand-emerald/80 text-sm font-semibold italic">
              "Nourish your deen."
            </p>
            <p className="text-white/25 text-xs max-w-sm mx-auto">
              {t('about.hadithQuote')}{' '}
              <a
                href="https://sunnah.com/bukhari:6464"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {translateReference('Ṣaḥīḥ al-Bukhārī 6464 ↗', i18n.language)}
              </a>
            </p>
          </motion.div>

          {/* Mission */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl border border-brand-emerald/25 bg-brand-emerald/5 p-5 space-y-2"
          >
            <p className="text-brand-emerald font-black text-sm uppercase tracking-widest">
              {t('about.intentionLabel')}
            </p>
            <p className="text-white/60 text-sm leading-relaxed">{t('about.intentionText')}</p>
          </motion.div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.05 }}
                className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-4"
              >
                <p className="text-2xl mb-1.5">{f.emoji}</p>
                <p className="text-white font-bold text-sm">{f.title}</p>
                <p className="text-white/40 text-xs leading-relaxed mt-1">{f.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Authenticity */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-brand-gold/25 bg-brand-gold/5 p-5 space-y-2"
          >
            <p className="text-brand-gold font-black text-sm uppercase tracking-widest">
              📖 {t('about.authenticityLabel')}
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              {t('about.authenticityText1')}{' '}
              <a
                href="https://quran.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-emerald underline"
              >
                quran.com
              </a>{' '}
              {t('about.authenticityOr')}{' '}
              <a
                href="https://sunnah.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-emerald underline"
              >
                sunnah.com
              </a>
              , {t('about.authenticityText2')}
            </p>
          </motion.div>

          {/* Privacy pointer */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-5 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-white font-bold text-sm">🔒 {t('about.dataTitle')}</p>
              <p className="text-white/40 text-xs mt-0.5">{t('about.dataDesc')}</p>
            </div>
            <Link
              to="/privacy"
              className="btn btn-sm bg-brand-deep border border-brand-border text-white/70 hover:text-white shrink-0"
            >
              {t('about.privacyLink')}
            </Link>
          </motion.div>

          {/* Developer credit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-4 space-y-2"
          >
            <p className="text-white/40 text-sm">
              {t('about.developedBy')} <span className="text-brand-emerald font-bold">Istiak</span>
            </p>
            <p className="text-white/30 text-xs max-w-sm mx-auto leading-relaxed">
              {t('about.founderNote')}
            </p>
            <a
              href="mailto:istiak@bustandeen.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-brand-emerald/10 text-white/60 hover:text-white hover:border-brand-emerald/30 transition-all text-xs font-bold"
            >
              ✉️ istiak@bustandeen.com
            </a>
          </motion.div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
