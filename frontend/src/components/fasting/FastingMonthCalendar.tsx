import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { CARD } from '../bustanStyles.js';
import { STATUS_TONE } from './fastingIcons.js';
import { STATUS_META } from './fastingParts.js';

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
            <div className={`${CARD} p-4`}>
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => {
                    const [y, m] = calMonth.split('-').map(Number);
                    const d = new Date(y!, m! - 2, 1);
                    setCalMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                  }}
                  aria-label={t('fasting.previousMonth', 'Previous month')}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-shade/10"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <p className="font-display text-white font-bold text-base">
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
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-shade/10 disabled:opacity-30"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {t('fasting.weekdayInitials', 'SMTWTFS')
                  .split('')
                  .map((d, i) => (
                    <span key={i} className="text-white/60 text-[10px] font-bold uppercase">
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
                        ? STATUS_TONE.completed.dot
                        : dayLog?.status === 'intended'
                          ? STATUS_TONE.intended.dot
                          : dayLog?.status === 'broken'
                            ? STATUS_TONE.broken.dot
                            : 'bg-transparent';
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
                        aria-pressed={isSel}
                        className={`relative h-9 rounded-lg text-xs font-semibold tabular-nums transition-colors ${
                          isSel
                            ? 'bg-brand-emerald/15 text-brand-emerald border border-brand-emerald/50 font-bold'
                            : isTod
                              ? 'bg-shade/10 text-white border border-brand-border font-bold'
                              : disabled
                                ? 'text-white/80 opacity-30 cursor-not-allowed'
                                : 'text-white/80 hover:bg-shade/10'
                        }`}
                      >
                        {d}
                        <span
                          className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dot}`}
                        />
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
              <p className="text-white/70 text-[11px] mt-3">
                {t('fasting.calendarLegend', 'Tap any past day to view or log it.')}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-white/80">
                {(['completed', 'intended', 'broken'] as const).map((st) => (
                  <span key={st} className="inline-flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${STATUS_TONE[st].dot}`} />
                    {t(`fasting.${st}`, STATUS_META[st].label)}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
