import { useTranslation } from 'react-i18next';
import { m as motion } from 'framer-motion';
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { PERIOD_OPTIONS, type MonthSel } from './useSalatAnalyticsPage.js';

/** Title, the Stats / Journey toggle, the period selector and the month button. */
export function SalatAnalyticsControls({
  activeView,
  setActiveView,
  days,
  setDays,
  selectedMonth,
  setSelectedMonth,
  showMonthPicker,
  setShowMonthPicker,
}: {
  activeView: 'stats' | 'journey';
  setActiveView: (view: 'stats' | 'journey') => void;
  days: number;
  setDays: (days: number) => void;
  selectedMonth: MonthSel | null;
  setSelectedMonth: (month: MonthSel | null) => void;
  showMonthPicker: boolean;
  setShowMonthPicker: (update: boolean | ((v: boolean) => boolean)) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-white font-bold text-lg flex items-center gap-2">
          <ChartBarIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />{' '}
          {t('salatAnalytics.title')}
        </h1>
        <div className="tabs tabs-boxed tabs-sm bg-brand-deep border border-brand-border">
          <button
            className={`tab text-xs ${activeView === 'stats' ? 'tab-active bg-brand-emerald-dim text-on-color font-bold' : 'text-white/70'}`}
            onClick={() => setActiveView('stats')}
          >
            {t('salatAnalytics.viewStats', 'Stats')}
          </button>
          <button
            className={`tab text-xs flex items-center gap-1 ${activeView === 'journey' ? 'tab-active bg-brand-emerald-dim text-on-color font-bold' : 'text-white/70'}`}
            onClick={() => setActiveView('journey')}
          >
            <MapIcon className="w-3 h-3" />
            {t('salatAnalytics.viewJourney', 'Journey')}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="tabs tabs-boxed tabs-sm bg-brand-deep border border-brand-border">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.value}
              className={`tab text-xs ${!selectedMonth && days === p.value ? 'tab-active bg-brand-emerald-dim text-on-color font-bold' : 'text-white/70'}`}
              onClick={() => {
                setDays(p.value);
                setSelectedMonth(null);
                setShowMonthPicker(false);
              }}
            >
              {t(`salatAnalytics.period${p.value}`)}
            </button>
          ))}
        </div>
        {/* Divider + month picker toggle */}
        <div className="w-px h-5 bg-brand-border mx-1" />
        <button
          onClick={() => setShowMonthPicker((v) => !v)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-control text-xs font-semibold border transition-all ${
            selectedMonth || showMonthPicker
              ? 'bg-brand-emerald/20 border-brand-emerald/40 text-brand-emerald'
              : 'bg-brand-deep border-brand-border text-white/70 hover:text-white'
          }`}
        >
          <CalendarDaysIcon className="w-3.5 h-3.5" />
          {selectedMonth
            ? formatLocaleDate(new Date(selectedMonth.year, selectedMonth.month - 1, 15), {
                month: 'short',
                year: 'numeric',
              })
            : t('salatAnalytics.monthPicker', 'Month')}
        </button>
      </div>
    </div>
  );
}

/** The month picker panel. */
export function SalatMonthPicker({
  selectedMonth,
  setSelectedMonth,
  pickerYear,
  setPickerYear,
  setShowMonthPicker,
}: {
  selectedMonth: MonthSel | null;
  setSelectedMonth: (month: MonthSel | null) => void;
  pickerYear: number;
  setPickerYear: (update: number | ((y: number) => number)) => void;
  setShowMonthPicker: (open: boolean) => void;
}) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-card border border-brand-emerald/30 bg-brand-deep shadow-elev-2 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPickerYear((y) => y - 1)}
          className="p-2 text-white/70 hover:text-white hover:bg-brand-surface rounded-control"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="text-white font-bold text-sm">{pickerYear}</span>
        <button
          onClick={() => setPickerYear((y) => y + 1)}
          disabled={pickerYear >= currentYear}
          className="p-2 text-white/70 hover:text-white hover:bg-brand-surface rounded-control disabled:opacity-30"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const isFuture =
            pickerYear > currentYear || (pickerYear === currentYear && m > currentMonth);
          const isSelected = selectedMonth?.year === pickerYear && selectedMonth?.month === m;
          return (
            <button
              key={m}
              disabled={isFuture}
              onClick={() => {
                setSelectedMonth({ year: pickerYear, month: m });
                setShowMonthPicker(false);
              }}
              className={`py-2 rounded-control text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-brand-emerald-dim text-on-color'
                  : isFuture
                    ? 'opacity-40 cursor-not-allowed text-white/70'
                    : 'text-white/80 hover:bg-brand-surface hover:text-white'
              }`}
            >
              {formatLocaleDate(new Date(pickerYear, m - 1, 15), { month: 'short' })}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
