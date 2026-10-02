import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { formatLocaleDate, formatLocaleNumber } from '../../utils/localeDate.js';
import { todayStr, dayDotClass, friendlyDate } from './salatParts.js';

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
            const dot = hasData ? dayDotClass(d.completed) : 'bg-white/15';
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
                aria-pressed={isSel}
                className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-2 rounded-control border transition-colors ${
                  isSel
                    ? 'bg-brand-deep border-brand-emerald/50 shadow-elev-1'
                    : 'bg-brand-deep/50 border-brand-border/60 hover:border-brand-emerald/30'
                }`}
              >
                <span
                  className={`text-[9px] uppercase font-bold ${isTod ? 'text-brand-emerald' : 'text-white/50'}`}
                >
                  {formatLocaleDate(new Date(d.date + 'T12:00:00'), { weekday: 'narrow' })}
                </span>
                <span className={`text-xs font-bold ${isSel ? 'text-white' : 'text-white/70'}`}>
                  {formatLocaleNumber(parseInt(d.date.slice(8), 10))}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${dot}`}
                  title={
                    hasData
                      ? t('salatTracker.prayedOfFive', '{{done}} of {{total}} prayed', {
                          done: formatLocaleNumber(d.completed),
                          total: formatLocaleNumber(5),
                        })
                      : undefined
                  }
                  aria-hidden="true"
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
            aria-expanded={calendarOpen}
            className={`shrink-0 flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-control border transition-colors ${
              calendarOpen
                ? 'bg-brand-emerald/15 border-brand-emerald/50 text-brand-emerald'
                : 'bg-brand-deep/50 border-brand-border/60 text-white/60 hover:border-brand-emerald/30 hover:text-white'
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
