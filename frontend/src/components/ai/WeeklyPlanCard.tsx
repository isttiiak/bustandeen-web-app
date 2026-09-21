import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAcceptPlan, useWeeklyPlan, type PlanTarget } from '../../hooks/useNaseeh.js';
import { useAuthStore } from '../../store/useAuthStore.js';

/**
 * "This week's plan": one or two small targets sized to what the user actually
 * did over the last four weeks, with accept/adjust and progress through the week.
 *
 * Worked out on the server from the user's own logs. No AI is involved, and it
 * is only mounted when the on-device rest-day gate is clear (see NaseehPage); the
 * server also pauses it while today is a rest day.
 */

interface Tweak {
  dailyAmount?: number;
  daysTarget: number;
}

/** The heading follows the steppers, so it always says what Accept will save. */
function liveTitle(target: PlanTarget, tweak: Tweak): string {
  const days = `${tweak.daysTarget} ${tweak.daysTarget === 1 ? 'day' : 'days'}`;
  if (target.kind === 'zikr') return `Dhikr: ${tweak.dailyAmount} a day, on ${days}`;
  if (target.kind === 'quran') return `Quran: ${tweak.dailyAmount} ayat a day, on ${days}`;
  const prayer = target.prayer
    ? target.prayer.charAt(0).toUpperCase() + target.prayer.slice(1)
    : '';
  return `${prayer} on ${days}`;
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
  unit,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 text-[11px] w-16 shrink-0">{label}</span>
      <button
        type="button"
        onClick={onDec}
        aria-label={`Decrease ${label}`}
        className="btn btn-xs btn-circle btn-ghost border border-white/15 text-white/70"
      >
        -
      </button>
      <span className="text-white text-sm font-bold min-w-[3.5rem] text-center">
        {value} {unit}
      </span>
      <button
        type="button"
        onClick={onInc}
        aria-label={`Increase ${label}`}
        className="btn btn-xs btn-circle btn-ghost border border-white/15 text-white/70"
      >
        +
      </button>
    </div>
  );
}

function ProgressRow({ target }: { target: PlanTarget }) {
  const { t } = useTranslation();
  const goal = Math.max(1, target.effectiveDaysTarget);
  const pct = Math.min(100, Math.round((target.done / goal) * 100));
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-white/85 text-sm font-semibold">{target.title}</p>
        <p className="text-white/50 text-xs shrink-0">
          {target.done} / {goal}
        </p>
      </div>
      <div
        className="h-1.5 rounded-full bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={target.done}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-label={target.title}
      >
        <div
          className={`h-full rounded-full ${target.met ? 'bg-brand-gold' : 'bg-brand-emerald'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-white/35 text-[11px]">
        {target.met
          ? t('weeklyPlan.met', 'Done for the week. Anything more is a bonus.')
          : `${target.daysLeft} ${target.daysLeft === 1 ? 'day' : 'days'} left to fit it in.`}
      </p>
    </li>
  );
}

export default function WeeklyPlanCard() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const aiEnabled = useAuthStore((s) => s.aiEnabled);
  const { data: plan, isPending, isError } = useWeeklyPlan();
  const accept = useAcceptPlan();
  const [tweaks, setTweaks] = useState<Partial<Record<PlanTarget['kind'], Tweak>>>({});
  const [failed, setFailed] = useState(false);

  if (!user || !aiEnabled || isPending || isError || !plan) return null;

  const current = (target: PlanTarget): Tweak => ({
    dailyAmount: tweaks[target.kind]?.dailyAmount ?? target.dailyAmount,
    daysTarget: tweaks[target.kind]?.daysTarget ?? target.daysTarget,
  });
  const change = (target: PlanTarget, patch: Partial<Tweak>) =>
    setTweaks((prev) => ({ ...prev, [target.kind]: { ...current(target), ...patch } as Tweak }));

  const onAccept = () => {
    setFailed(false);
    accept.mutate(
      plan.targets.map((target) => ({
        kind: target.kind,
        dailyAmount: current(target).dailyAmount,
        daysTarget: current(target).daysTarget,
      })),
      { onError: () => setFailed(true) }
    );
  };

  const step = (kind: PlanTarget['kind']) => (kind === 'zikr' ? 10 : 5);
  const amountUnit = (kind: PlanTarget['kind']) => (kind === 'zikr' ? 'dhikr' : 'ayat');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-3xl border border-brand-border bg-brand-deep/70 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-lg">
            🗓️
          </span>
          <h3 className="text-white font-black text-base">
            {t('weeklyPlan.title', 'Your plan for this week')}
          </h3>
        </div>

        <p className="text-white/70 text-sm leading-relaxed">{plan.headline}</p>

        {plan.status === 'ready' && (
          <>
            <ul className="space-y-4">
              {plan.targets.map((target) => (
                <li key={target.kind} className="space-y-2">
                  <p className="text-white/85 text-sm font-semibold">
                    {liveTitle(target, current(target))}
                  </p>
                  <p className="text-white/40 text-xs leading-relaxed">{target.reason}</p>
                  <div className="space-y-1.5">
                    {target.kind !== 'salat' && (
                      <Stepper
                        label={t('weeklyPlan.perDay', 'Per day')}
                        unit={amountUnit(target.kind)}
                        value={current(target).dailyAmount ?? 0}
                        onDec={() =>
                          change(target, {
                            dailyAmount: Math.max(
                              step(target.kind),
                              (current(target).dailyAmount ?? 0) - step(target.kind)
                            ),
                          })
                        }
                        onInc={() =>
                          change(target, {
                            dailyAmount: (current(target).dailyAmount ?? 0) + step(target.kind),
                          })
                        }
                      />
                    )}
                    <Stepper
                      label={t('weeklyPlan.onDays', 'On')}
                      unit={current(target).daysTarget === 1 ? 'day' : 'days'}
                      value={current(target).daysTarget}
                      onDec={() =>
                        change(target, { daysTarget: Math.max(1, current(target).daysTarget - 1) })
                      }
                      onInc={() =>
                        change(target, { daysTarget: Math.min(7, current(target).daysTarget + 1) })
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onAccept}
                disabled={accept.isPending}
                className="btn btn-sm bg-brand-emerald/20 border-brand-emerald/30 text-brand-emerald hover:bg-brand-emerald/30 disabled:opacity-50"
              >
                {accept.isPending
                  ? t('weeklyPlan.saving', 'Saving…')
                  : t('weeklyPlan.accept', 'Accept this plan')}
              </button>
              <p className="text-white/35 text-[11px]">
                {t(
                  'weeklyPlan.acceptNote',
                  'Accepting also sets your daily dhikr and Quran goals to these amounts. You can change them any time in the app.'
                )}
              </p>
            </div>
            {failed && (
              <p role="alert" className="text-brand-gold text-xs">
                {t('weeklyPlan.failed', 'That did not save. Please try again in a moment.')}
              </p>
            )}
          </>
        )}

        {plan.status === 'accepted' && (
          <ul className="space-y-4">
            {plan.targets.map((target) => (
              <ProgressRow key={target.kind} target={target} />
            ))}
          </ul>
        )}

        <p className="text-white/25 text-[10px] leading-relaxed">
          {t(
            'weeklyPlan.basis',
            'Worked out on our server from your own logs. No AI is used for this card.'
          )}
        </p>
      </div>
    </motion.div>
  );
}
