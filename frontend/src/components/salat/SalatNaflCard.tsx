import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { NaflType, NAFL_TYPE_META, SELECTABLE_NAFL_TYPES } from '../../hooks/useSalatLog.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { MIN_RAKAT, isRamadanNow } from './salatParts.js';

export interface SalatNaflCardProps {
  getTypeRakat: (type: NaflType) => number;
  handleNaflToggle: () => void;
  handleNaflTypeToggle: (type: NaflType) => void;
  handleTypeRakat: (type: NaflType, delta: number) => void;
  isLoading: boolean;
  naflEntry: import('../../hooks/useSalatLog.js').NaflEntry;
  naflExpanded: boolean;
  naflInfoExpanded: NaflType | null;
  naflTotalRakat: number;
  setNaflExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setNaflInfoExpanded: React.Dispatch<React.SetStateAction<NaflType | null>>;
}

export default function SalatNaflCard({
  getTypeRakat,
  handleNaflToggle,
  handleNaflTypeToggle,
  handleTypeRakat,
  isLoading,
  naflEntry,
  naflExpanded,
  naflInfoExpanded,
  naflTotalRakat,
  setNaflExpanded,
  setNaflInfoExpanded,
}: SalatNaflCardProps) {
  const { t, i18n } = useTranslation();
  return (
    <>
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          layout
          className={`rounded-2xl border overflow-hidden transition-colors ${
            naflEntry.completed
              ? 'bg-brand-info/10 border-brand-info/40'
              : 'bg-brand-surface border-brand-border'
          }`}
        >
          {/* Header row */}
          <div className="p-3.5 flex items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl shrink-0">📿</span>
              <div className="min-w-0">
                <p
                  className={`font-bold text-sm leading-none ${naflEntry.completed ? 'text-brand-info' : 'text-white/60'}`}
                >
                  {t('salatTracker.naflPrayer', 'Nafl Prayer')}
                </p>
                <p className="text-white/25 text-xs mt-0.5">
                  {naflEntry.completed && (naflEntry.types?.length ?? 0) > 0
                    ? naflEntry.types
                        .map((nt) => {
                          const m = NAFL_TYPE_META.find((mm) => mm.id === nt);
                          return m ? translateSalatName(m.id, m.label, t) : null;
                        })
                        .filter(Boolean)
                        .join(', ')
                    : t('salatTracker.voluntaryPrayers', 'voluntary prayers')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {naflEntry.completed && naflTotalRakat > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-brand-info/15 text-brand-info text-xs font-black tabular-nums">
                  {t('salatTracker.rakatCount', "{{count}} rak'ah", {
                    count: naflTotalRakat,
                  })}
                </span>
              )}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleNaflToggle}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  naflEntry.completed
                    ? 'bg-brand-info text-white border-brand-info shadow-[0_0_12px_rgba(90,158,142,0.35)]'
                    : 'bg-brand-deep border-brand-border text-white/50 hover:border-brand-info/50 hover:text-white/80'
                }`}
              >
                {naflEntry.completed
                  ? t('salatTracker.done', '✅ Done')
                  : t('salatTracker.markDoneBtn', 'Mark Done')}
              </motion.button>
            </div>
          </div>

          {/* Expanded: tile grid + rak'ah counter */}
          <AnimatePresence>
            {naflEntry.completed && naflExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-brand-emerald/10"
              >
                <div className="px-3 py-3 space-y-3">
                  <p className="text-white/30 text-[11px] font-bold uppercase tracking-wider">
                    {t('salatTracker.selectWhatYouPrayed', 'Select what you prayed')}
                  </p>

                  {/* Tile grid — 2 columns on mobile, 3 on wider */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SELECTABLE_NAFL_TYPES.filter((nt) =>
                      nt.id === 'tarawih' ? isRamadanNow() : true
                    ).map((nt) => {
                      const selected = (naflEntry.types ?? []).includes(nt.id);
                      const infoOpen = naflInfoExpanded === nt.id;
                      const typeRak = getTypeRakat(nt.id);
                      const isFixed = nt.id === 'awwabin';
                      return (
                        <div key={nt.id} className="flex flex-col">
                          <motion.button
                            whileTap={{ scale: 0.94 }}
                            onClick={() => handleNaflTypeToggle(nt.id)}
                            className={`relative rounded-xl p-2.5 text-left border transition-all ${
                              selected
                                ? 'bg-brand-info/15 border-brand-info/50 shadow-[0_0_10px_rgba(90,158,142,0.15)]'
                                : 'bg-brand-deep/80 border-brand-border hover:border-white/15'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="text-lg leading-none">{nt.emoji}</span>
                              {selected && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="text-brand-info text-xs leading-none"
                                >
                                  ✓
                                </motion.span>
                              )}
                            </div>
                            <p
                              className={`text-xs font-bold mt-1.5 leading-tight ${selected ? 'text-brand-info' : 'text-white/70'}`}
                            >
                              {translateSalatName(nt.id, nt.label, t)}
                            </p>
                            <p className="text-white/20 text-[10px] mt-0.5 leading-snug">
                              {i18n.language === 'bn' && nt.shortNoteBn
                                ? nt.shortNoteBn
                                : nt.shortNote}
                            </p>
                          </motion.button>

                          {/* Per-type rak'ah counter (only when selected) */}
                          {selected && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="overflow-hidden"
                            >
                              <div className="mt-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-brand-info/[0.06] border border-brand-info/15">
                                {isFixed ? (
                                  <span className="text-brand-info/70 text-[11px] font-bold tabular-nums">
                                    {t('salatTracker.rakatCount', "{{count}} rak'ah", {
                                      count: nt.defaultRakat,
                                    })}
                                  </span>
                                ) : (
                                  <>
                                    <motion.button
                                      whileTap={{ scale: 0.85 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTypeRakat(nt.id, -1);
                                      }}
                                      disabled={typeRak <= MIN_RAKAT}
                                      className="w-6 h-6 rounded-md bg-brand-deep border border-brand-border text-white/50 font-bold text-sm flex items-center justify-center disabled:opacity-20 hover:border-brand-info/40 transition-all"
                                    >
                                      −
                                    </motion.button>
                                    <span className="text-brand-info font-black text-sm tabular-nums w-6 text-center">
                                      {typeRak}
                                    </span>
                                    <motion.button
                                      whileTap={{ scale: 0.85 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTypeRakat(nt.id, 1);
                                      }}
                                      className="w-6 h-6 rounded-md bg-brand-deep border border-brand-border text-white/50 font-bold text-sm flex items-center justify-center hover:border-brand-info/40 transition-all"
                                    >
                                      +
                                    </motion.button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          )}

                          {/* Info toggle */}
                          <button
                            onClick={() => setNaflInfoExpanded(infoOpen ? null : nt.id)}
                            className="mt-0.5 text-white/15 hover:text-white/40 text-[10px] text-center transition-colors"
                          >
                            {infoOpen
                              ? t('salatTracker.hide', '▲ hide')
                              : t('salatTracker.about', 'ⓘ about')}
                          </button>
                          <AnimatePresence>
                            {infoOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-1 p-2.5 rounded-xl bg-brand-deep border border-brand-emerald/10 space-y-1">
                                  <p className="text-white/50 text-[11px] leading-relaxed">
                                    {i18n.language === 'bn' && nt.fullNoteBn
                                      ? nt.fullNoteBn
                                      : nt.fullNote}
                                  </p>
                                  <p className="text-white/25 text-[11px] italic">
                                    {i18n.language === 'bn' && nt.hadithBn
                                      ? nt.hadithBn
                                      : nt.hadith}
                                  </p>
                                  <a
                                    href={nt.hadithUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-info/50 text-[11px] underline hover:text-brand-info/80"
                                  >
                                    📖 sunnah.com
                                  </a>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand toggle */}
          {naflEntry.completed && (
            <button
              onClick={() => setNaflExpanded(!naflExpanded)}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 border-t border-brand-emerald/5 text-white/20 hover:text-white/50 text-xs transition-colors"
            >
              {naflExpanded
                ? t('salatTracker.less', '▲ Less')
                : t('salatTracker.details', '▾ Details')}
              {!naflExpanded && (naflEntry.types?.length ?? 0) > 0 && (
                <span className="text-brand-info/50 text-xs">
                  {naflEntry.types
                    .map((nt) => NAFL_TYPE_META.find((m) => m.id === nt)?.emoji)
                    .join(' ')}
                </span>
              )}
            </button>
          )}
        </motion.div>
      )}
    </>
  );
}
