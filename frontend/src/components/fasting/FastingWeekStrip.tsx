import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { friendlyDate } from './fastingParts.js';

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
              ? '#7a9e6e'
              : dayLog?.status === 'intended'
                ? '#5a9e8e'
                : dayLog?.status === 'broken'
                  ? '#f87171'
                  : 'rgba(255,255,255,0.12)';
          return (
            <motion.button
              key={d}
              whileTap={{ scale: 0.9 }}
              onClick={() => setSelectedDate(d)}
              aria-label={t('fasting.selectDay', 'Select {{day}}', { day: friendlyDate(d, t) })}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border transition-all ${
                isSel
                  ? 'bg-white/10 border-brand-emerald/30'
                  : 'bg-white/[0.03] border-brand-emerald/5 hover:border-brand-emerald/20'
              }`}
            >
              <span
                className={`text-[9px] uppercase font-bold ${isTod ? 'text-brand-emerald' : 'text-white/30'}`}
              >
                {d === tomorrow
                  ? '+1'
                  : formatLocaleDate(new Date(d + 'T12:00:00'), { weekday: 'narrow' })}
              </span>
              <span className={`text-xs font-bold ${isSel ? 'text-white' : 'text-white/50'}`}>
                {parseInt(d.slice(8), 10)}
              </span>
              <motion.span
                layout
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: dot, boxShadow: dayLog ? `0 0 6px ${dot}` : 'none' }}
              />
            </motion.button>
          );
        })}
      </div>
    </>
  );
}
