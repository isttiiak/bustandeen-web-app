import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { translateReference } from '../utils/localeReference.js';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import InstallPwaBanner from '../components/InstallPwaBanner.js';
import { useAuthStore } from '../store/useAuthStore.js';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
};

const FEATURE_DEFS = [
  {
    emoji: '🕌',
    titleKey: 'landing.featureSalat',
    textKey: 'landing.featureSalatDesc',
    grad: 'from-brand-info/20 to-brand-warm/10',
    border: 'border-brand-info/25',
    to: '/salat',
  },
  {
    emoji: '📿',
    titleKey: 'landing.featureZikr',
    textKey: 'landing.featureZikrDesc',
    grad: 'from-brand-emerald/20 to-brand-info/10',
    border: 'border-brand-emerald/25',
    to: '/zikr',
  },
  {
    emoji: '📖',
    titleKey: 'landing.featureQuran',
    textKey: 'landing.featureQuranDesc',
    grad: 'from-brand-info/20 to-brand-info/10',
    border: 'border-brand-info/25',
    to: '/quran',
  },
  {
    emoji: '🌙',
    titleKey: 'landing.featureFasting',
    textKey: 'landing.featureFastingDesc',
    grad: 'from-brand-gold/20 to-brand-warm/10',
    border: 'border-brand-gold/25',
    to: '/fasting',
  },
  {
    emoji: '🕐',
    titleKey: 'landing.featurePrayer',
    textKey: 'landing.featurePrayerDesc',
    grad: 'from-brand-info/20 to-brand-info/10',
    border: 'border-brand-info/25',
    to: '/prayer-times',
  },
  {
    emoji: '🤝',
    titleKey: 'landing.featureFriends',
    textKey: 'landing.featureFriendsDesc',
    grad: 'from-brand-pink/20 to-brand-warm/10',
    border: 'border-brand-pink/25',
    to: '/friends',
  },
];

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { enterDemoMode } = useAuthStore();

  const exploreBrother = () => {
    enterDemoMode('male');
    navigate('/');
  };

  const exploreSister = () => {
    enterDemoMode('female');
    navigate('/');
  };

  return (
    <AnimatedBackground variant="dark">
      <InstallPwaBanner />
      <Seo
        title={t('landing.seoTitle', 'Bustandeen - Nourish Your Deen')}
        description={t(
          'landing.seoDescription',
          'Track your zikr, salat, fasting and Quran reading - with authentic references, streaks, prayer times and a friends leaderboard. Free, private, and built for the Muslim community.'
        )}
        path="/"
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        {/* ── Hero ── */}
        <section className="text-center pt-14 sm:pt-20 pb-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="text-7xl mb-5"
          >
            🌙
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="text-4xl sm:text-6xl font-black text-white leading-tight"
          >
            {t('landing.heroTitle1')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-emerald to-brand-info">
              {t('landing.heroTitle2')}
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-white/50 text-base sm:text-lg max-w-2xl mx-auto mt-5 leading-relaxed"
          >
            {t('landing.heroDesc')}
          </motion.p>

          {/* Primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.5 }}
            className="mt-8 space-y-3"
          >
            <div className="flex flex-wrap justify-center">
              <button
                className="btn h-13 px-10 rounded-2xl border-0 text-white text-base font-black bg-gradient-to-r from-brand-emerald to-brand-info hover:from-brand-emerald hover:to-brand-info shadow-xl shadow-brand-emerald-dim/40"
                onClick={() => navigate('/signup')}
              >
                {t('landing.cta')}
              </button>
            </div>

            {/* Demo explore — two explicit gender buttons, no popup */}
            <div className="flex flex-wrap justify-center gap-2">
              <button
                className="btn h-10 px-5 rounded-xl bg-brand-info/10 border border-brand-info/20 text-white/70 text-sm font-semibold hover:bg-brand-info/20 hover:text-white transition-all"
                onClick={exploreBrother}
              >
                🕌 {t('landing.exploreAsBrother', 'Explore as Brother')}
              </button>
              <button
                className="btn h-10 px-5 rounded-xl bg-brand-pink/10 border border-brand-pink/20 text-white/70 text-sm font-semibold hover:bg-brand-pink/20 hover:text-white transition-all"
                onClick={exploreSister}
              >
                🌸 {t('landing.exploreAsSister', 'Explore as Sister')}
              </button>
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-white/25 text-xs mt-4"
          >
            {t('landing.noAds')}
          </motion.p>
        </section>

        {/* ── Feature grid — core features ── */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {FEATURE_DEFS.map((f, i) => (
            <motion.div
              key={f.titleKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: (i % 3) * 0.08, duration: 0.45 }}
            >
              <Link
                to={f.to}
                className={`block rounded-3xl border ${f.border} bg-gradient-to-br ${f.grad} p-6 h-full transition-transform hover:scale-[1.02] hover:shadow-lg`}
              >
                <div className="text-4xl mb-3">{f.emoji}</div>
                <h3 className="text-white font-black text-lg">{t(f.titleKey)}</h3>
                <p className="text-white/50 text-sm mt-2 leading-relaxed">{t(f.textKey)}</p>
                <span className="inline-block mt-3 text-xs font-semibold text-brand-emerald/70">
                  {t('landing.tryIt')}
                </span>
              </Link>
            </motion.div>
          ))}
        </section>

        {/* ── Rayhanah cycle — below all feature cards ── */}
        <motion.section {...fadeUp} className="mb-12">
          <Link
            to="/cycle"
            className="block rounded-3xl p-6 sm:p-10 border border-brand-pink/25 bg-gradient-to-br from-brand-pink/15 via-brand-pink/10 to-brand-warm/10 relative overflow-hidden transition-transform hover:scale-[1.01] hover:shadow-xl"
          >
            <motion.div
              className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-brand-pink/10 blur-3xl pointer-events-none"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative sm:flex items-center gap-8">
              <div className="text-6xl sm:text-7xl text-center sm:text-left mb-4 sm:mb-0">🌸</div>
              <div className="flex-1">
                <p className="text-brand-pink/80 text-xs font-black uppercase tracking-widest">
                  {t('landing.rayhanahHighlight')}
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-2">
                  {t('landing.rayhanahTitle')}
                </h2>
                <p className="text-brand-pink/70 text-sm sm:text-base mt-3 leading-relaxed max-w-2xl">
                  {t('landing.rayhanahDesc')}
                  <span className="font-bold text-brand-pink">{t('landing.rayhanahPrivate')}</span>
                </p>
                <span className="inline-block mt-4 text-xs font-semibold text-brand-pink/70">
                  {t('landing.tryIt')}
                </span>
              </div>
            </div>
          </Link>
        </motion.section>

        {/* ── Privacy & security ── */}
        <motion.section {...fadeUp} className="mb-12">
          <div className="rounded-3xl border border-brand-emerald/25 bg-gradient-to-br from-brand-emerald/10 via-brand-deep/60 to-brand-info/10 p-6 sm:p-10">
            <div className="text-center mb-8">
              <div className="text-5xl mb-3">🔒</div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                {t('landing.privacyTitle')}
              </h2>
              <p className="text-white/50 text-sm sm:text-base mt-3 max-w-2xl mx-auto leading-relaxed">
                {t('landing.privacyDesc')}
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-brand-emerald/20 bg-brand-deep/50 p-5">
                <div className="text-3xl mb-2">🔐</div>
                <h3 className="text-white font-bold text-sm">
                  {t('landing.privacyEncryptedTitle')}
                </h3>
                <p className="text-white/40 text-xs mt-1.5 leading-relaxed">
                  {t('landing.privacyEncryptedDesc')}
                </p>
              </div>
              <div className="rounded-2xl border border-brand-emerald/20 bg-brand-deep/50 p-5">
                <div className="text-3xl mb-2">🙈</div>
                <h3 className="text-white font-bold text-sm">{t('landing.privacyPartnerTitle')}</h3>
                <p className="text-white/40 text-xs mt-1.5 leading-relaxed">
                  {t('landing.privacyPartnerDesc')}
                </p>
              </div>
              <div className="rounded-2xl border border-brand-emerald/20 bg-brand-deep/50 p-5">
                <div className="text-3xl mb-2">🔑</div>
                <h3 className="text-white font-bold text-sm">{t('landing.privacyAiKeyTitle')}</h3>
                <p className="text-white/40 text-xs mt-1.5 leading-relaxed">
                  {t('landing.privacyAiKeyDesc')}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── Authenticity strip ── */}
        <motion.section {...fadeUp} className="mb-12">
          <div className="rounded-3xl border border-brand-gold/25 bg-gradient-to-r from-brand-gold/10 to-transparent p-6 sm:p-8 sm:flex items-center gap-6">
            <div className="text-5xl text-center sm:text-left mb-3 sm:mb-0">🔍</div>
            <div>
              <h3 className="text-white font-black text-lg">{t('landing.verifiedTitle')}</h3>
              <p className="text-white/50 text-sm mt-1.5 leading-relaxed max-w-2xl">
                {t('landing.verifiedDesc')}
              </p>
            </div>
          </div>
        </motion.section>

        {/* ── The day begins at Fajr ── */}
        <motion.section {...fadeUp} className="mb-12">
          <div className="rounded-3xl border border-brand-emerald/10 bg-brand-deep/70 p-6 sm:p-8 text-center">
            <div className="text-4xl mb-2">🌅</div>
            <h3 className="text-white font-black text-lg">{t('landing.fajrTitle')}</h3>
            <p className="text-white/40 text-sm mt-2 max-w-xl mx-auto leading-relaxed">
              {t('landing.fajrDesc')}
            </p>
          </div>
        </motion.section>

        {/* ── Sadaqah — support the project, near the very bottom, low-key ── */}
        <motion.section {...fadeUp} className="mb-12">
          <Link
            to="/sadaqah"
            className="block rounded-3xl border border-brand-gold/25 bg-gradient-to-br from-brand-gold/10 to-brand-emerald/5 p-6 sm:p-8 text-center transition-transform hover:scale-[1.01] hover:shadow-lg"
          >
            <div className="text-4xl mb-2">🤲</div>
            <h3 className="text-white font-black text-lg">{t('landing.sadaqahTitle')}</h3>
            <p className="text-white/50 text-sm mt-2 max-w-xl mx-auto leading-relaxed">
              {t('landing.sadaqahDesc')}
            </p>
            <span className="inline-block mt-3 text-xs font-semibold text-brand-gold/80">
              {t('landing.sadaqahCta')}
            </span>
          </Link>
        </motion.section>

        {/* ── Final CTA ── */}
        <motion.section {...fadeUp} className="text-center pb-4">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            "So compete with one another in doing good."
          </h2>
          <p className="text-white/30 text-sm mt-2">
            <a
              className="underline"
              href="https://quran.com/2/148"
              target="_blank"
              rel="noreferrer"
            >
              {translateReference('Quran 2:148', i18n.language)}
            </a>
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <button
              className="btn h-13 px-10 rounded-2xl border-0 text-white text-base font-black bg-gradient-to-r from-brand-emerald to-brand-info hover:from-brand-emerald hover:to-brand-info shadow-xl shadow-brand-emerald-dim/40"
              onClick={() => navigate('/signup')}
            >
              {t('landing.finalCta')}
            </button>
            <Link
              to="/about"
              className="btn h-13 px-6 rounded-2xl bg-white/5 border-brand-emerald/15 text-white/70 font-bold"
            >
              {t('landing.readOurStory')}
            </Link>
          </div>
          <p className="text-white/25 text-[11px] mt-5">{t('footer.platformNote')}</p>
        </motion.section>
      </div>
    </AnimatedBackground>
  );
}
