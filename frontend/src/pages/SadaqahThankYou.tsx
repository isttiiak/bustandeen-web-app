import { Link } from 'react-router';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';

export default function SadaqahThankYou() {
  const { t } = useTranslation();

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('sadaqahThankYou.seoTitle', 'Thank You')}
        description={t('sadaqahThankYou.seoDescription', 'Your sadaqah submission was received.')}
        path="/sadaqah/thank-you"
        index={false}
      />
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-3xl border border-brand-emerald/30 bg-brand-emerald/[0.07] p-8 text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.1 }}
          >
            <CheckCircleIcon className="w-16 h-16 text-brand-emerald mx-auto" />
          </motion.div>
          <h1 className="text-white font-black text-2xl">
            {t('sadaqahThankYou.title', 'JazākAllāhu khayran')}
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            {t(
              'sadaqahThankYou.body',
              "We've received your submission and will verify it against our bKash records within 24-48 hours. A confirmation email is on its way."
            )}
          </p>
          <p className="text-brand-emerald/80 text-sm italic">
            {t(
              'sadaqahThankYou.dua',
              'May Allah accept it from you and make it a means of ongoing reward.'
            )}
          </p>
          <Link
            to="/"
            className="btn mt-2 rounded-xl bg-brand-emerald-dim hover:bg-brand-emerald-dim hover:brightness-90 border-0 text-on-color w-full"
          >
            {t('sadaqahThankYou.backToApp', 'Back to Bustandeen')}
          </Link>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
}
