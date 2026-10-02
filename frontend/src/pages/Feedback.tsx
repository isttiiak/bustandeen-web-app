import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import FeedbackForm, { type FormType } from '../components/FeedbackForm.js';
import Seo from '../components/Seo.js';

const TYPE_KEYS = [
  { id: 'bug', emoji: '🐛', active: 'bg-red-500/15 border-red-400/40 text-red-100', key: 'bug' },
  {
    id: 'idea',
    emoji: '💡',
    active: 'bg-brand-gold/15 border-brand-gold/40 text-brand-gold',
    key: 'idea',
  },
  {
    id: 'design',
    emoji: '🎨',
    active: 'bg-brand-pink/15 border-brand-pink/40 text-brand-pink',
    key: 'design',
  },
  {
    id: 'reference',
    emoji: '📖',
    active: 'bg-brand-emerald/15 border-brand-emerald/40 text-brand-emerald',
    key: 'reference',
  },
  {
    id: 'question',
    emoji: '❓',
    active: 'bg-brand-info/15 border-brand-info/40 text-brand-info',
    key: 'question',
  },
  {
    id: 'account',
    emoji: '🔑',
    active: 'bg-brand-info/15 border-brand-info/40 text-brand-info',
    key: 'account',
  },
  {
    id: 'privacy',
    emoji: '🔒',
    active: 'bg-brand-emerald/15 border-brand-emerald/40 text-brand-emerald',
    key: 'privacy',
  },
  {
    id: 'collab',
    emoji: '🤝',
    active: 'bg-brand-gold/15 border-brand-gold/40 text-brand-gold',
    key: 'collab',
  },
  {
    id: 'appreciation',
    emoji: '💚',
    active: 'bg-brand-info/15 border-brand-info/40 text-brand-info',
    key: 'appreciation',
  },
  {
    id: 'report',
    emoji: '⚠️',
    active: 'bg-red-500/15 border-red-400/40 text-red-100',
    key: 'report',
  },
  {
    id: 'other',
    emoji: '✨',
    active: 'bg-brand-info/15 border-brand-info/40 text-brand-info',
    key: 'other',
  },
];

const PROMISE_KEYS = ['realReply', 'keptPrivate', 'builtForUmmah'] as const;
const PROMISE_EMOJIS = ['📬', '🔒', '🕌'] as const;

export default function Feedback() {
  const { t } = useTranslation();

  const types: FormType[] = TYPE_KEYS.map((tk) => ({
    id: tk.id,
    label: t(`feedback.type.${tk.key}.label`),
    emoji: tk.emoji,
    active: tk.active,
    hint: t(`feedback.type.${tk.key}.hint`),
  }));

  const promises = PROMISE_KEYS.map((k, i) => ({
    emoji: PROMISE_EMOJIS[i],
    title: t(`feedback.promise.${k}.title`),
    text: t(`feedback.promise.${k}.text`),
  }));

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('feedback.seoTitle', 'Feedback & Contact')}
        description={t(
          'feedback.seoDescription',
          'Report a bug, suggest a feature, or ask a question — reach the Bustandeen team directly. Real replies, kept private, built for the ummah.'
        )}
        path="/feedback"
      />
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* hero */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl border border-brand-emerald/25 bg-gradient-to-br from-brand-emerald/10 via-brand-info/10 to-brand-deep p-6 sm:p-8 overflow-hidden"
        >
          <motion.div
            aria-hidden
            className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-brand-emerald/15 blur-3xl"
            animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative">
            <motion.div
              className="text-5xl mb-3 origin-bottom inline-block"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
            >
              💬
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {t('feedback.heroTitle')}
            </h1>
            <p className="text-white/50 text-sm sm:text-base mt-2.5 leading-relaxed">
              {t('feedback.heroDesc1')} <b className="text-white/80">{t('feedback.heroDesc2')}</b>{' '}
              {t('feedback.heroDesc3')}
            </p>
            <p className="text-brand-emerald/75 text-xs mt-3 leading-relaxed">
              📖 {t('feedback.referenceNote')}
            </p>
          </div>
        </motion.div>

        {/* promises */}
        <div className="grid sm:grid-cols-3 gap-3">
          {promises.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
              className="rounded-2xl border border-brand-emerald/10 bg-white/[0.03] p-4"
            >
              <div className="text-2xl">{p.emoji}</div>
              <p className="text-white/80 text-sm font-bold mt-1.5">{p.title}</p>
              <p className="text-white/40 text-xs mt-0.5 leading-snug">{p.text}</p>
            </motion.div>
          ))}
        </div>

        {/* form */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-brand-border bg-brand-surface p-5 sm:p-7"
        >
          <FeedbackForm kind="feedback" types={types} submitLabel={t('feedback.submitLabel')} />
        </motion.div>

        <p className="text-center text-white/25 text-[11px]">{t('feedback.disclaimer')}</p>
      </div>
    </AnimatedBackground>
  );
}
