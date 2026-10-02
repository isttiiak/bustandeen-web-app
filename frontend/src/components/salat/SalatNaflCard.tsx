import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { NaflType, NAFL_TYPE_META, SELECTABLE_NAFL_TYPES } from '../../hooks/useSalatLog.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { CheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { PrayerGlyph, TasbihIcon } from '../icons/IslamicIcons.js';
import { MIN_RAKAT, isRamadanNow, DisclosureLabel, RefIcon } from './salatParts.js';

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
          className={`rounded-card border overflow-hidden shadow-elev-1 hover:shadow-hover transition-[border-color,box-shadow] ${
            naflEntry.completed
              ? 'bg-brand-info/[0.07] border-brand-info/40'
              : 'bg-brand-deep border-brand-border'
          }`}
        >
          {/* Header row */}
          <div className="p-3.5 flex items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span
                className={`w-10 h-10 shrink-0 rounded-full border flex items-center justify-center ${
                  naflEntry.completed
                    ? 'border-brand-info/50 text-brand-info'
                    : 'border-brand-border text-white/70'
                }`}
              >
                <TasbihIcon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p
                  className={`font-bold text-sm leading-none ${naflEntry.completed ? 'text-brand-info' : 'text-white/70'}`}
                >
                  {t('salatTracker.naflPrayer', 'Nafl Prayer')}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
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
                aria-pressed={naflEntry.completed}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-control text-xs font-bold border transition-colors ${
                  naflEntry.completed
                    ? 'bg-brand-info/20 border-brand-info text-brand-info'
                    : 'bg-brand-deep border-brand-border text-white/60 hover:border-brand-info/50 hover:text-white'
                }`}
              >
                {naflEntry.completed && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                {naflEntry.completed
                  ? t('salatTracker.done', 'Done')
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
                className="overflow-hidden border-t border-brand-border/70"
              >
                <div className="px-3 py-3 space-y-3">
                  <p className="text-white/60 text-[11px] font-bold uppercase tracking-wider">
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
                            aria-pressed={selected}
                            className={`relative rounded-control p-2.5 text-left border transition-colors ${
                              selected
                                ? 'bg-brand-info/15 border-brand-info/50'
                                : 'bg-brand-deep border-brand-border hover:border-brand-info/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <PrayerGlyph
                                id={nt.id}
                                className={`w-5 h-5 ${selected ? 'text-brand-info' : 'text-white/60'}`}
                              />
                              {selected && (
                                <CheckIcon
                                  className="w-3.5 h-3.5 text-brand-info"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <p
                              className={`text-xs font-bold mt-1.5 leading-tight ${selected ? 'text-brand-info' : 'text-white/70'}`}
                            >
                              {translateSalatName(nt.id, nt.label, t)}
                            </p>
                            <p className="text-white/50 text-[10px] mt-0.5 leading-snug">
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
                                      aria-label={t('salatTracker.fewerRakat', 'Fewer rakʿah')}
                                      className="w-6 h-6 rounded-md bg-brand-deep border border-brand-border text-white/60 font-bold text-sm flex items-center justify-center disabled:opacity-20 hover:border-brand-info/40 transition-colors"
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
                                      aria-label={t('salatTracker.moreRakat', 'More rakʿah')}
                                      className="w-6 h-6 rounded-md bg-brand-deep border border-brand-border text-white/60 font-bold text-sm flex items-center justify-center hover:border-brand-info/40 transition-colors"
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
                            aria-expanded={infoOpen}
                            className="mt-0.5 inline-flex items-center justify-center gap-1 text-white/50 hover:text-white text-[10px] transition-colors"
                          >
                            {!infoOpen && (
                              <InformationCircleIcon className="w-3 h-3" aria-hidden="true" />
                            )}
                            {infoOpen
                              ? t('salatTracker.hide', 'hide')
                              : t('salatTracker.about', 'about')}
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
                                <div className="mt-1 p-2.5 rounded-control bg-brand-deep border border-brand-border space-y-1">
                                  <p className="text-white/70 text-[11px] leading-relaxed">
                                    {i18n.language === 'bn' && nt.fullNoteBn
                                      ? nt.fullNoteBn
                                      : nt.fullNote}
                                  </p>
                                  <p className="text-white/60 text-[11px] italic">
                                    {i18n.language === 'bn' && nt.hadithBn
                                      ? nt.hadithBn
                                      : nt.hadith}
                                  </p>
                                  <a
                                    href={nt.hadithUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-info/80 text-[11px] underline hover:text-brand-info"
                                  >
                                    <RefIcon />
                                    sunnah.com
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
              aria-expanded={naflExpanded}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 border-t border-brand-border/50 text-white/50 hover:text-white text-xs transition-colors"
            >
              <DisclosureLabel open={naflExpanded} />
              {!naflExpanded &&
                (naflEntry.types ?? []).map((nt) => (
                  <PrayerGlyph key={nt} id={nt} className="w-3.5 h-3.5 text-brand-info" />
                ))}
            </button>
          )}
        </motion.div>
      )}
    </>
  );
}
