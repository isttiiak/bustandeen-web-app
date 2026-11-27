import { useTranslation } from 'react-i18next';
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HeartIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import MoodComfort from '../MoodComfort.js';
import { FlowDrops } from './cycleIcons.js';
import { CARD, SECTION_TITLE } from '../bustanStyles.js';
import {
  FLOW_OPTIONS,
  SYMPTOM_OPTIONS,
  MOOD_OPTIONS,
  CHIP,
  CHIP_IDLE,
  CHIP_PINK,
  CHIP_INFO,
  LABEL,
  formatDay,
  shiftStr,
} from './rayhanahShared.js';
import { Ref } from './RayhanahBits.js';
import { type RayhanahPage } from './useRayhanahPage.js';

export default function RayhanahTodayNote({
  page,
  active,
}: {
  page: RayhanahPage;
  active: NonNullable<RayhanahPage['active']>;
}) {
  const { t } = useTranslation();
  const { today, viewDay, setViewDay, viewDayNote, todayNote, setFlow, toggleSymptom, toggleMood } =
    page;

  return (
    <section className={`${CARD} p-5 space-y-4`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className={SECTION_TITLE}>
          <HeartIcon className="w-5 h-5 text-brand-pink" />
          {viewDay === today
            ? t('rayhanah.howAreYouToday', 'How are you today?')
            : t('rayhanah.editingDay', '{{date}}', { date: formatDay(viewDay) })}
        </h2>
        <span className="inline-flex items-center gap-1 text-[10px] text-white/70 mt-1">
          <LockClosedIcon className="w-3 h-3" />
          {t('rayhanah.privateNote', 'private, only you can see this')}
        </span>
      </div>

      {/* Day navigation, only during an active period */}
      <div className="flex items-center gap-2 rounded-control border border-brand-border bg-brand-surface/50 p-1">
        <button
          aria-label={t('rayhanah.dayNavBack', 'Previous day')}
          disabled={viewDay <= active.startDate}
          onClick={() => setViewDay((d) => shiftStr(d, -1))}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        <span className="flex-1 text-center text-xs text-white/80 font-bold">
          {viewDay === today ? t('common.today', 'Today') : formatDay(viewDay)}
        </span>
        <button
          aria-label={t('rayhanah.dayNavForward', 'Next day')}
          disabled={viewDay >= today}
          onClick={() => setViewDay((d) => shiftStr(d, 1))}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-brand-deep disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
        {viewDay !== today && (
          <button
            onClick={() => setViewDay(today)}
            className="text-[11px] text-brand-pink font-bold px-2 py-1 rounded-lg hover:bg-brand-pink/10 transition-colors"
          >
            {t('rayhanah.backToToday', 'Back to today')}
          </button>
        )}
      </div>

      {viewDay !== today && (
        <p className="text-white/70 text-[11px] leading-relaxed">
          {t('rayhanah.editingDayNote', 'Editing {{date}}: changes are saved immediately.', {
            date: formatDay(viewDay),
          })}
        </p>
      )}

      <div>
        <p className={LABEL}>
          {t('rayhanah.flowLabel', 'Flow')}{' '}
          <span className="normal-case font-normal text-white/60">
            · {t('rayhanah.pickOne', 'pick one')}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {FLOW_OPTIONS.map((f) => {
            const on = viewDayNote?.flow === f.id;
            return (
              <button
                key={f.id}
                aria-pressed={on}
                className={`${CHIP} ${on ? CHIP_PINK : CHIP_IDLE}`}
                onClick={() => setFlow(f.id)}
              >
                <FlowDrops level={f.drops} className="text-brand-pink" />
                {t(`rayhanah.flow.${f.id}`, f.label)}
                {on && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className={LABEL}>
          {t('rayhanah.bodyLabel', 'Body')}{' '}
          <span className="normal-case font-normal text-white/60">
            · {t('rayhanah.pickAnyThatFit', 'pick any that fit')}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SYMPTOM_OPTIONS.map((sy) => {
            const on = !!viewDayNote?.symptoms?.includes(sy.id);
            return (
              <button
                key={sy.id}
                aria-pressed={on}
                className={`${CHIP} ${on ? CHIP_PINK : CHIP_IDLE}`}
                onClick={() => toggleSymptom(sy.id)}
              >
                {on && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                {t(`rayhanah.symptom.${sy.id}`, sy.label)}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className={LABEL}>
          {t('rayhanah.heartLabel', 'Heart')}{' '}
          <span className="normal-case font-normal text-white/60">
            · {t('rayhanah.pickAnyThatFit', 'pick any that fit')}
          </span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_OPTIONS.map((mo) => {
            const on = !!viewDayNote?.moods?.includes(mo.id);
            return (
              <button
                key={mo.id}
                aria-pressed={on}
                className={`${CHIP} ${on ? CHIP_INFO : CHIP_IDLE}`}
                onClick={() => toggleMood(mo.id)}
              >
                {on && <CheckIcon className="w-3.5 h-3.5" aria-hidden="true" />}
                {t(`rayhanah.mood.${mo.id}`, mo.label)}
              </button>
            );
          })}
        </div>
      </div>

      {/* A gentle fixed line for the feelings she named (today only). On-device only: no cycle data goes to any AI. */}
      {viewDay === today && <MoodComfort moods={todayNote?.moods ?? []} />}

      {(viewDayNote?.symptoms?.length ?? 0) > 0 && (
        <p className="text-brand-pink text-xs leading-relaxed border-t border-brand-border pt-3">
          {t(
            'rayhanah.easeHadith',
            'May Allah give you ease. No fatigue or pain touches a Muslim except that Allah wipes away sins with it'
          )}{' '}
          (<Ref href="https://sunnah.com/bukhari:5641" label="Bukhārī 5641" />
          ).
        </p>
      )}
    </section>
  );
}
