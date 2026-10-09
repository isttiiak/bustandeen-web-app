import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from '@heroicons/react/24/outline';
import AnimatedBackground from '../components/AnimatedBackground.js';
import Seo from '../components/Seo.js';
import { BTN_PRIMARY, BTN_SECONDARY, CARD } from '../components/bustanStyles.js';
import { MaghribIcon, SunriseIcon } from '../components/icons/IslamicIcons.js';
import { LibraryHero, OPTION_OFF, OPTION_ON } from '../components/library/libraryParts.js';
import { AdhkarText, CountRing } from '../components/library/adhkarParts.js';
import { MORNING_ADHKAR, EVENING_ADHKAR, type AdhkarItem } from '../seo/content/adhkar.js';
import { useAdhkarDay, useMarkAdhkarDone } from '../hooks/useAdhkar.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { getTrackingDay } from '../utils/trackingDay.js';
import type { AdhkarPeriod } from '../utils/todayTimeline.js';
import {
  completeItem,
  doneCount,
  firstOpenIndex,
  isItemDone,
  readAdhkarCounts,
  reopenItem,
  tapItem,
  writeAdhkarCounts,
  type AdhkarCounts,
} from '../utils/adhkarProgress.js';

const ADHKAR_ITEMS: Record<AdhkarPeriod, AdhkarItem[]> = {
  morning: MORNING_ADHKAR,
  evening: EVENING_ADHKAR,
};

/** How long a just-finished item stays on screen before the next one. */
const ADVANCE_MS = 450;

