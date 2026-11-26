import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { BTN_DANGER_QUIET } from './settingsParts.js';

/** The prayer location saved in this browser, with its Clear button. */
export function SavedLocationRow({
  savedLocation,
  setSavedLocation,
}: {
  savedLocation: string | null;
  setSavedLocation: (name: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 p-3 rounded-control border border-brand-border bg-brand-surface/50 mb-5">
      <MapPinIcon className="w-5 h-5 shrink-0 text-brand-emerald" />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold">{t('settings.prayerLocation')}</p>
        <p className="text-white/70 text-[11px] truncate">
          {savedLocation
            ? t('settings.locationSet', { name: savedLocation })
            : t('settings.locationNotSet')}
        </p>
      </div>
      {savedLocation && (
        <button
          onClick={() => {
            localStorage.removeItem('bustandeen_location');
            setSavedLocation(null);
            toast.success(t('settings.toast.locationCleared', 'Saved location cleared.'));
          }}
          className={`${BTN_DANGER_QUIET} shrink-0`}
        >
          {t('settings.clearLocation')}
        </button>
      )}
    </div>
  );
}
