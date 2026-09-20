import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';

const SECTION_KEYS = [
  { emoji: '📥', key: 'whatWeStore', bodyCount: 7 },
  { emoji: '📍', key: 'deviceOnly', bodyCount: 3 },
  { emoji: '🤝', key: 'friendsSee', bodyCount: 5 },
  { emoji: '✨', key: 'naseeh', bodyCount: 4 },
  { emoji: '🌐', key: 'thirdParty', bodyCount: 3 },
  { emoji: '🚫', key: 'neverDo', bodyCount: 3 },
  { emoji: '🗑️', key: 'yourControl', bodyCount: 4 },
  { emoji: '🔐', key: 'protected', bodyCount: 4 },
  { emoji: '📝', key: 'changes', bodyCount: 1 },
];

export default function Privacy() {
  const { t } = useTranslation();

  const sections = SECTION_KEYS.map((s) => ({
    emoji: s.emoji,
    title: t(`privacy.${s.key}.title`),
    body: Array.from({ length: s.bodyCount }, (_, i) => t(`privacy.${s.key}.body${i}`)),
  }));

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('privacy.seoTitle', 'Privacy Policy')}
        description={t(
          'privacy.seoDescription',
          'How Bustandeen stores and protects your data: what we collect, what stays on your device, what friends can see, and your control over deletion.'
        )}
        path="/privacy"
      />
      <h1 className="sr-only">{t('privacy.srTitle')}</h1>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-4 pb-10">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-6 space-y-2"
          >
            <p className="text-5xl">🔒</p>
            <h2 className="text-3xl font-black text-white">{t('privacy.heading')}</h2>
            <p className="text-white/40 text-sm max-w-md mx-auto leading-relaxed">
              {t('privacy.subtitle')}
            </p>
            <p className="text-white/25 text-xs">{t('privacy.lastUpdated')}</p>
          </motion.div>

          {sections.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 + i * 0.05 }}
              className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-5"
            >
              <p className="text-white font-bold text-sm mb-2">
                {s.emoji} {s.title}
              </p>
              <ul className="space-y-1.5">
                {s.body.map((line, j) => (
                  <li
                    key={j}
                    className="text-white/40 text-xs leading-relaxed pl-3 border-l-2 border-brand-emerald/10"
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center pt-4 space-y-2"
          >
            <p className="text-white/40 text-xs">
              {t('privacy.contactText')}{' '}
              <a href="mailto:ansar@bustandeen.com" className="text-brand-emerald underline">
                ansar@bustandeen.com
              </a>
            </p>
            <Link to="/about" className="text-white/30 text-xs underline hover:text-white/60">
              {t('privacy.aboutLink')}
            </Link>
          </motion.div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
