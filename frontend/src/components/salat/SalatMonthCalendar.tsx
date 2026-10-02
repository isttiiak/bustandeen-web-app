import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { todayStr } from './salatParts.js';

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
            <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    const [y, m] = calMonth.split('-').map(Number);
                    const d = new Date(y!, m! - 2, 1);
                    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10"
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
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                  <span key={i} className="text-white/25 text-[9px] font-bold uppercase">
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
                    const dot =
                      completed === 5
                        ? '#7a9e6e'
                        : completed != null && completed >= 3
                          ? '#c9a96e'
                          : completed != null && completed >= 1
                            ? '#f59e0b'
                            : completed === 0
                              ? '#ef4444'
                              : undefined;
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
                          <span className="w-1 h-1 rounded-full" style={{ background: dot }} />
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
