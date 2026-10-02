import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { PrayerId } from '../../hooks/useSalatLog.js';
import { translateSalatName } from '../../utils/prayerTimes.js';
import { friendlyDate, MissedDayChips } from './salatParts.js';

export interface SalatKazaDebtCardProps {
  calendarDataMap: Map<string, number>;
  commitDebtEdit: (prayer: import('../../hooks/useSalatLog.js').PrayerId, rawValue: string) => void;
  debt: (import('../../hooks/useSalatLog.js').SalatDebt & { ok: boolean }) | undefined;
  debtDrafts: Partial<Record<import('../../hooks/useSalatLog.js').PrayerId, string>>;
  debtExpanded: boolean;
  isLoading: boolean;
  setCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setDebtDrafts: React.Dispatch<
    React.SetStateAction<Partial<Record<import('../../hooks/useSalatLog.js').PrayerId, string>>>
  >;
  setDebtExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  setExpandedPrayer: React.Dispatch<
    React.SetStateAction<import('../../hooks/useSalatLog.js').PrayerId | null>
  >;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  trackablePrayers: import('../../utils/prayerTimes.js').PrayerInfo[];
}

export default function SalatKazaDebtCard({
  calendarDataMap,
  commitDebtEdit,
  debt,
  debtDrafts,
  debtExpanded,
  isLoading,
  setCalendarOpen,
  setDebtDrafts,
  setDebtExpanded,
  setExpandedPrayer,
  setSelectedDate,
  setShowSettings,
  trackablePrayers,
}: SalatKazaDebtCardProps) {
  const { t } = useTranslation();
  return (
    <>
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28 }}
          layout
          className={`rounded-2xl border overflow-hidden transition-colors ${
            (debt?.totalOwed ?? 0) > 0
              ? 'bg-brand-gold/10 border-brand-gold/40'
              : 'bg-brand-surface border-brand-border'
          }`}
        >
          <button
            onClick={() => setDebtExpanded((v) => !v)}
            className="w-full p-3.5 flex items-center gap-3 text-left"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl shrink-0">⏳</span>
              <div className="min-w-0">
                <p
                  className={`font-bold text-sm leading-none ${(debt?.totalOwed ?? 0) > 0 ? 'text-brand-gold' : 'text-white/60'}`}
                >
                  {t('salatTracker.kazaDebtTitle', 'Kaza Debt')}
                </p>
                <p className="text-white/25 text-xs mt-0.5">
                  {(debt?.totalOwed ?? 0) > 0
                    ? t('salatTracker.kazaDebtOwed', '{{count}} prayers owed', {
                        count: debt?.totalOwed ?? 0,
                      })
                    : t('salatTracker.kazaDebtNone', 'Nothing owed — MashaAllah')}
                  {debt?.since && (
                    <span className="text-white/15">
                      {' · '}
                      {t('salatTracker.kazaDebtSince', 'since {{date}}', {
                        date: friendlyDate(debt.since, t),
                      })}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <span className="text-white/20 text-xs shrink-0">
              {debtExpanded
                ? t('salatTracker.less', '▲ Less')
                : t('salatTracker.details', '▾ Details')}
            </span>
          </button>

          <AnimatePresence>
            {debtExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-brand-emerald/10"
              >
                <div className="px-3 py-3 space-y-2">
                  <p className="text-white/30 text-[11px] leading-relaxed">
                    {t(
                      'salatTracker.kazaDebtHint',
                      "Added automatically once a prayer's day passes without it being logged — no need to tap ❌ Miss yourself. Owe some from before you started tracking? Set a starting count for each below."
                    )}
                  </p>
                  {trackablePrayers.map((prayer) => {
                    const prayerId = prayer.id as PrayerId;
                    const owed = debt?.owed[prayerId] ?? 0;
                    const draft = debtDrafts[prayerId];
                    return (
                      <div
                        key={prayerId}
                        className="flex items-center gap-2 py-1.5 border-t border-brand-emerald/5 first:border-t-0"
                      >
                        <span className="text-lg shrink-0">{prayer.icon}</span>
                        <span className="text-white/60 text-xs font-semibold flex-1 min-w-0 truncate">
                          {translateSalatName(prayer.id, prayer.name, t)}
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={9999}
                          value={draft ?? String(owed)}
                          title={t('salatTracker.kazaDebtSetCount', 'Set exact count')}
                          onChange={(e) =>
                            setDebtDrafts((d) => ({ ...d, [prayerId]: e.target.value }))
                          }
                          onBlur={(e) => commitDebtEdit(prayerId, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') e.currentTarget.blur();
                            if (e.key === 'Escape') {
                              setDebtDrafts((d) => {
                                const next = { ...d };
                                delete next[prayerId];
                                return next;
                              });
                              e.currentTarget.blur();
                            }
                          }}
                          className={`w-14 px-2 py-1 rounded-lg bg-brand-deep border text-xs text-center font-bold tabular-nums ${
                            owed > 0
                              ? 'border-brand-gold/40 text-brand-gold'
                              : 'border-brand-border text-white/50'
                          }`}
                        />
                      </div>
                    );
                  })}
                  {/* Shortcut: clickable missed-day chips so the user can
                      jump straight to a past day and mark kaza, without
                      multiple nav clicks. Uses the 90-day calendar data
                      already fetched (completed < 5 = at least one gap). */}
                  <MissedDayChips
                    calendarDataMap={calendarDataMap}
                    t={
                      t as (key: string, fallback: string, opts?: Record<string, unknown>) => string
                    }
                    setSelectedDate={setSelectedDate}
                    setExpandedPrayer={setExpandedPrayer}
                    setCalendarOpen={setCalendarOpen}
                  />

                  {(debt?.totalOwed ?? 0) > 0 && (
                    <div className="pt-2.5 mt-1 border-t border-brand-emerald/5">
                      <button
                        onClick={() => setShowSettings(true)}
                        className="text-brand-gold/60 hover:text-brand-gold text-[11px] underline underline-offset-2"
                      >
                        {t('salatTracker.kazaDebtResetPointer', '🌱 Reset it in ⚙️ Salat settings')}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
