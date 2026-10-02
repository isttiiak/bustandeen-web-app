import { useTranslation, Trans } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ArrowPathIcon, BookOpenIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { LeafIcon, Star8Icon } from '../icons/IslamicIcons.js';
import { CARD } from '../bustanStyles.js';
import { CautionIcon, ProhibitedIcon, VOLUNTARY_ICON } from './fastingIcons.js';
import {
  VOLUNTARY_META,
  PROHIBITED_INFO,
  DISLIKED_INFO,
  FASTING_SUNNAH,
} from '../../utils/fastingRules.js';
import { RefLink } from './fastingParts.js';

export interface FastingLearnProps {
  learnOpen: boolean;
  setLearnOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function FastingLearn({ learnOpen, setLearnOpen }: FastingLearnProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className={`${CARD} overflow-hidden`}>
        <button
          onClick={() => setLearnOpen(!learnOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
          aria-expanded={learnOpen}
        >
          <p className="font-display text-white font-bold text-base flex items-center gap-2">
            <BookOpenIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
            {t('fasting.newToFasting', 'New to fasting? Start here')}
          </p>
          <motion.span animate={{ rotate: learnOpen ? 180 : 0 }} className="text-white/60">
            <ChevronDownIcon className="w-4 h-4" />
          </motion.span>
        </button>
        <AnimatePresence>
          {learnOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-5 border-t border-brand-border pt-4">
                {/* The basics */}
                <div className="space-y-1.5">
                  <p className="text-brand-emerald text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <LeafIcon className="w-3.5 h-3.5" />
                    {t('fasting.theBasics', 'The basics')}
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">
                    {t(
                      'fasting.basicsDesc',
                      'A fast runs from dawn (Fajr) to sunset (Maghrib): no food, drink, or intimacy. Make the intention in your heart, eat suhur before dawn, and break your fast promptly at sunset; dates and water are the sunnah.'
                    )}
                  </p>
                  {FASTING_SUNNAH.map((r, i) => (
                    <div key={r.url} className="pl-2 border-l-2 border-brand-emerald/30">
                      <p className="text-white/80 text-xs italic">
                        {t(`fastingRules.sunnahText.${i}`, r.text)}
                      </p>
                      <RefLink r={r} />
                    </div>
                  ))}
                </div>

                {/* Best days */}
                <div className="space-y-2">
                  <p className="text-brand-gold text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <Star8Icon className="w-3.5 h-3.5" />
                    {t('fasting.bestDays', 'The best days to fast')}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VOLUNTARY_META.filter((m) => m.id !== 'general').map((m) => {
                      const Icon = VOLUNTARY_ICON[m.id];
                      return (
                        <div
                          key={m.id}
                          className="rounded-control border border-brand-border bg-brand-surface/50 px-2.5 py-2"
                        >
                          <p className="text-xs font-bold leading-tight text-white flex items-center gap-1.5">
                            <Icon
                              className="w-3.5 h-3.5 text-brand-emerald shrink-0"
                              aria-hidden="true"
                            />
                            {t(`fastingRules.voluntary.${m.id}`, m.label)}
                          </p>
                          <p className="text-white/70 text-[11px] leading-snug mt-0.5">
                            {t(`fastingRules.voluntaryWhen.${m.id}`, m.when)}
                          </p>
                          <div className="mt-1">
                            <RefLink r={m.ref} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Never fast on */}
                <div className="space-y-1.5">
                  <p className="text-red-400 text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <ProhibitedIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('fasting.neverFastOn', 'Never fast on')}
                  </p>
                  {PROHIBITED_INFO.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-control bg-red-400/10 border border-red-400/30 px-3 py-2"
                    >
                      <p className="text-red-400 text-xs font-bold">
                        {t(`fastingRules.prohibited.${p.id}`, p.label)}
                      </p>
                      <p className="text-white/80 text-[11px] leading-snug">
                        {t(`fastingRules.prohibitedDetail.${p.id}`, p.detail)}
                      </p>
                      <div className="mt-0.5">
                        {p.refs.map((r) => (
                          <RefLink key={r.url} r={r} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Better to avoid */}
                <div className="space-y-1.5">
                  <p className="text-brand-gold text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <CautionIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('fasting.betterToAvoid', 'Better to avoid')}
                  </p>
                  {DISLIKED_INFO.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-control bg-brand-gold/10 border border-brand-gold/30 px-3 py-2"
                    >
                      <p className="text-brand-gold text-xs font-bold">
                        {t(`fastingRules.disliked.${p.id}`, p.label)}
                      </p>
                      <p className="text-white/80 text-[11px] leading-snug">
                        {t(`fastingRules.dislikedDetail.${p.id}`, p.detail)}
                      </p>
                      <div className="mt-0.5">
                        {p.refs.map((r) => (
                          <RefLink key={r.url} r={r} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Owe fasts? */}
                <div className="space-y-1.5">
                  <p className="text-white/80 text-[11px] uppercase tracking-widest font-bold flex items-center gap-1.5">
                    <ArrowPathIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {t('fasting.missedRamadan', 'Missed Ramadan days?')}
                  </p>
                  <p className="text-white/80 text-xs leading-relaxed">
                    {/* components is an ARRAY prop — react-i18next numbers <0>/<1>/...
                        by that array's own order only, ignoring surrounding text/
                        whitespace nodes. The old children-based numbering (<1>/<3>/<5>/<7>)
                        was thrown off by the {' '} whitespace node splitting the first
                        text run, which shifted every index and rendered a garbled mix
                        of the Bengali translation and the English defaults. */}
                    <Trans
                      i18nKey="fasting.missedRamadanDesc"
                      defaults="Days missed for a valid reason are made up as <0>Qada</0> (Quran 2:184). Broke a fast deliberately? That may need <1>Kaffarah</1>. Made a vow to fast? That's <2>Nadhr</2>. Track all three from the <3>Manage</3> button above."
                      components={[
                        <b key="0" className="text-white" />,
                        <b key="1" className="text-white" />,
                        <b key="2" className="text-white" />,
                        <b key="3" className="text-white" />,
                      ]}
                    />
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
