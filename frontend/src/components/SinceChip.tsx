import { useTranslation } from 'react-i18next';
import { formatDayLabel } from '../utils/localeDate.js';

/** "Since 8 Oct 2026": shown over an area's stats after a fresh start (U7). */
export default function SinceChip({ since }: { since?: string | null }) {
  const { t } = useTranslation();
  if (!since) return null;
  return (
    <p className="text-white/75 text-xs" data-testid="since-chip">
      <span className="rounded-full bg-brand-emerald/15 text-brand-emerald font-bold px-2.5 py-0.5 text-[11px]">
        {t('freshStart.sinceChip', { date: formatDayLabel(since) })}
      </span>{' '}
      {t('freshStart.sinceNote')}
    </p>
  );
}
