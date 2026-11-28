import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HomeIcon } from '@heroicons/react/24/outline';
import { useZikrStore } from '../../store/useZikrStore.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import {
  getQuickZikr,
  QUICK_MAX_COUNT,
  setQuickZikr,
  type QuickZikr,
} from '../../utils/zikrQuick.js';

/** Zikr settings → the three dhikr chips on Home
 *  (T3.4 E, Istiak 2026-10-09; the tap asks first since 2026-11-28). */
export default function ZikrQuickSettings() {
  const { t, i18n } = useTranslation();
  const types = useZikrStore((s) => s.types);
  const [chips, setChips] = useState<QuickZikr[]>(getQuickZikr);
  const [drafts, setDrafts] = useState<string[]>(() => chips.map((c) => String(c.count)));

  const save = (next: QuickZikr[]) => {
    setChips(next);
    setQuickZikr(next);
  };
  const setName = (i: number, name: string) =>
    save(chips.map((c, j) => (j === i ? { ...c, name } : c)));
  const commitCount = (i: number) => {
    const n = Number(drafts[i]);
    if (Number.isInteger(n) && n >= 1 && n <= QUICK_MAX_COUNT) {
      save(chips.map((c, j) => (j === i ? { ...c, count: n } : c)));
    } else {
      setDrafts((d) => d.map((v, j) => (j === i ? String(chips[i]!.count) : v)));
    }
  };
  // A chip's dhikr may have been removed from the list: keep it selectable.
  const options = (current: string) => (types.includes(current) ? types : [current, ...types]);

  return (
    <section className="rounded-card border border-brand-border bg-brand-surface/50 shadow-elev-1 p-4">
      <div className="flex items-center gap-2">
        <HomeIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
        <h3 className="text-white font-bold text-sm">
          {t('zikr.quick.title', 'Quick dhikr on Home')}
        </h3>
      </div>
      <p className="text-white/75 text-xs leading-relaxed mt-2">
        {t('zikr.quick.desc', 'Three dhikr on the Home Zikr section, each with its number.')}
      </p>
      <div className="mt-3 space-y-2">
        {chips.map((c, i) => (
          <div key={i} className="flex items-center gap-2" data-quick-slot={i}>
            <select
              value={c.name}
              onChange={(e) => setName(i, e.target.value)}
              aria-label={t('zikr.quick.slot', 'Quick dhikr {{n}}', {
                n: formatLocaleNumber(i + 1),
              })}
              className="select select-sm flex-1 min-w-0 bg-brand-deep border-brand-border text-white text-xs"
            >
              {options(c.name).map((name) => (
                <option key={name} value={name}>
                  {zikrDisplayName(name, i18n.language)}
                </option>
              ))}
            </select>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={QUICK_MAX_COUNT}
              value={drafts[i] ?? ''}
              onChange={(e) => setDrafts((d) => d.map((v, j) => (j === i ? e.target.value : v)))}
              onBlur={() => commitCount(i)}
              aria-label={t('zikr.quick.count', 'Number for quick dhikr {{n}}', {
                n: formatLocaleNumber(i + 1),
              })}
              className="input input-sm w-20 bg-brand-deep border-brand-border text-white text-xs tabular-nums"
            />
          </div>
        ))}
      </div>
      <p className="text-white/70 text-xs leading-relaxed mt-3">
        {t(
          'zikr.quick.askNote',
          'Tapping one on Home asks first: open the counter with that number as the target, or add it to your list.'
        )}
      </p>
    </section>
  );
}
