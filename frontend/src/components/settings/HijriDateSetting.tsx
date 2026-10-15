import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n.js';
import { OPTION_OFF, OPTION_ON } from '../bustanStyles.js';
import { useMoonSightingRecords } from '../../hooks/useMoonSighting.js';
import { useUpdateProfile } from '../../hooks/useUserProfile.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { countryName } from '../../utils/countryDefaults.js';
import { formatLocaleDate } from '../../utils/localeDate.js';
import { getTrackingDay } from '../../utils/trackingDay.js';
import {
  formatHijriDate,
  getHijriToday,
  HIJRI_COUNTRY_KEY,
  isHijriManual,
  readMoonSightingCache,
  readUserOffset,
  resolveHijriDay,
  setHijriAdjustment,
  setHijriAutomatic,
} from '../../utils/islamicCalendar.js';

// The Hijri date choice (T4.1): Automatic (the country's moon-sighting
// records) or the user's own -1 / 0 / +1. One setting with two doors:
// Settings and the Islamic calendar's settings drawer render this same part.

/** Today's Hijri date under the current choice; re-renders with the list. */
function HijriTodayLine() {
  const { t } = useTranslation();
  useMoonSightingRecords();
  const h = getHijriToday();
  return (
    <p className="text-brand-gold text-xs mt-3 font-semibold">
      {t('settings.hijriToday', 'Today:')} {h ? formatHijriDate(h) : '-'}
      <span className="text-white/70 font-normal"> · {t('settings.hijriNote')}</span>
    </p>
  );
}

/** "Automatic": the device's country record (T4.1), with what it does now. */
function HijriAutoOption({ active, onSelect }: { active: boolean; onSelect: () => void }) {
  const { t } = useTranslation();
  // Subscribed so the text updates when a newer list arrives
  useMoonSightingRecords();
  const lang = (i18n.language || 'en').split('-')[0] ?? 'en';
  const code = localStorage.getItem(HIJRI_COUNTRY_KEY);
  const country = code ? countryName(code, lang) : null;
  // What Automatic gives today, whichever option is chosen now
  const auto = resolveHijriDay({
    manual: false,
    userOffset: 0,
    country: code,
    records: readMoonSightingCache(),
    day: getTrackingDay(),
  });
  const shift =
    auto.offset <= -2
      ? t('settings.hijriShiftBehind2')
      : auto.offset < 0
        ? t('settings.hijriShiftBehind')
        : auto.offset >= 2
          ? t('settings.hijriShiftAhead2')
          : auto.offset > 0
            ? t('settings.hijriShiftAhead')
            : t('settings.hijriShiftSame');
  const detail = !country
    ? t('settings.hijriAutoNoCountry')
    : auto.record
      ? t('settings.hijriAutoRecord', {
          country,
          date: formatLocaleDate(new Date(`${auto.record.startDate}T12:00:00`), {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          shift,
        })
      : t('settings.hijriAutoNone', { country });
  return (
    <div>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={`w-full text-left p-3 rounded-control border transition-colors ${
          active ? OPTION_ON : OPTION_OFF
        }`}
      >
        <span className="block font-semibold text-sm">{t('settings.hijriAuto')}</span>
        <span className="block text-xs text-white/70 mt-0.5 leading-snug">{detail}</span>
      </button>
      {auto.record?.sourceUrl && (
        <p className="text-xs text-white/70 mt-1.5 px-1">
          {t('settings.hijriAutoSource')}:{' '}
          <a
            href={auto.record.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-brand-gold"
          >
            {new URL(auto.record.sourceUrl).hostname}
          </a>
        </p>
      )}
    </div>
  );
}

/** Automatic or -1 / 0 / +1, saved on the device and (signed in) on the profile. */
export default function HijriDateSetting({ onChange }: { onChange?: () => void }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfile();
  // null = Automatic (the country's moon-sighting record, T4.1)
  const [hijriAdj, setHijriAdjState] = useState<number | null>(() =>
    isHijriManual() ? readUserOffset() : null
  );

  const applyHijriAdj = (days: number) => {
    setHijriAdjustment(days);
    setHijriAdjState(days);
    if (user) updateProfile.mutateAsync({ hijriOffset: days }).catch(() => {});
    onChange?.();
  };
  const applyHijriAuto = () => {
    setHijriAutomatic();
    setHijriAdjState(null);
    if (user) updateProfile.mutateAsync({ hijriOffset: null }).catch(() => {});
    onChange?.();
  };

  return (
    <>
      <HijriAutoOption active={hijriAdj === null} onSelect={applyHijriAuto} />
      <p className="text-white/70 text-xs mt-3 mb-1.5">{t('settings.hijriManualLabel')}</p>
      <div className="flex items-center gap-2">
        {[-1, 0, 1].map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => applyHijriAdj(d)}
            aria-pressed={hijriAdj === d}
            className={`flex-1 min-h-[44px] whitespace-nowrap rounded-control border px-2 py-2 text-xs sm:text-sm font-bold transition-colors ${
              hijriAdj === d
                ? 'bg-brand-emerald-dim text-on-color border-brand-emerald-dim shadow-elev-1'
                : OPTION_OFF
            }`}
          >
            {d === 0
              ? t('settings.hijriDefault')
              : d > 0
                ? t('settings.hijriPlus')
                : t('settings.hijriMinus')}
          </button>
        ))}
      </div>
      <HijriTodayLine />
    </>
  );
}
