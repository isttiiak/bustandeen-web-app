import { useTranslation, Trans } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
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
      <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] overflow-hidden">
        <button
          onClick={() => setLearnOpen(!learnOpen)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
          aria-expanded={learnOpen}
        >
          <p className="text-white/70 font-bold text-sm">
            📚 {t('fasting.newToFasting', 'New to fasting? Start here')}
          </p>
          <motion.span animate={{ rotate: learnOpen ? 180 : 0 }} className="text-white/30">
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
              <div className="px-4 pb-4 space-y-5 border-t border-brand-emerald/5 pt-4">
                {/* The basics */}
                <div className="space-y-1.5">
                  <p className="text-brand-emerald text-[10px] uppercase tracking-widest font-bold">
                    🌱 {t('fasting.theBasics', 'The basics')}
                  </p>
                  <p className="text-white/50 text-xs leading-relaxed">
                    {t(
                      'fasting.basicsDesc',
                      'A fast runs from dawn (Fajr) to sunset (Maghrib): no food, drink, or intimacy. Make the intention in your heart, eat suhur before dawn, and break your fast promptly at sunset — dates and water are the sunnah.'
                    )}
                  </p>
                  {FASTING_SUNNAH.map((r, i) => (
                    <div key={r.url} className="pl-2 border-l-2 border-brand-emerald/30">
                      <p className="text-white/40 text-[11px] italic">
                        {t(`fastingRules.sunnahText.${i}`, r.text)}
                      </p>
                      <RefLink r={r} />
                    </div>
                  ))}
                </div>

                {/* Best days */}
                <div className="space-y-2">
                  <p className="text-brand-gold text-[10px] uppercase tracking-widest font-bold">
                    ⭐ {t('fasting.bestDays', 'The best days to fast')}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {VOLUNTARY_META.filter((m) => m.id !== 'general').map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl border px-2.5 py-2"
                        style={{ background: `${m.color}10`, borderColor: `${m.color}30` }}
                      >
                        <p
                          className="text-[11px] font-bold leading-tight"
                          style={{ color: m.color }}
                        >
                          {m.emoji} {t(`fastingRules.voluntary.${m.id}`, m.label)}
                        </p>
                        <p className="text-white/30 text-[10px] leading-snug mt-0.5">
                          {t(`fastingRules.voluntaryWhen.${m.id}`, m.when)}
                        </p>
                        <div className="mt-1">
                          <RefLink r={m.ref} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Never fast on */}
                <div className="space-y-1.5">
                  <p className="text-red-400 text-[10px] uppercase tracking-widest font-bold">
                    🚫 {t('fasting.neverFastOn', 'Never fast on')}
                  </p>
                  {PROHIBITED_INFO.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl bg-red-500/10 border border-red-500/25 px-3 py-2"
                    >
                      <p className="text-red-300 text-[11px] font-bold">
                        {p.emoji} {t(`fastingRules.prohibited.${p.id}`, p.label)}
                      </p>
                      <p className="text-white/30 text-[10px] leading-snug">
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
                  <p className="text-brand-gold/80 text-[10px] uppercase tracking-widest font-bold">
                    ⚠️ {t('fasting.betterToAvoid', 'Better to avoid')}
                  </p>
                  {DISLIKED_INFO.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-xl bg-brand-gold/10 border border-brand-gold/20 px-3 py-2"
                    >
                      <p className="text-brand-gold/90 text-[11px] font-bold">
                        {p.emoji} {t(`fastingRules.disliked.${p.id}`, p.label)}
                      </p>
                      <p className="text-white/30 text-[10px] leading-snug">
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
                  <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold">
                    🔄 {t('fasting.missedRamadan', 'Missed Ramadan days?')}
                  </p>
                  <p className="text-white/40 text-[11px] leading-relaxed">
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
                        <b key="0" className="text-white/60" />,
                        <b key="1" className="text-white/60" />,
                        <b key="2" className="text-white/60" />,
                        <b key="3" className="text-white/60" />,
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
