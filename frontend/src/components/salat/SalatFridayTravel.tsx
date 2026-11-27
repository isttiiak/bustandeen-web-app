import { useTranslation } from 'react-i18next';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import { type PrayerId } from '../../hooks/useSalatLog.js';

/** The full-width strip for a traveller's Friday Ẓuhr. */
export default function SalatFridayTravel({
  prayerId,
  isCivilFriday,
  rowTravel,
  isJumuah,
}: {
  prayerId: PrayerId;
  isCivilFriday: boolean;
  rowTravel: boolean;
  isJumuah: boolean;
}) {
  const { t } = useTranslation();

  return (
    <>
      {prayerId === 'dhuhr' && isCivilFriday && rowTravel && !isJumuah && (
        <div className="px-3 py-1.5 border-t border-brand-info/15 bg-brand-info/5 text-[11px] sm:text-xs text-brand-info flex items-center gap-1.5">
          <BriefcaseIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {t('salatTracker.travelFriday', "Travelling: Ẓuhr instead of Jumu'ah (Muslim 1218a)")}
        </div>
      )}
    </>
  );
}
