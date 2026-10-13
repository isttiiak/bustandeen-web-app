import { useTranslation } from 'react-i18next';
import { DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { formatLocaleNumber } from '../../utils/localeDate.js';

// U10: counting is never interrupted for a guest. After the first tap this
// note says the counts are only on this device; they are kept through
// sign-in on the same browser (the persisted `pending` taps, flushed by
// App.tsx once the account is there), and "Save them" opens the sheet.
export default function ZikrGuestNote({ count, onSave }: { count: number; onSave: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-3 rounded-control border border-brand-gold/30 bg-brand-gold/10 pl-4 pr-1.5 py-1.5"
      role="status"
      data-testid="zikr-guest-note"
    >
      <DevicePhoneMobileIcon className="w-5 h-5 shrink-0 text-brand-gold" aria-hidden="true" />
      <p className="flex-1 text-sm text-white/85 leading-snug">
        {t('signInGate.zikrNote', { n: formatLocaleNumber(count) })}
      </p>
      <button
        type="button"
        onClick={onSave}
        className="shrink-0 min-h-[44px] rounded-control px-3 text-sm font-bold text-brand-gold hover:bg-brand-gold/10 transition-colors"
      >
        {t('signInGate.saveThem')}
      </button>
    </div>
  );
}
