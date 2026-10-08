import { Link, useParams, useSearchParams } from 'react-router';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/solid';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { BTN_PRIMARY } from '../components/bustanStyles.js';
import { useReceiptCheck } from '../hooks/useSadaqah.js';
import { formatLocaleNumber } from '../utils/localeDate.js';

/** Target of the QR code printed on every signed sadaqah receipt. */
export default function SadaqahVerify() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const { data, isLoading, isError } = useReceiptCheck(id, params.get('s') ?? '');

  const valid = data?.valid === true;

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('sadaqahVerify.seoTitle', 'Check a receipt')}
        description={t('sadaqahVerify.seoDescription', 'Check that a sadaqah receipt is genuine.')}
        path="/sadaqah/verify"
        index={false}
      />
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-8 pt-12 pb-8 text-center space-y-4"
        >
          {isLoading ? (
            <p className="text-white/60 text-sm">{t('common.loading', 'Loading…')}</p>
          ) : valid ? (
            <>
              <CheckBadgeIcon className="w-16 h-16 text-brand-emerald mx-auto" />
              <h1 className="font-display text-white font-bold text-2xl">
                {t('sadaqahVerify.validTitle', 'This receipt is genuine')}
              </h1>
              <p className="text-white/75 text-sm leading-relaxed">
                {t(
                  'sadaqahVerify.validBody',
                  'Bustandeen verified this sadaqah and signed the receipt.'
                )}
              </p>
              <dl className="text-sm text-left rounded-control bg-shade/20 border border-brand-border p-4 space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-white/65">{t('sadaqahVerify.receiptNo', 'Receipt no.')}</dt>
                  <dd className="text-white font-bold">#{data?.receiptNo}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-white/65">{t('sadaqahVerify.amount', 'Amount')}</dt>
                  <dd className="text-white font-bold">
                    {formatLocaleNumber(data?.amount ?? 0)} BDT
                  </dd>
                </div>
                {data?.verifiedAt && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-white/65">
                      {t('sadaqahVerify.verifiedOn', 'Verified on')}
                    </dt>
                    <dd className="text-white font-bold">
                      {new Date(data.verifiedAt).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <>
              <XCircleIcon className="w-16 h-16 text-brand-gold mx-auto" />
              <h1 className="font-display text-white font-bold text-2xl">
                {t('sadaqahVerify.invalidTitle', 'We could not confirm this receipt')}
              </h1>
              <p className="text-white/75 text-sm leading-relaxed">
                {isError
                  ? t(
                      'sadaqahVerify.errorBody',
                      'Something went wrong while checking. Please try again in a moment.'
                    )
                  : t(
                      'sadaqahVerify.invalidBody',
                      'The link may be incomplete, or the receipt may have been changed. If you think this is a mistake, write to sadaqah@bustandeen.com and we will help.'
                    )}
              </p>
            </>
          )}
          <Link to="/" className={`${BTN_PRIMARY} mt-2 w-full`}>
            {t('sadaqahThankYou.backToApp', 'Back to Bustandeen')}
          </Link>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
}
