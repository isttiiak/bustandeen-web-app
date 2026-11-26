import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import TrackingDayInfoModal from '../TrackingDayInfoModal.js';
import { useUpdateProfile } from '../../hooks/useUserProfile.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import {
  getDayStartMode,
  setDayStartModeLocal,
  type DayStartMode,
} from '../../utils/trackingDay.js';
import { OPTION_OFF, OPTION_ON, SectionCard } from './settingsParts.js';

/** Where the tracking day starts (Fajr, midnight or Maghrib). */
export function SettingsDayStartSection({ savedLocation }: { savedLocation: string | null }) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const updateProfile = useUpdateProfile();
  const [dayStartMode, setDayStartModeState] = useState<DayStartMode>(getDayStartMode());
  const [dayStartInfoMode, setDayStartInfoMode] = useState<DayStartMode | null>(null);

  const applyDayStartMode = (mode: DayStartMode) => {
    setDayStartModeLocal(mode);
    setDayStartModeState(mode);
    if (user) updateProfile.mutateAsync({ dayStartMode: mode }).catch(() => {});
  };

  return (
    <SectionCard
      icon={<ClockIcon className="w-5 h-5 text-brand-emerald" />}
      title={t('settings.dayStartSection')}
      subtitle={t('settings.dayStartSubtitle')}
      delay={0.11}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {(
          [
            {
              mode: 'fajr',
              label: t('settings.dayStartFajr'),
              detail: t('settings.dayStartFajrDetail'),
            },
            {
              mode: 'midnight',
              label: t('settings.dayStartMidnight'),
              detail: t('settings.dayStartMidnightDetail'),
            },
            {
              mode: 'maghrib',
              label: t('settings.dayStartMaghrib'),
              detail: t('settings.dayStartMaghribDetail'),
            },
          ] as { mode: DayStartMode; label: string; detail: string }[]
        ).map(({ mode, label, detail }) => (
          <div
            key={mode}
            className={`relative rounded-control border transition-colors ${
              dayStartMode === mode ? OPTION_ON : OPTION_OFF
            }`}
          >
            <button
              onClick={() => applyDayStartMode(mode)}
              aria-pressed={dayStartMode === mode}
              className="w-full text-left p-3 pr-9"
            >
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-white/70 mt-0.5 leading-snug">{detail}</p>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDayStartInfoMode(mode);
              }}
              className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full text-white/60 hover:text-brand-emerald hover:bg-brand-surface transition-colors"
              aria-label={t('settings.dayStartInfoAria', { option: label })}
            >
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <TrackingDayInfoModal mode={dayStartInfoMode} onClose={() => setDayStartInfoMode(null)} />
      {(dayStartMode === 'fajr' || dayStartMode === 'maghrib') && !savedLocation && (
        <p className="flex items-start gap-2 text-brand-gold text-xs mt-3 leading-relaxed">
          <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-px" />
          {t('settings.dayStartLocationNudge')}
        </p>
      )}
    </SectionCard>
  );
}
