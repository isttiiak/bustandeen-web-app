import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore.js';
import NaturalLogModal from './NaturalLogModal.js';

/** Entry point for natural-language logging — self-gated on aiEnabled, same
 * pattern as MuhasabahReport/ComebackNudge, so dropping it into a page needs
 * no extra prop-threading. */
export default function NaturalLogEntry() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const [open, setOpen] = useState(false);

  if (!user || !aiEnabled) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-brand-border bg-brand-deep/60 hover:bg-brand-deep px-4 py-3 flex items-center gap-3 text-left transition-colors"
      >
        <span className="text-xl">✨</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">
            {t('naturalLog.entryTitle', 'Quick log with a sentence')}
          </p>
          <p className="text-white/40 text-xs truncate">
            {t('naturalLog.entryHint', 'e.g. "Prayed fajr in jamaah, read 5 pages, 100 istighfar"')}
          </p>
        </div>
      </button>
      {open && <NaturalLogModal onClose={() => setOpen(false)} />}
    </>
  );
}
