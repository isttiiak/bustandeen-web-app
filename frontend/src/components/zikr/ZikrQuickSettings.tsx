import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HomeIcon } from '@heroicons/react/24/outline';
import { useZikrStore } from '../../store/useZikrStore.js';
import { zikrDisplayName } from '../../utils/zikrLibrary.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import {
  getQuickAction,
  getQuickZikr,
  QUICK_MAX_COUNT,
  setQuickAction,
  setQuickZikr,
  type QuickAction,
  type QuickZikr,
} from '../../utils/zikrQuick.js';

/** Zikr settings → the three dhikr chips on Home and what one tap does
 *  (T3.4 E, Istiak 2026-10-09). */
export default function ZikrQuickSettings() {
  const { t, i18n } = useTranslation();
  const types = useZikrStore((s) => s.types);
  const [chips, setChips] = useState<QuickZikr[]>(getQuickZikr);
  const [action, setAction] = useState<QuickAction>(getQuickAction);
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
  const choose = (a: QuickAction) => {
    setAction(a);
    setQuickAction(a);
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
      <div
        className="mt-3 space-y-2"
        role="radiogroup"
        aria-label={t('zikr.quick.actionLabel', 'One tap on a chip')}
      >
        <p className="text-white text-xs font-semibold">
          {t('zikr.quick.actionLabel', 'One tap on a chip')}
        </p>
        {(['open', 'add'] as const).map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={action === a}
            onClick={() => choose(a)}
            className={`w-full text-left rounded-control border px-3 py-2 text-xs transition-colors ${
              action === a
                ? 'border-brand-emerald/60 bg-brand-emerald/10 text-white'
                : 'border-brand-border text-white/80 hover:border-brand-emerald/40'
            }`}
          >
            <span className="block font-bold">
              {a === 'open'
                ? t('zikr.quick.open', 'Open the counter with that number as the target')
                : t('zikr.quick.add', 'Add that number at once')}
            </span>
            <span className="block text-white/70 mt-0.5">
              {a === 'open'
                ? t('zikr.quick.openDesc', 'You count each one yourself. The default.')
                : t('zikr.quick.addDesc', 'Logged in one tap, without counting on screen.')}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
