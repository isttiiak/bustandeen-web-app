import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { todayStr, weekDotColor, friendlyDate } from './salatParts.js';

export interface SalatWeekStripProps {
  calendarOpen: boolean;
  selectedDate: string;
  setCalMonth: React.Dispatch<React.SetStateAction<string>>;
  setCalendarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setExpandedPrayer: React.Dispatch<
    React.SetStateAction<import('../../hooks/useSalatLog.js').PrayerId | null>
  >;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  weekDays: { date: string; completed: number; total: number }[];
}

export default function SalatWeekStrip({
  calendarOpen,
  selectedDate,
  setCalMonth,
  setCalendarOpen,
  setExpandedPrayer,
  setSelectedDate,
  weekDays,
}: SalatWeekStripProps) {
  const { t } = useTranslation();
  return (
    <>
      {weekDays.length > 0 && (
        <div className="flex items-stretch gap-1">
          {weekDays.map((d) => {
            const isSel = d.date === selectedDate;
            const isTod = d.date === todayStr();
            const isFutureDay = d.date > todayStr();
            const hasData = !isFutureDay;
            const dot = hasData ? weekDotColor(d.completed) : 'rgba(255,255,255,0.12)';
            return (
              <motion.button
                key={d.date}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setSelectedDate(d.date);
                  setExpandedPrayer(null);
                  setCalendarOpen(false);
                }}
                aria-label={t('salatTracker.selectDay', 'Select {{day}}', {
                  day: friendlyDate(d.date, t),
                })}
                className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                  isSel
                    ? 'bg-white/10 border-brand-emerald/30'
                    : 'bg-white/[0.03] border-brand-emerald/5 hover:border-brand-emerald/20'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold ${isTod ? 'text-brand-emerald' : 'text-white/30'}`}
                >
                  {formatLocaleDate(new Date(d.date + 'T12:00:00'), { weekday: 'narrow' })}
                </span>
                <span className={`text-xs font-bold ${isSel ? 'text-white' : 'text-white/50'}`}>
                  {formatLocaleNumber(parseInt(d.date.slice(8), 10))}
                </span>
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: dot, boxShadow: hasData ? `0 0 6px ${dot}` : 'none' }}
                />
              </motion.button>
            );
          })}
          {/* Calendar toggle button — opens the full-month view */}
          <button
            onClick={() => {
              setCalMonth(selectedDate.substring(0, 7));
              setCalendarOpen((o) => !o);
            }}
            aria-label={t('salatTracker.openCalendar', 'Open month calendar')}
            title={t('salatTracker.openCalendar', 'Open month calendar')}
            className={`shrink-0 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl border transition-all ${
              calendarOpen
                ? 'bg-brand-emerald/20 border-brand-emerald/40 text-brand-emerald'
                : 'bg-white/[0.03] border-brand-emerald/5 text-white/40 hover:border-brand-emerald/20 hover:text-white/70'
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span className="text-[9px] font-bold uppercase">
              {formatLocaleDate(new Date(selectedDate.substring(0, 7) + '-15T12:00:00'), {
                month: 'narrow',
              })}
            </span>
          </button>
        </div>
      )}
    </>
  );
}
