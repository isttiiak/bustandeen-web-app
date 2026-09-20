import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { useSadaqahStats } from '../hooks/useSadaqah.js';

export default function Sadaqah() {
  const { t } = useTranslation();
  const { data: stats } = useSadaqahStats();

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('sadaqah.seoTitle', 'Sadaqah — Support Bustandeen')}
        description={t(
          'sadaqah.seoDescription',
          'Support Bustandeen with sadaqah — ongoing charity that helps keep the app free and growing for the community.'
        )}
        path="/sadaqah"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl border border-brand-emerald/25 bg-gradient-to-br from-brand-emerald/10 via-brand-gold/10 to-brand-deep p-6 sm:p-8 overflow-hidden"
          >
            <motion.div
              aria-hidden
              className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-brand-emerald/15 blur-3xl"
              animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.4, 0.3] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div className="relative">
              <div className="text-5xl mb-3">🌱</div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {t('sadaqah.heroTitle', 'Sadaqah')}
              </h1>
              <p className="text-white/50 text-sm sm:text-base mt-2.5 leading-relaxed">
                {t(
                  'sadaqah.heroDesc',
                  'Bustandeen stays free for everyone. If it has helped you, you can support the community that keeps it running — server costs, qari recordings, and features still to come — as an ongoing charity, sadaqah jariyah.'
                )}
              </p>
            </div>
          </motion.div>

          {/* A donation count, not a money figure — showing amounts raised
              isn't the right framing for sadaqah. Counts every verified
              donation (not unique donors) since one person can give more
              than once, or give on behalf of others. Only shown once
              someone has actually given, same reasoning as before for an
              empty state. */}
          {!!stats && stats.totalVerifiedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="rounded-2xl border border-brand-gold/25 bg-brand-gold/5 p-5 text-center"
            >
              <p className="text-brand-gold font-black text-sm uppercase tracking-widest">
                {t('sadaqah.contributorsLabel', 'Donations given')}
              </p>
              <p className="text-white text-3xl font-black mt-1.5">
                {stats.totalVerifiedCount.toLocaleString()}
              </p>
              <p className="text-white/40 text-xs mt-1">
                {t(
                  'sadaqah.jazakAllahLine',
                  'JazākAllāhu khayran to everyone who has given so far'
                )}
              </p>
            </motion.div>
          )}

          {stats && stats.quarterlyBreakdown.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-5 space-y-3"
            >
              <p className="text-white font-bold text-sm">
                {t('sadaqah.whereTitle', 'Where it has gone')}
              </p>
              <div className="space-y-2">
                {stats.quarterlyBreakdown.map((q) => (
                  <div
                    key={q.quarter}
                    className="flex items-start justify-between gap-3 text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-white/80 font-semibold">{q.quarter}</p>
                      {q.notes && <p className="text-white/40 text-xs mt-0.5">{q.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-brand-emerald text-xs">+{q.received.toLocaleString()}</p>
                      <p className="text-white/40 text-xs">-{q.spent.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
            className="rounded-2xl border border-brand-emerald/25 bg-brand-emerald/5 p-5 space-y-2"
          >
            <p className="text-brand-emerald font-black text-sm uppercase tracking-widest">
              {t('sadaqah.jariyahLabel', 'Sadaqah jariyah')}
            </p>
            <p className="text-white/60 text-sm leading-relaxed">
              {t(
                'sadaqah.jariyahText',
                "In the Islamic tradition, sadaqah jariyah is charity whose reward keeps flowing long after it's given — like a well someone dug that keeps giving people water. Every contribution here goes toward keeping this app free and improving it for the community, not toward any individual."
              )}
            </p>
            <p className="text-white/30 text-xs">
              {t(
                'sadaqah.notCommerceNote',
                'Nothing in Bustandeen is ever locked behind a donation — this is a request to give, never a transaction.'
              )}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="text-center pt-2"
          >
            <Link
              to="/sadaqah/donate"
              className="btn h-12 px-8 rounded-2xl border-0 text-white font-black bg-gradient-to-r from-brand-emerald via-brand-emerald to-brand-emerald-dim hover:opacity-90 inline-flex"
            >
              🤲 {t('sadaqah.giveCta', 'Give Sadaqah')}
            </Link>
            <p className="text-white/25 text-[11px] mt-3">
              {t(
                'sadaqah.bdOnlyNote',
                'Currently open to bKash donations from Bangladesh — more ways to give are on the way.'
              )}
            </p>
          </motion.div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
