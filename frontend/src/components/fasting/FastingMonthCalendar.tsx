import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatLocaleDate } from '../../utils/localeDate.js';

export interface FastingMonthCalendarProps {
  calMonth: string;
  calendarOpen: boolean;
  logsByDate: Record<string, { status: string; category: string }>;
  selectedDate: string;
  setCalMonth: React.Dispatch<React.SetStateAction<string>>;
  setCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  today: string;
  tomorrow: string;
}

export default function FastingMonthCalendar({
  calMonth,
  calendarOpen,
  logsByDate,
  selectedDate,
  setCalMonth,
  setCalendarOpen,
  setSelectedDate,
  today,
  tomorrow,
}: FastingMonthCalendarProps) {
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
            <div className="rounded-2xl border border-brand-emerald/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    const [y, m] = calMonth.split('-').map(Number);
                    const d = new Date(y!, m! - 2, 1);
                    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  aria-label={t('fasting.previousMonth', 'Previous month')}
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
                  disabled={calMonth >= today.substring(0, 7)}
                  aria-label={t('fasting.nextMonth', 'Next month')}
                  className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {t('fasting.weekdayInitials', 'SMTWTFS')
                  .split('')
                  .map((d, i) => (
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
                    const dayLog = logsByDate[dateStr];
                    const disabled = dateStr > tomorrow;
                    const isSel = dateStr === selectedDate;
                    const isTod = dateStr === today;
                    const dot =
                      dayLog?.status === 'completed'
                        ? '#7a9e6e'
                        : dayLog?.status === 'intended'
                          ? '#5a9e8e'
                          : dayLog?.status === 'broken'
                            ? '#f87171'
                            : 'transparent';
                    cells.push(
                      <button
                        key={dateStr}
                        disabled={disabled}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setCalendarOpen(false);
                        }}
                        aria-label={t('fasting.selectDate', 'Select {{date}}', {
                          date: dateStr,
                        })}
                        className={`relative h-8 rounded-lg text-xs font-semibold transition-all ${
                          isSel
                            ? 'bg-brand-emerald/25 text-brand-emerald border border-brand-emerald/50'
                            : isTod
                              ? 'bg-white/10 text-white border border-brand-emerald/20'
                              : disabled
                                ? 'text-white/15 cursor-not-allowed'
                                : 'text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {d}
                        <span
                          className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                          style={{ background: dot }}
                        />
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
              <p className="text-white/25 text-[10px] mt-2">
                {t(
                  'fasting.calendarLegend',
                  'Tap any past day to view or log it — 🟢 fasted · 🔵 intended · 🔴 broken'
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
