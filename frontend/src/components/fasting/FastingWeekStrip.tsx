import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { friendlyDate } from './fastingParts.js';
import { STATUS_TONE } from './fastingIcons.js';

export interface FastingWeekStripProps {
  logsByDate: Record<string, { status: string; category: string }>;
  selectedDate: string;
  setSelectedDate: React.Dispatch<React.SetStateAction<string>>;
  today: string;
  tomorrow: string;
  weekDays: string[];
}

export default function FastingWeekStrip({
  logsByDate,
  selectedDate,
  setSelectedDate,
  today,
  tomorrow,
  weekDays,
}: FastingWeekStripProps) {
  const { t } = useTranslation();
  return (
    <>
      <div className="flex justify-between gap-1 [&>*]:min-w-0">
        {weekDays.map((d) => {
          const dayLog = logsByDate[d];
          const isSel = d === selectedDate;
          const isTod = d === today;
          const dot =
            dayLog?.status === 'completed'
              ? STATUS_TONE.completed.dot
              : dayLog?.status === 'intended'
                ? STATUS_TONE.intended.dot
                : dayLog?.status === 'broken'
                  ? STATUS_TONE.broken.dot
                  : 'bg-track';
          return (
            <motion.button
              key={d}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedDate(d)}
              aria-label={t('fasting.selectDay', 'Select {{day}}', { day: friendlyDate(d, t) })}
              aria-pressed={isSel}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-control border transition-colors ${
                isSel
                  ? 'bg-brand-deep border-brand-emerald/50 shadow-elev-2'
                  : 'bg-brand-deep/60 border-brand-border hover:border-brand-emerald/40'
              }`}
            >
              <span
                className={`text-[10px] uppercase font-bold ${isTod ? 'text-brand-emerald' : 'text-white/60'}`}
              >
                {d === tomorrow
                  ? '+1'
                  : formatLocaleDate(new Date(d + 'T12:00:00'), { weekday: 'narrow' })}
              </span>
              <span
                className={`text-sm font-bold tabular-nums ${isSel ? 'text-white' : 'text-white/80'}`}
              >
                {parseInt(d.slice(8), 10)}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
