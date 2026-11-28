import { useTranslation } from 'react-i18next';
import { translateSalatName } from '../../utils/prayerTimes.js';
import type { EndMark, MomentSlot, StartMark } from '../../hooks/useCycle.js';
import { CHIP, CHIP_IDLE, CHIP_PINK } from './rayhanahShared.js';

// "Before or after which salat?" Nobody taps the button at the moment it happens, so
// the app does not use the time of the tap. She says where in the day it happened, and
// two short yes/no questions settle which of that day's prayers are not owed. The rule
// that reads these answers is backend/src/utils/cycleExcusal.ts (GitHub issue 431).

type School = 'hanafi' | 'majority';

const SLOTS: MomentSlot[] = ['fajr', 'morning', 'dhuhr', 'asr', 'maghrib', 'isha'];

/** Everything needed has been answered. */
export function isMarkComplete(
  mode: 'start' | 'end',
  school: School,
  mark: StartMark | EndMark | null
): boolean {
  if (!mark) return false;
  if (mark.slot === 'morning') return true;
  if (mode === 'end') return mark.enough === true || mark.enough === false;
  const s = mark as StartMark;
  if (s.prayed === true) return true;
  if (s.prayed !== false) return false;
  // Not yet prayed: the Hanafi rule goes by the end of its time; the majority also ask about the time that passed
  return school === 'hanafi' || s.enough === true || s.enough === false;
}

function YesNo({
  label,
  value,
  onChange,
  name,
}: {
  label: string;
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  name: string;
}) {
  const { t } = useTranslation();
  return (
    <div role="group" aria-label={label} className="space-y-1.5">
      <p className="text-white/85 text-xs font-bold leading-snug">{label}</p>
      <div className="flex gap-2">
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            data-testid={`${name}-${v ? 'yes' : 'no'}`}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`flex-1 justify-center ${CHIP} rounded-control py-2 ${value === v ? CHIP_PINK : CHIP_IDLE}`}
          >
            {v ? t('rayhanah.moment.yes', 'Yes') : t('rayhanah.moment.no', 'No')}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CycleMomentQuestions({
  mode,
  school,
  value,
  onChange,
}: {
  mode: 'start' | 'end';
  school: School;
  value: StartMark | EndMark | null;
  onChange: (next: StartMark | EndMark) => void;
}) {
  const { t } = useTranslation();
  const slotLabel = (s: MomentSlot): string => {
    switch (s) {
      case 'fajr':
        return t('rayhanah.moment.fajr', 'In Fajr time (before sunrise)');
      case 'morning':
        return t('rayhanah.moment.morning', 'After sunrise, before Dhuhr');
      case 'dhuhr':
        return t('rayhanah.moment.dhuhr', 'In Dhuhr time');
      case 'asr':
        return t('rayhanah.moment.asr', 'In Asr time');
      case 'maghrib':
        return t('rayhanah.moment.maghrib', 'In Maghrib time');
      case 'isha':
        return t('rayhanah.moment.isha', 'In Isha time (night, until Fajr)');
    }
  };
  const prayer =
    value && value.slot !== 'morning'
      ? translateSalatName(value.slot, value.slot.charAt(0).toUpperCase() + value.slot.slice(1), t)
      : '';

  return (
    <div className="space-y-3">
      <div
        role="radiogroup"
        aria-label={t('rayhanah.moment.which', 'Which time of day?')}
        className="space-y-1.5"
      >
        <p className="text-white/85 text-xs font-bold">
          {mode === 'start'
            ? t('rayhanah.moment.askStart', 'Before or after which prayer did it start?')
            : t('rayhanah.moment.askEnd', 'Before or after which prayer did it stop?')}
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {SLOTS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={value?.slot === s}
              data-testid={`moment-${s}`}
              onClick={() => onChange(mode === 'start' ? { slot: s } : { slot: s })}
              className={`${CHIP} rounded-control py-2 px-3 text-left ${value?.slot === s ? CHIP_PINK : CHIP_IDLE}`}
            >
              {slotLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {value && value.slot !== 'morning' && mode === 'start' && (
        <>
          <YesNo
            name="started-prayed"
            label={t(
              'rayhanah.moment.prayed',
              'Had you already prayed {{prayer}} before it started?',
              { prayer }
            )}
            value={(value as StartMark).prayed}
            onChange={(v) =>
              onChange({
                slot: value.slot,
                prayed: v,
                enough: v ? null : (value as StartMark).enough,
              })
            }
          />
          {(value as StartMark).prayed === false && school === 'majority' && (
            <YesNo
              name="started-enough"
              label={t(
                'rayhanah.moment.startedEnough',
                'Had time for at least one rak\u02bfah of {{prayer}} passed before it started?',
                { prayer }
              )}
              value={(value as StartMark).enough}
              onChange={(v) => onChange({ ...(value as StartMark), enough: v })}
            />
          )}
        </>
      )}

      {value && value.slot !== 'morning' && mode === 'end' && (
        <YesNo
          name="ended-enough"
          label={
            school === 'hanafi'
              ? t(
                  'rayhanah.moment.endedEnoughHanafi',
                  'Was there still time to take ghusl, dress and begin {{prayer}} before its time ended?',
                  { prayer }
                )
              : t(
                  'rayhanah.moment.endedEnough',
                  'Was there still time to pray at least one rakʿah of {{prayer}} before its time ended?',
                  { prayer }
                )
          }
          value={(value as EndMark).enough}
          onChange={(v) => onChange({ slot: value.slot, enough: v })}
        />
      )}

      <p className="text-white/70 text-[11px] leading-relaxed">
        {t(
          'rayhanah.moment.why',
          'Your answers decide which of that day’s prayers are not owed, following the school chosen in Rayhanah settings. The time you tap is not used.'
        )}
      </p>
    </div>
  );
}