// T4.3: a guided routine. One adhkar at a time with a big tap counter that
// moves on when the count is reached; "Show all" keeps the full list. Counts
// stay on this device for the tracking day; finishing a routine marks it done
// for the day (synced), which Home's adhkar card shows. Nothing here adds to
// zikr totals, Noor or streaks.
export default function AdhkarLibrary() {
  const { t, i18n } = useTranslation();
  const lang: 'en' | 'bn' = i18n.language === 'bn' ? 'bn' : 'en';
  const user = useAuthStore((s) => s.user);
  // Home's timeline links straight to the open window (?period=evening).
  const [params] = useSearchParams();
  const [period, setPeriod] = useState<AdhkarPeriod>(
    params.get('period') === 'evening' ? 'evening' : 'morning'
  );
  const [day] = useState(() => getTrackingDay());
  const [counts, setCounts] = useState<AdhkarCounts>(() => readAdhkarCounts(day, period));
  const [showAll, setShowAll] = useState(false);
  // The item just finished, held briefly so the full ring is seen.
  const [holding, setHolding] = useState<string | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const items = ADHKAR_ITEMS[period];
  const dayQuery = useAdhkarDay(day);
  const markDone = useMarkAdhkarDone();
  const syncedDone = dayQuery.data?.[period] ?? false;

  const open = firstOpenIndex(items, counts);
  const finished = open === -1;
  const heldIndex = holding ? items.findIndex((i) => i.id === holding) : -1;
  const index = heldIndex >= 0 ? heldIndex : open;
  const item = index >= 0 ? items[index] : undefined;
  const done = doneCount(items, counts);

  useEffect(() => () => clearTimeout(holdTimer.current), []);

  // Finishing every item marks the routine done for the day, once.
  useEffect(() => {
    if (finished && user && !syncedDone && !markDone.isPending) {
      markDone.mutate({ date: day, period });
    }
  }, [finished, user, syncedDone, day, period, markDone]);

  const update = (next: AdhkarCounts) => {
    setCounts(next);
    writeAdhkarCounts(day, period, next, items);
  };

  const switchPeriod = (p: AdhkarPeriod) => {
    clearTimeout(holdTimer.current);
    setHolding(null);
    setPeriod(p);
    setCounts(readAdhkarCounts(day, p));
  };

  const tap = () => {
    if (!item || holding) return;
    const next = tapItem(item, counts);
    update(next);
    if (isItemDone(item, next)) {
      setHolding(item.id);
      holdTimer.current = setTimeout(() => setHolding(null), ADVANCE_MS);
    }
  };

  const goNext = () => {
    clearTimeout(holdTimer.current);
    setHolding(null);
    if (item && !isItemDone(item, counts)) update(completeItem(item, counts));
  };

  const goBack = () => {
    clearTimeout(holdTimer.current);
    setHolding(null);
    const prev = index > 0 ? items[index - 1] : undefined;
    if (prev) update(reopenItem(prev, counts));
  };

  return (
    <AnimatedBackground variant="dark">
      <Seo
        title={t('library.adhkarSeoTitle', 'Adhkar')}
        description={t(
          'library.adhkarSeoDescription',
          "Morning and evening adhkar: the Prophet's ﷺ remembrances for the start and end of the day."
        )}
        path="/library/adhkar"
        index={false}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-5 pb-10">
          <LibraryHero
            Icon={period === 'morning' ? SunriseIcon : MaghribIcon}
            title={t('library.adhkarTitle')}
            subtitle={t('library.adhkarSubtitle')}
          />

          <div
            className="grid grid-cols-2 gap-2"
            role="group"
            aria-label={t('library.adhkarTitle')}
          >
            {(
              [
                ['morning', SunriseIcon, t('library.adhkarMorning')],
                ['evening', MaghribIcon, t('library.adhkarEvening')],
              ] as const
            ).map(([id, PeriodIcon, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => switchPeriod(id)}
                aria-pressed={period === id}
                className={`flex items-center justify-center gap-2 rounded-control border px-3 py-2.5 text-sm font-bold transition-colors ${
                  period === id ? OPTION_ON : OPTION_OFF
                }`}
              >
                <PeriodIcon className="w-5 h-5 text-brand-gold" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5" data-testid="adhkar-progress">
            <div className="flex justify-between text-xs text-white/70 tabular-nums">
              <span>{t('library.adhkarDoneCount', { count: done })}</span>
              <span>
                {done}/{items.length}
              </span>
            </div>
            <div className="flex gap-1" aria-hidden="true">
              {items.map((i, k) => (
                <span
                  key={i.id}
                  className={`h-1.5 flex-1 rounded-full ${
                    isItemDone(i, counts)
                      ? 'bg-brand-emerald'
                      : k === index && !showAll
                        ? 'bg-brand-gold'
                        : 'bg-brand-border'
                  }`}
                />
              ))}
            </div>
          </div>

          {showAll ? (
            <div className="space-y-3">
              {items.map((i) => {
                const c = counts[i.id] ?? 0;
                const complete = c >= i.repeat;
                return (
                  <div key={i.id} className={`${CARD} p-4 space-y-3`}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-display font-bold text-white text-base">
                        {i.title[lang]}
                      </h2>
                      <button
                        type="button"
                        onClick={() =>
                          update(complete ? reopenItem(i, counts) : tapItem(i, counts))
                        }
                        aria-label={`${t('library.tapToCount')}: ${c}/${i.repeat}`}
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-black tabular-nums transition-colors ${
                          complete
                            ? 'btn-solid border-transparent bg-brand-emerald-dim text-on-color'
                            : 'border-brand-border bg-brand-surface/50 text-white/80 hover:border-brand-emerald/40'
                        }`}
                      >
                        {complete && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                        {c}/{i.repeat}
                      </button>
                    </div>
                    <AdhkarText item={i} lang={lang} />
                  </div>
                );
              })}
            </div>
          ) : item && (!finished || holding) ? (
            <>
              <div className={`${CARD} p-4 space-y-3`} data-testid="adhkar-card">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/60">
                  {t('library.adhkarStep', { n: index + 1, total: items.length })}
                </p>
                <h2 className="font-display font-bold text-white text-lg">{item.title[lang]}</h2>
                <AdhkarText item={item} lang={lang} />
              </div>
              <CountRing
                count={counts[item.id] ?? 0}
                total={item.repeat}
                label={`${t('library.tapToCount')}: ${counts[item.id] ?? 0}/${item.repeat}`}
                onTap={tap}
              />
              <p className="text-center text-xs text-white/60 -mt-2">{t('library.tapToCount')}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={index === 0}
                  className={`${BTN_SECONDARY} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {t('library.adhkarBack')}
                </button>
                <button type="button" onClick={goNext} className={BTN_PRIMARY}>
                  {t('library.adhkarNext')}
                </button>
              </div>
            </>
          ) : (
            <div className={`${CARD} p-5 space-y-3 text-center`} data-testid="adhkar-complete">
              <div className="w-12 h-12 mx-auto rounded-full grid place-items-center bg-brand-emerald/15">
                <CheckIcon className="w-6 h-6 text-brand-emerald" aria-hidden="true" />
              </div>
              <p className="font-display font-bold text-white text-lg">
                {period === 'morning'
                  ? t('library.adhkarCompleteMorning')
                  : t('library.adhkarCompleteEvening')}
              </p>
              {user && syncedDone && (
                <p className="text-xs text-white/70">{t('library.adhkarSavedDone')}</p>
              )}
              <button type="button" onClick={() => update({})} className={BTN_SECONDARY}>
                {t('library.adhkarReadAgain')}
              </button>
            </div>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-pressed={showAll}
              className="text-sm font-semibold text-brand-gold underline underline-offset-2"
            >
              {showAll ? t('library.adhkarOneByOne') : t('library.adhkarShowAll')}
            </button>
          </div>
        </div>
      </div>
    </AnimatedBackground>
  );
}
