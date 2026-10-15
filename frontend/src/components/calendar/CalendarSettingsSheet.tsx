import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  AdjustmentsHorizontalIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import LocationPicker from '../LocationPicker.js';
import HijriDateSetting from '../settings/HijriDateSetting.js';
import Switch from '../Switch.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  OPTION_OFF,
  OPTION_ON,
  SECTION_TITLE,
} from '../bustanStyles.js';
import type { CalendarPrefs } from '../../utils/calendarPrefs.js';
import type { CalendarKind } from '../../utils/calendarMonth.js';
import type { StoredLocation } from '../../utils/geocode.js';
import { gregLabel } from './calendarText.js';

const KINDS: readonly CalendarKind[] = ['greg', 'hijri', 'bn'];

/** The settings drawer of the Islamic calendar (same pattern as Prayer time settings). */
export default function CalendarSettingsSheet({
  open,
  onClose,
  prefs,
  onPrefs,
  holidaysHint,
  holidaySourceLinks,
  placeName,
  onLocation,
  onHijriChange,
  onRequestCalendar,
}: {
  open: boolean;
  onClose: () => void;
  prefs: CalendarPrefs;
  onPrefs: (p: Partial<CalendarPrefs>) => void;
  /** "Bangladesh, official list: 2026", or that the country has none. */
  holidaysHint: string;
  /** Where the holiday lists come from (shown as links under the switches). */
  holidaySourceLinks: { year: number; title: string; url: string }[];
  placeName: string | null;
  onLocation: (loc: StoredLocation) => void;
  onHijriChange: () => void;
  /** Set when the country has no holiday list: "Request your country's calendar". */
  onRequestCalendar?: () => void;
}) {
  const { t } = useTranslation();
  const [changingPlace, setChangingPlace] = useState(false);

  // On first, then the others in their order: the order is what a day shows.
  const rows = [...prefs.layers, ...KINDS.filter((k) => !prefs.layers.includes(k))];
  const toggleLayer = (k: CalendarKind) => {
    const on = prefs.layers.includes(k);
    if (on && prefs.layers.length === 1) return;
    onPrefs({ layers: on ? prefs.layers.filter((x) => x !== k) : [...prefs.layers, k] });
  };
  const move = (k: CalendarKind, by: -1 | 1) => {
    const i = prefs.layers.indexOf(k);
    const j = i + by;
    if (i < 0 || j < 0 || j >= prefs.layers.length) return;
    const next = [...prefs.layers];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onPrefs({ layers: next });
  };
  const weekday = (w: number, style: 'short' | 'long') =>
    gregLabel(`2026-10-${String(11 + w).padStart(2, '0')}`, { weekday: style });

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[65] bg-black/70 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-sm bg-brand-deep border-l border-brand-border shadow-elev-3 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={t('calendar.settings')}
            data-testid="calendar-settings"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3 bg-brand-deep/95 backdrop-blur border-b border-brand-border">
              <h2 className="font-display text-white font-bold text-lg flex items-center gap-2">
                <AdjustmentsHorizontalIcon
                  className="w-5 h-5 text-brand-emerald"
                  aria-hidden="true"
                />
                {t('calendar.settings')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('calendar.close')}
                className="w-11 h-11 grid place-items-center rounded-control text-white/70 hover:text-white hover:bg-brand-surface"
              >
                <XMarkIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              {/* Calendars, in order */}
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.sCalendars')}</h3>
                <p className="text-xs text-white/70">{t('calendar.sCalendarsHint')}</p>
                {rows.map((k) => {
                  const on = prefs.layers.includes(k);
                  const last = on && prefs.layers.length === 1;
                  const i = prefs.layers.indexOf(k);
                  const name = t(`calendar.calLong.${k}`);
                  return (
                    <div key={k} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-disabled={last}
                        onClick={() => toggleLayer(k)}
                        className={`flex-1 min-h-[52px] flex items-center gap-3 rounded-control border px-3 py-2 text-left transition-colors ${
                          on ? OPTION_ON : OPTION_OFF
                        } ${last ? 'cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`w-5 h-5 shrink-0 grid place-items-center rounded-[6px] border-2 ${
                            on ? 'bg-brand-emerald border-brand-emerald' : 'border-brand-border'
                          }`}
                        >
                          {on && (
                            <CheckIcon className="w-3.5 h-3.5 text-brand-deep" aria-hidden="true" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-semibold">{name}</span>
                          {(last || k === 'bn') && (
                            <span className="block text-xs text-white/70">
                              {last ? t('calendar.sLastOne') : t('calendar.sBnHint')}
                            </span>
                          )}
                        </span>
                      </button>
                      {on && prefs.layers.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => move(k, -1)}
                            disabled={i === 0}
                            aria-label={t('calendar.moveUp', { name })}
                            className="w-11 h-11 grid place-items-center rounded-control border border-brand-border text-white/80 disabled:opacity-40"
                          >
                            <ChevronUpIcon className="w-4 h-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(k, 1)}
                            disabled={i === prefs.layers.length - 1}
                            aria-label={t('calendar.moveDown', { name })}
                            className="w-11 h-11 grid place-items-center rounded-control border border-brand-border text-white/80 disabled:opacity-40"
                          >
                            <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
                          </button>
                        </>
                      )}
                    </div>
                  );
                })}
              </section>

              {/* What to show */}
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.sShow')}</h3>
                {(
                  [
                    ['islamic', t('calendar.sIslamic'), t('calendar.sIslamicHint')],
                    ['holidays', t('calendar.sHolidays'), holidaysHint],
                    ['national', t('calendar.sNational'), t('calendar.sNationalHint')],
                  ] as const
                ).map(([key, label, hint]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 min-h-[52px] rounded-control border border-brand-border bg-brand-surface/40 px-3 py-2 cursor-pointer"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-white">{label}</span>
                      <span className="block text-xs text-white/70">{hint}</span>
                    </span>
                    <Switch
                      checked={prefs.show[key]}
                      onChange={(e) =>
                        onPrefs({ show: { ...prefs.show, [key]: e.target.checked } })
                      }
                      aria-label={label}
                    />
                  </label>
                ))}
                {onRequestCalendar && (
                  <button
                    type="button"
                    onClick={onRequestCalendar}
                    className="inline-flex items-center min-h-[44px] text-xs font-bold text-brand-gold underline underline-offset-2"
                    data-testid="calendar-settings-request"
                  >
                    {t('calendar.rOpen')}
                  </button>
                )}
                {holidaySourceLinks.length > 0 && (
                  <div
                    className="text-xs text-white/70 space-y-1"
                    data-testid="calendar-holiday-sources"
                  >
                    <p className="font-semibold">{t('calendar.sHolidaySources')}</p>
                    <ul>
                      {holidaySourceLinks.map((s) => (
                        <li key={s.url}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center min-h-[44px] underline underline-offset-2 text-brand-gold"
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              {/* Weekend + week start */}
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.sWeekend')}</h3>
                <p className="text-xs text-white/70">{t('calendar.sWeekendHint')}</p>
                <div
                  className="grid grid-cols-7 gap-1"
                  role="group"
                  aria-label={t('calendar.sWeekend')}
                >
                  {[0, 1, 2, 3, 4, 5, 6]
                    .map((i) => (i + prefs.weekStart) % 7)
                    .map((w) => {
                      const on = prefs.weekend.includes(w);
                      return (
                        <button
                          key={w}
                          type="button"
                          aria-pressed={on}
                          aria-label={weekday(w, 'long')}
                          onClick={() =>
                            onPrefs({
                              weekend: on
                                ? prefs.weekend.filter((x) => x !== w)
                                : [...prefs.weekend, w],
                            })
                          }
                          className={`min-h-[44px] rounded-control border text-xs font-bold transition-colors ${
                            on ? 'bg-brand-warm/15 border-brand-warm text-brand-warm' : OPTION_OFF
                          }`}
                        >
                          {weekday(w, 'short')}
                        </button>
                      );
                    })}
                </div>
                <h3 className={`${SECTION_TITLE} pt-2`}>{t('calendar.sWeekStart')}</h3>
                <div
                  className="grid grid-cols-3 gap-2"
                  role="group"
                  aria-label={t('calendar.sWeekStart')}
                >
                  {[6, 0, 1].map((w) => (
                    <button
                      key={w}
                      type="button"
                      aria-pressed={prefs.weekStart === w}
                      onClick={() => onPrefs({ weekStart: w })}
                      className={`min-h-[44px] rounded-control border text-sm font-bold transition-colors ${
                        prefs.weekStart === w ? OPTION_ON : OPTION_OFF
                      }`}
                    >
                      {weekday(w, 'long')}
                    </button>
                  ))}
                </div>
              </section>

              {/* The Hijri date (the same setting as Settings) */}
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('settings.hijriSection')}</h3>
                <p className="text-xs text-white/70">{t('settings.hijriSubtitle')}</p>
                <HijriDateSetting onChange={onHijriChange} />
              </section>

              {/* Location (on this device) */}
              <section className="space-y-2">
                <h3 className={SECTION_TITLE}>{t('calendar.sLocation')}</h3>
                <div className="flex items-center gap-3 rounded-control border border-brand-border bg-brand-surface/40 px-3 py-2.5">
                  <MapPinIcon className="w-5 h-5 text-brand-emerald shrink-0" aria-hidden="true" />
                  <span className="flex-1 min-w-0 text-sm font-semibold text-white truncate">
                    {placeName ?? t('calendar.sLocationNone')}
                  </span>
                </div>
                {changingPlace ? (
                  <LocationPicker
                    onLocationChange={(loc) => {
                      onLocation(loc);
                      setChangingPlace(false);
                      toast.success(t('calendar.sLocationUpdated'), { duration: 1800 });
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setChangingPlace(true)}
                    className={`${BTN_SECONDARY} w-full`}
                  >
                    {t('calendar.sChangeLocation')}
                  </button>
                )}
                <p className="text-xs text-white/70 leading-relaxed">
                  {t('calendar.sLocationHint')}
                </p>
              </section>

              <button type="button" onClick={onClose} className={`${BTN_PRIMARY} w-full`}>
                {t('calendar.done')}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
