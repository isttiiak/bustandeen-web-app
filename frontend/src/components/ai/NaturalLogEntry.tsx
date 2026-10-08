import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { BTN_PRIMARY } from '../bustanStyles.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import NaturalLogModal from './NaturalLogModal.js';

/** Entry point for natural-language logging — self-gated on aiEnabled, same
 * pattern as MuhasabahReport/ComebackNudge, so dropping it into a page needs
 * no extra prop-threading. Drawn as the main action in the Naseeh hero. */
export default function NaturalLogEntry() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const [open, setOpen] = useState(false);

  if (!user || !aiEnabled) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={BTN_PRIMARY}>
        <PencilSquareIcon className="w-4 h-4" aria-hidden />
        {t('naturalLog.entryTitle', 'Quick log with a sentence')}
      </button>
      <p className="text-white/55 text-xs">
        {t('naturalLog.entryHint', 'e.g. "Prayed fajr in jamaah, read 5 pages, 100 istighfar"')}
      </p>
      {open && <NaturalLogModal onClose={() => setOpen(false)} />}
    </>
  );
}
