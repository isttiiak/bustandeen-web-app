import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { VOLUNTARY_META } from '../../utils/fastingRules.js';
import { CATEGORY_ICON, VOLUNTARY_ICON } from './fastingIcons.js';

function SheetIcon({ Icon, tone }: { Icon: (typeof VOLUNTARY_ICON)['general']; tone: string }) {
  return (
    <span
      className={`w-9 h-9 shrink-0 rounded-control grid place-items-center bg-shade/10 border border-brand-border ${tone}`}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
    </span>
  );
}

export interface FastingTypeSheetProps {
  category: import('../../utils/fastingRules.js').FastingCategory;
  effectiveKind: import('../../utils/fastingRules.js').VoluntaryKind;
  kaffarahActive: boolean;
  qadaRemaining: number;
  ruling: import('../../utils/fastingRules.js').DayRuling;
  setCategory: React.Dispatch<
    React.SetStateAction<import('../../utils/fastingRules.js').FastingCategory>
  >;
  setKind: React.Dispatch<
    React.SetStateAction<import('../../utils/fastingRules.js').VoluntaryKind | null>
  >;
  setShowTypeSheet: React.Dispatch<React.SetStateAction<boolean>>;
  setVowId: React.Dispatch<React.SetStateAction<string>>;
  showTypeSheet: boolean;
  summary: (import('../../hooks/useFasting.js').FastingSummary & { ok: boolean }) | undefined;
  vowId: string;
  vows: import('../../hooks/useFasting.js').FastingVow[];
}

export default function FastingTypeSheet({
  category,
  effectiveKind,
  kaffarahActive,
  qadaRemaining,
  ruling,
  setCategory,
  setKind,
  setShowTypeSheet,
  setVowId,
  showTypeSheet,
  summary,
  vowId,
  vows,
}: FastingTypeSheetProps) {
  const { t } = useTranslation();
  return (
    <>
      <AnimatePresence>
        {showTypeSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowTypeSheet(false);
            }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', damping: 26 }}
              className="bg-brand-deep rounded-card p-5 w-full max-w-md shadow-elev-3 border border-brand-border max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-white">
                  {t('fasting.whatKindOfFast', 'What kind of fast?')}
                </h3>
                <button
                  onClick={() => setShowTypeSheet(false)}
                  aria-label={t('common.close')}
                  className="text-white/60 hover:text-white p-1"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Voluntary kinds — recommended first */}
                {[
                  ...ruling.recommended,
                  ...VOLUNTARY_META.filter((m) => !ruling.recommended.some((r) => r.id === m.id)),
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setCategory('voluntary');
                      setKind(m.id);
                      setShowTypeSheet(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control border text-left transition-colors ${
                      category === 'voluntary' && effectiveKind === m.id
                        ? 'border-brand-emerald/50 bg-brand-emerald/10 shadow-elev-1'
                        : 'border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40 hover:bg-brand-surface'
                    }`}
                  >
                    <SheetIcon Icon={VOLUNTARY_ICON[m.id]} tone="text-brand-emerald" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-white">
                        {t(`fastingRules.voluntary.${m.id}`, m.label)}
                        {ruling.recommended.some((r) => r.id === m.id) && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-emerald/15 text-brand-emerald">
                            {t('fasting.todayTag', 'today')}
                          </span>
                        )}
                      </p>
                      <p className="text-white/70 text-xs leading-snug">
                        {t(`fastingRules.voluntaryWhen.${m.id}`, m.when)}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Obligatory categories */}
                <p className="text-white/70 text-[11px] uppercase tracking-widest font-bold pt-3">
                  {t('fasting.obligatoryMakeups', 'Obligatory make-ups')}
                </p>
                <button
                  onClick={() => {
                    setCategory('qada');
                    setShowTypeSheet(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control border text-left transition-colors ${category === 'qada' ? 'border-brand-emerald/50 bg-brand-emerald/10 shadow-elev-1' : 'border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40 hover:bg-brand-surface'}`}
                >
                  <SheetIcon Icon={CATEGORY_ICON.qada} tone="text-brand-gold" />
                  <div>
                    <p className="text-sm font-bold text-white">
                      {t('fasting.qadaMakeupDay', 'Qaḍā: make-up day')}
                      {qadaRemaining > 0 && (
                        <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold">
                          {t('fasting.nLeft', '{{count}} left', { count: qadaRemaining })}
                        </span>
                      )}
                    </p>
                    <p className="text-white/70 text-xs">
                      {t('fasting.qadaMakeupDesc', 'Making up a missed Ramaḍān day')}
                    </p>
                  </div>
                </button>
                {kaffarahActive && (
                  <button
                    onClick={() => {
                      setCategory('kaffarah');
                      setShowTypeSheet(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control border text-left transition-colors ${category === 'kaffarah' ? 'border-brand-emerald/50 bg-brand-emerald/10 shadow-elev-1' : 'border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40 hover:bg-brand-surface'}`}
                  >
                    <SheetIcon Icon={CATEGORY_ICON.kaffarah} tone="text-brand-warm" />
                    <div>
                      <p className="text-sm font-bold text-white">
                        {t('fasting.kaffarahExpiationDay', 'Kaffārah: expiation day')}
                      </p>
                      <p className="text-white/70 text-xs">
                        {t('fasting.consecutiveRun', 'Consecutive run: {{run}}/{{target}}', {
                          run: summary?.kaffarah.currentRun ?? 0,
                          target: summary?.profile.kaffarah.targetDays ?? 60,
                        })}
                      </p>
                    </div>
                  </button>
                )}
                {vows.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setCategory('nadhr');
                      setVowId(v.id);
                      setShowTypeSheet(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-control border text-left transition-colors ${category === 'nadhr' && vowId === v.id ? 'border-brand-emerald/50 bg-brand-emerald/10 shadow-elev-1' : 'border-brand-border bg-brand-surface/50 hover:border-brand-emerald/40 hover:bg-brand-surface'}`}
                  >
                    <SheetIcon Icon={CATEGORY_ICON.nadhr} tone="text-brand-info" />
                    <div>
                      <p className="text-sm font-bold text-white">
                        {t('fasting.vowLabel', 'Vow: {{title}}', { title: v.title })}
                      </p>
                      <p className="text-white/70 text-xs">
                        {t('fasting.daysDone', '{{completed}}/{{target}} days done', {
                          completed: v.completed,
                          target: v.targetDays,
                        })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
