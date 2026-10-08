import { Link } from 'react-router';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { BTN_PRIMARY, CARD, SECTION_TITLE, TILE } from '../components/bustanStyles.js';
import { DuaHandsIcon, LeafIcon } from '../components/icons/IslamicIcons.js';
import { useSadaqahStats } from '../hooks/useSadaqah.js';
import { formatLocaleNumber } from '../utils/localeDate.js';

export default function Sadaqah() {
  const { t } = useTranslation();
  const { data: stats } = useSadaqahStats();

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('sadaqah.seoTitle', 'Sadaqah: Support Bustandeen')}
        description={t(
          'sadaqah.seoDescription',
          'Support Bustandeen with sadaqah, ongoing charity that helps keep the app free and growing for the community.'
        )}
        path="/sadaqah"
      />
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-20 space-y-4">
        {/* Arch hero: what sadaqah here is for, and the one action */}
        <section className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-full grid place-items-center bg-brand-gold/10 border border-brand-gold/30">
            <DuaHandsIcon className="w-8 h-8 text-brand-gold" aria-hidden />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-4">
            {t('sadaqah.heroTitle', 'Sadaqah')}
          </h1>
          <p className="text-white/75 text-sm mt-2 leading-relaxed max-w-md mx-auto">
            {t(
              'sadaqah.heroDesc',
              'Bustandeen stays free for everyone. If it has helped you, you can support the community that keeps it running (server costs, qari recordings, and features still to come) as an ongoing charity, sadaqah jariyah.'
            )}
          </p>
          <Link to="/sadaqah/donate" className={`${BTN_PRIMARY} mt-5`}>
            <DuaHandsIcon className="w-4 h-4" aria-hidden />
            {t('sadaqah.giveCta', 'Give Sadaqah')}
          </Link>
          <p className="text-white/60 text-[11px] mt-3">
            {t(
              'sadaqah.bdOnlyNote',
              'Currently open to bKash donations from Bangladesh. More ways to give are on the way.'
            )}
          </p>
        </section>

        {/* A donation count, not a money figure: showing amounts raised isn't
            the right framing for sadaqah. Counts every verified donation (not
            unique donors), since one person can give more than once, or on
            behalf of others. Only shown once someone has actually given. */}
        {!!stats && stats.totalVerifiedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={TILE}
          >
            <p className="text-brand-gold font-bold text-xs uppercase tracking-widest">
              {t('sadaqah.contributorsLabel', 'Donations given')}
            </p>
            <p className="font-display text-white text-3xl font-bold mt-1.5">
              {formatLocaleNumber(stats.totalVerifiedCount)}
            </p>
            <p className="text-white/60 text-xs mt-1">
              {t('sadaqah.jazakAllahLine', 'JazākAllāhu khayran to everyone who has given so far')}
            </p>
          </motion.div>
        )}

        {(stats?.quarterlyBreakdown?.length ?? 0) > 0 && stats && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={`${CARD} p-5 space-y-3`}
          >
            <h2 className={SECTION_TITLE}>
              <ArrowTrendingUpIcon className="w-5 h-5 text-brand-emerald" aria-hidden />
              {t('sadaqah.whereTitle', 'Where it has gone')}
            </h2>
            <div className="space-y-2">
              {stats.quarterlyBreakdown.map((q) => (
                <div
                  key={q.quarter}
                  className="flex items-start justify-between gap-3 text-sm border-b border-brand-border pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-white/85 font-semibold">{q.quarter}</p>
                    {q.notes && <p className="text-white/60 text-xs mt-0.5">{q.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-brand-emerald text-xs">+{formatLocaleNumber(q.received)}</p>
                    <p className="text-white/60 text-xs">-{formatLocaleNumber(q.spent)}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${CARD} p-5 space-y-2`}
        >
          <h2 className={SECTION_TITLE}>
            <LeafIcon className="w-5 h-5 text-brand-emerald" aria-hidden />
            {t('sadaqah.jariyahLabel', 'Sadaqah jariyah')}
          </h2>
          <p className="text-white/75 text-sm leading-relaxed">
            {t(
              'sadaqah.jariyahText',
              "In the Islamic tradition, sadaqah jariyah is charity whose reward keeps flowing long after it's given, like a well someone dug that keeps giving people water. Every contribution here goes toward keeping this app free and improving it for the community, not toward any individual."
            )}
          </p>
          <p className="text-white/60 text-xs">
            {t(
              'sadaqah.notCommerceNote',
              'Nothing in Bustandeen is ever locked behind a donation. This is a request to give, never a transaction.'
            )}
          </p>
        </motion.div>
      </div>
    </AnimatedBackground>
  );
}
