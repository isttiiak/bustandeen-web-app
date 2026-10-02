import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { todayStr, dayDotClass } from './salatParts.js';

export interface SalatMonthCalendarProps {
  calMonth: string;
  calendarDataMap: Map<string, number>;
  calendarOpen: boolean;
  selectedDate: string;
  setCalMonth: React.Dispatch<React.SetStateAction<string>>;
  setCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setExpandedPrayer: React.Dispatch<
    React.SetStateAction<import('../../hooks/useSalatLog.js').PrayerId | null>
  >;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
}

export default function SalatMonthCalendar({
  calMonth,
  calendarDataMap,
  calendarOpen,
  selectedDate,
  setCalMonth,
  setCalendarOpen,
  setExpandedPrayer,
  setSelectedDate,
}: SalatMonthCalendarProps) {
  const { t } = useTranslation();
  return (
    <>
      <AnimatePresence>
        {calendarOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="rounded-card border border-brand-border bg-brand-deep shadow-elev-1 p-3">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    const [y, m] = calMonth.split('-').map(Number);
                    const d = new Date(y!, m! - 2, 1);
                    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  aria-label={t('salatTracker.prevMonth', 'Previous month')}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <p className="text-white font-bold text-sm">
                  {formatLocaleDate(new Date(calMonth + '-15T12:00:00'), {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <button
                  onClick={() => {
                    const [y, m] = calMonth.split('-').map(Number);
                    const d = new Date(y!, m!, 1);
                    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  disabled={calMonth >= todayStr().substring(0, 7)}
                  aria-label={t('salatTracker.nextMonth', 'Next month')}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className="text-white/50 text-[9px] font-bold uppercase">
                    {d}
                  </span>
                ))}
                {(() => {
                  const [y, m] = calMonth.split('-').map(Number);
                  const first = new Date(y!, m! - 1, 1);
                  const daysInMonth = new Date(y!, m!, 0).getDate();
                  const blanks = first.getDay();
                  const cells = [];
                  for (let i = 0; i < blanks; i++) cells.push(<span key={`b${i}`} />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${calMonth}-${String(d).padStart(2, '0')}`;
                    const completed = calendarDataMap.get(dateStr);
                    const isFuture = dateStr > todayStr();
                    const isSel = dateStr === selectedDate;
                    const isTod = dateStr === todayStr();
                    const salatStart = localStorage.getItem('bustandeen_salat_start_date');
                    const isBeforeStart = salatStart ? dateStr < salatStart : false;
                    const dot = completed != null ? dayDotClass(completed) : undefined;
                    cells.push(
                      <button
                        key={dateStr}
                        disabled={isFuture || isBeforeStart}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setExpandedPrayer(null);
                          setCalendarOpen(false);
                        }}
                        className={`relative aspect-square rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isFuture || isBeforeStart
                            ? 'opacity-20 cursor-not-allowed'
                            : 'hover:bg-white/10 cursor-pointer'
                        } ${isSel ? 'bg-brand-emerald/25 border border-brand-emerald/50' : ''} ${isTod && !isSel ? 'border border-brand-emerald/30' : ''}`}
                      >
                        <span className={isTod ? 'text-brand-emerald' : 'text-white/70'}>
                          {formatLocaleNumber(d)}
                        </span>
                        {dot && !isFuture && !isBeforeStart && (
                          <span className={`w-1 h-1 rounded-full ${dot}`} aria-hidden="true" />
                        )}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
