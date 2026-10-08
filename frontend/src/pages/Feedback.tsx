import { useTranslation } from 'react-i18next';
import {
  BookOpenIcon,
  BugAntIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  KeyIcon,
  LightBulbIcon,
  LockClosedIcon,
  PaintBrushIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import FeedbackForm, { type FormType } from '../components/FeedbackForm.js';
import Seo from '../components/Seo.js';
import { CARD } from '../components/bustanStyles.js';
import { MosqueIcon } from '../components/icons/IslamicIcons.js';

const TYPE_KEYS: { id: string; Icon: FormType['Icon'] }[] = [
  { id: 'bug', Icon: BugAntIcon },
  { id: 'idea', Icon: LightBulbIcon },
  { id: 'design', Icon: PaintBrushIcon },
  { id: 'reference', Icon: BookOpenIcon },
  { id: 'question', Icon: QuestionMarkCircleIcon },
  { id: 'account', Icon: KeyIcon },
  { id: 'privacy', Icon: LockClosedIcon },
  { id: 'collab', Icon: UsersIcon },
  { id: 'appreciation', Icon: HeartIcon },
  { id: 'report', Icon: ExclamationTriangleIcon },
  { id: 'other', Icon: SparklesIcon },
];

const PROMISES = [
  { key: 'realReply', Icon: EnvelopeOpenIcon },
  { key: 'keptPrivate', Icon: LockClosedIcon },
  { key: 'builtForUmmah', Icon: MosqueIcon },
] as const;

export default function Feedback() {
  const { t } = useTranslation();

  const types: FormType[] = TYPE_KEYS.map(({ id, Icon }) => ({
    id,
    label: t(`feedback.type.${id}.label`),
    Icon,
    hint: t(`feedback.type.${id}.hint`),
  }));

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('feedback.seoTitle', 'Feedback & Contact')}
        description={t(
          'feedback.seoDescription',
          'Report a bug, suggest a feature, or ask a question. Reach the Bustandeen team directly. Real replies, kept private, built for the ummah.'
        )}
        path="/feedback"
      />
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-4">
        {/* Arch hero */}
        <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-5 sm:px-8 pt-10 pb-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
            <ChatBubbleLeftRightIcon className="w-7 h-7 text-brand-gold" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-3">
            {t('feedback.heroTitle')}
          </h1>
          <p className="text-white/75 text-sm sm:text-base mt-2.5 leading-relaxed">
            {t('feedback.heroDesc1')} <b className="text-white">{t('feedback.heroDesc2')}</b>{' '}
            {t('feedback.heroDesc3')}
          </p>
          <p className="mt-4 flex items-start gap-2 text-left rounded-control border border-brand-emerald/30 bg-brand-emerald/10 p-3 text-brand-emerald text-xs leading-relaxed">
            <BookOpenIcon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
            <span>{t('feedback.referenceNote')}</span>
          </p>
        </section>

        {/* Promises */}
        <div className="grid sm:grid-cols-3 gap-3">
          {PROMISES.map(({ key, Icon }) => (
            <div key={key} className={`${CARD} p-4 flex gap-3 sm:block`}>
              <span className="w-9 h-9 rounded-control bg-brand-emerald/15 grid place-items-center shrink-0">
                <Icon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
              </span>
              <span className="block min-w-0">
                <span className="block text-white text-sm font-bold sm:mt-2">
                  {t(`feedback.promise.${key}.title`)}
                </span>
                <span className="block text-white/70 text-xs mt-0.5 leading-snug">
                  {t(`feedback.promise.${key}.text`)}
                </span>
              </span>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className={`${CARD} p-5 sm:p-7`}>
          <FeedbackForm kind="feedback" types={types} submitLabel={t('feedback.submitLabel')} />
        </div>

        <p className="text-center text-white/70 text-[11px]">{t('feedback.disclaimer')}</p>
      </div>
    </AnimatedBackground>
  );
}
