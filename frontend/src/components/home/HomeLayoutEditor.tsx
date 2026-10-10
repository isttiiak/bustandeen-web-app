import { useState, type ComponentType, type SVGProps } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { CrescentIcon, MosqueIcon, TasbihIcon } from '../icons/IslamicIcons.js';
import { formatLocaleNumber } from '../../utils/localeDate.js';
import {
  getFocusHabits,
  getHomeTimeline,
  moveHabit,
  setFocusHabits,
  setHomeTimeline,
  type Habit,
} from '../../utils/onboarding.js';
import {
  getHomeGoals,
  goalOrder,
  isSectionOn,
  setHomeGoals,
  setSectionOn,
  type HomeGoals,
} from '../../utils/homeSections.js';
import { useUiStore } from '../../store/useUiStore.js';

type SvgIcon = ComponentType<SVGProps<SVGSVGElement>>;

const ICON: Record<Habit, SvgIcon> = {
  salat: MosqueIcon,
  zikr: TasbihIcon,
  quran: BookOpenIcon,
  fasting: CrescentIcon,
};

const ARROW =
  'w-11 h-11 min-h-0 min-w-0 flex items-center justify-center rounded-control text-white/70 hover:bg-white/5 disabled:opacity-30';

/** One reorderable list with a switch per row (quick sections, goal rows). */
function OrderList({
  label,
  testId,
  order,
  isOn,
  locked,
  onMove,
  onToggle,
  name,
  switchLabel,
}: {
  label: string;
  testId: string;
  order: Habit[];
  isOn: (h: Habit) => boolean;
  /** A row that may not be switched off right now (the at-least-one rule). */
  locked: (h: Habit) => boolean;
  onMove: (h: Habit, dir: -1 | 1) => void;
  onToggle: (h: Habit, on: boolean) => void;
  name: (h: Habit) => string;
  switchLabel: (h: Habit) => string;
}) {
  const { t } = useTranslation();
  return (
    <ol className="space-y-2" aria-label={label} data-testid={testId}>
      {order.map((h, i) => {
        const Icon = ICON[h];
        return (
          <li
            key={h}
            data-section={h}
            className="flex items-center gap-2 p-2 pl-3 rounded-control border border-brand-border bg-brand-surface/50"
          >
            <span className="w-4 text-center text-brand-gold font-bold text-sm tabular-nums">
              {formatLocaleNumber(i + 1)}
            </span>
            <Icon className="w-5 h-5 text-brand-emerald shrink-0" aria-hidden="true" />
            <span className="flex-1 min-w-0 text-white text-sm font-semibold truncate">
              {name(h)}
            </span>
            <button
              type="button"
              onClick={() => onMove(h, -1)}
              disabled={i === 0}
              aria-label={t('onboarding.moveUp', 'Move {{habit}} up', { habit: name(h) })}
              className={ARROW}
            >
              <ChevronUpIcon className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onMove(h, 1)}
              disabled={i === order.length - 1}
              aria-label={t('onboarding.moveDown', 'Move {{habit}} down', { habit: name(h) })}
              className={ARROW}
            >
              <ChevronDownIcon className="w-4 h-4" aria-hidden="true" />
            </button>
            {/* A 44px label around the small toggle: the whole square taps it */}
            <label className="w-11 h-11 shrink-0 flex items-center justify-center cursor-pointer">
              <input
                type="checkbox"
                className="toggle toggle-success toggle-sm shrink-0"
                checked={isOn(h)}
                disabled={isOn(h) && locked(h)}
                onChange={(e) => onToggle(h, e.target.checked)}
                aria-label={switchLabel(h)}
              />
            </label>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Settings → Home (U5): the quick sections (habit order, any subset), adhkār
 * on the timeline, and Today's goals card (on/off, its own row order, rows,
 * badges). At least one quick section or the goals card stays on.
 */
export default function HomeLayoutEditor() {
  const { t } = useTranslation();
  const homeAdhkar = useUiStore((s) => s.homeAdhkar);
  const setHomeAdhkar = useUiStore((s) => s.setHomeAdhkar);
  const [order, setOrder] = useState<Habit[]>(getFocusHabits);
  const [on, setOn] = useState<Record<Habit, boolean>>(() => ({
    salat: getHomeTimeline(),
    zikr: isSectionOn('zikr'),
    quran: isSectionOn('quran'),
    fasting: isSectionOn('fasting'),
  }));
  const [goals, setGoals] = useState<HomeGoals>(getHomeGoals);
  const quickOn = order.filter((h) => on[h]);
  const goalRowsOn = goalOrder(goals).filter((h) => !goals.off.includes(h));
  // The rule binds when exactly one thing is left on.
  const lastQuick = !goals.on && quickOn.length === 1;
  const lastIsGoals = goals.on && quickOn.length === 0;

  const moveSection = (h: Habit, dir: -1 | 1) => {
    const next = moveHabit(order, h, dir);
    setOrder(next);
    setFocusHabits(next);
  };
  const toggleSection = (h: Habit, value: boolean) => {
    if (h === 'salat') setHomeTimeline(value);
    else setSectionOn(h, value);
    setOn((cur) => ({ ...cur, [h]: value }));
  };
  const saveGoals = (next: HomeGoals) => {
    setGoals(next);
    setHomeGoals(next);
  };
  const moveGoal = (h: Habit, dir: -1 | 1) =>
    saveGoals({ ...goals, order: moveHabit(goalOrder(goals), h, dir) });
  const toggleGoalRow = (h: Habit, value: boolean) =>
    saveGoals({
      ...goals,
      off: value ? goals.off.filter((x) => x !== h) : [...goals.off.filter((x) => x !== h), h],
    });

  const habitName = (h: Habit) => t(`onboarding.habit.${h}`);
  const sectionName = (h: Habit) =>
    h === 'salat' ? t('settings.homeTimeline', 'Prayer timeline') : habitName(h);
  const ruleHint = t(
    'settings.homeRule',
    'Keep at least one quick section or the goals card on, so Home is never empty.'
  );

  return (
    <div className="space-y-5">
      <div role="group" aria-label={t('settings.homeSections', 'Quick sections')}>
        <p className="text-white font-semibold text-sm">
          {t('settings.homeSections', 'Quick sections')}
        </p>
        <p className="text-white/70 text-xs leading-snug mt-0.5 mb-2">
          {t(
            'settings.homeSectionsDetail',
            'A few taps for each habit, in this order. The prayer row in the arch always stays.'
          )}
        </p>
        <OrderList
          label={t('settings.homeSections', 'Quick sections')}
          testId="home-sections"
          order={order}
          isOn={(h) => on[h]}
          locked={() => lastQuick}
          onMove={moveSection}
          onToggle={toggleSection}
          name={sectionName}
          switchLabel={(h) =>
            t('settings.showSection', 'Show {{section}} on Home', { section: sectionName(h) })
          }
        />
        <label
          className={`mt-2 flex items-center gap-4 p-3 rounded-control border border-brand-border bg-brand-surface/50 ${
            on.salat ? 'cursor-pointer hover:border-brand-emerald/40' : 'opacity-60'
          }`}
        >
          <input
            type="checkbox"
            className="toggle toggle-success"
            checked={homeAdhkar && on.salat}
            disabled={!on.salat}
            onChange={(e) => setHomeAdhkar(e.target.checked)}
          />
          <span className="min-w-0">
            <span className="block font-semibold text-white text-sm">
              {t('settings.homeAdhkar', 'Adhkār on the timeline')}
            </span>
            <span className="block text-white/70 text-xs leading-snug mt-0.5">
              {on.salat
                ? t(
                    'settings.homeAdhkarDetail',
                    'Morning adhkār on Fajr until sunrise, evening adhkār on Maghrib until ʿIshāʾ.'
                  )
                : t(
                    'settings.homeAdhkarOff',
                    'Turn on the prayer timeline to show adhkār on Home.'
                  )}
            </span>
          </span>
        </label>
      </div>

      <div role="group" aria-label={t('settings.homeGoals', "Today's goals")}>
        <label className="flex items-center gap-4 p-3 rounded-control border border-brand-border bg-brand-surface/50 cursor-pointer hover:border-brand-emerald/40">
          <input
            type="checkbox"
            className="toggle toggle-success"
            checked={goals.on}
            disabled={lastIsGoals}
            onChange={(e) => saveGoals({ ...goals, on: e.target.checked })}
          />
          <span className="min-w-0">
            <span className="block font-semibold text-white text-sm">
              {t('settings.homeGoalsCard', "Show Today's goals")}
            </span>
            <span className="block text-white/70 text-xs leading-snug mt-0.5">
              {t('settings.homeGoalsCardDetail', 'Your progress towards each daily goal.')}
            </span>
          </span>
        </label>
        {goals.on && (
          <div className="mt-2 pl-3 border-l-2 border-brand-border space-y-2">
            <p className="text-white/70 text-xs">
              {t('settings.homeGoalRows', 'Rows on the card, in this order')}
            </p>
            <OrderList
              label={t('settings.homeGoalRows', 'Rows on the card, in this order')}
              testId="home-goal-rows"
              order={goalOrder(goals)}
              isOn={(h) => !goals.off.includes(h)}
              locked={() => goalRowsOn.length === 1}
              onMove={moveGoal}
              onToggle={toggleGoalRow}
              name={habitName}
              switchLabel={(h) =>
                t('settings.showGoalRow', 'Show {{habit}} on the goals card', {
                  habit: habitName(h),
                })
              }
            />
            <label className="flex items-center gap-4 p-3 rounded-control border border-brand-border bg-brand-surface/50 cursor-pointer hover:border-brand-emerald/40">
              <input
                type="checkbox"
                className="toggle toggle-success"
                checked={goals.badges}
                onChange={(e) => saveGoals({ ...goals, badges: e.target.checked })}
              />
              <span className="min-w-0">
                <span className="block font-semibold text-white text-sm">
                  {t('settings.homeGoalBadges', 'Streaks and badges')}
                </span>
                <span className="block text-white/70 text-xs leading-snug mt-0.5">
                  {t(
                    'settings.homeGoalBadgesDetail',
                    'Streaks, the zikr goal percent and the Ramadan countdown.'
                  )}
                </span>
              </span>
            </label>
          </div>
        )}
      </div>

      {(lastQuick || lastIsGoals) && (
        <p className="text-brand-gold text-xs leading-snug" role="note">
          {ruleHint}
        </p>
      )}
    </div>
  );
}
