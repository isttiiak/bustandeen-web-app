import { useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  BookOpenIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  LockClosedIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import LocationPicker from '../components/LocationPicker.js';
import {
  AsrIcon,
  CrescentIcon,
  LeafIcon,
  MosqueIcon,
  TasbihIcon,
} from '../components/icons/IslamicIcons.js';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  OPTION_OFF,
  OPTION_ON,
  SECTION_TITLE,
} from '../components/bustanStyles.js';
import { useGoal, useUpdateGoal } from '../hooks/useAnalytics.js';
import { useQuranSummary, useUpdateQuranProfile } from '../hooks/useQuran.js';
import { useUpdateProfile } from '../hooks/useUserProfile.js';
import { countryName, deviceCountry } from '../utils/countryDefaults.js';
import type { StoredLocation } from '../utils/geocode.js';
import { formatLocaleNumber } from '../utils/localeDate.js';
import { asrBySchool, formatTime } from '../utils/prayerTimes.js';
import {
  ASR_MADHABS,
  CALC_METHODS,
  dismissPrayerDefaultsSuggestion,
  getAsrMadhab,
  getCalcMethod,
  regionPrayerDefaults,
  setAsrMadhab,
  setCalcMethod,
  type AsrMadhab,
  type CalculationMethodId,
} from '../utils/salatPrefs.js';
import {
  DEFAULT_QURAN_AYAT,
  DEFAULT_ZIKR_GOAL,
  QURAN_AYAT_OPTIONS,
  ZIKR_GOAL_OPTIONS,
  HABITS,
  getFocusHabits,
  getHomeTimeline,
  initialGoal,
  markOnboardedLocally,
  moveHabit,
  setFocusHabits,
  type Habit,
} from '../utils/onboarding.js';
import { getHomeGoals, isSectionOn, saveSetupHomeChoice } from '../utils/homeSections.js';

const LOCATION_KEY = 'bustandeen_location';
const STEPS = 3;

function readLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_KEY);
    return raw ? (JSON.parse(raw) as StoredLocation) : null;
  } catch {
    return null;
  }
}

const HABIT_ICON: Record<Habit, ComponentType<SVGProps<SVGSVGElement>>> = {
  salat: MosqueIcon,
  zikr: TasbihIcon,
  quran: BookOpenIcon,
  fasting: CrescentIcon,
};

/**
 * First-run setup (audit T3.3): where you pray, how your times are worked
 * out, and what you want to grow first. Every step can be skipped, and every
 * choice is the same setting as in Prayer time settings / Zikr / Quran, so it
 * can be changed there later. Reminders are not asked (D6: native apps first).
 */
export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language === 'bn' ? 'bn' : 'en';
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: location (on this device only)
  const [location, setLocation] = useState<StoredLocation | null>(readLocation);
  const [changingLocation, setChangingLocation] = useState(false);
  const saveLocation = (loc: StoredLocation) => {
    setLocation(loc);
    setChangingLocation(false);
    try {
      localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    } catch {
      /* private mode: times work for this visit only */
    }
  };

  // Step 2: calculation method + ʿAṣr school, preselected to the saved
  // choice or this country's usual one (regionPrayerDefaults).
  const country = deviceCountry();
  const region = regionPrayerDefaults();
  const usualLabel = country
    ? t('salatSettings.usualIn', 'Usual in {{country}}', { country: countryName(country, lang) })
    : null;
  const [method, setMethod] = useState<CalculationMethodId>(getCalcMethod);
  const [madhab, setMadhab] = useState<AsrMadhab>(getAsrMadhab);
  const asrTimes = useMemo(() => {
    if (!location) return null;
    // The picked method, not the saved one: nothing is saved until Next.
    return asrBySchool(location.latitude, location.longitude, new Date(), method);
  }, [location, method]);

  // Step 3: the order of the four habits + starting goals + what Home shows
  const { data: zikrGoal } = useGoal();
  const { data: quranSummary } = useQuranSummary();
  const [habits, setHabits] = useState<Habit[]>(getFocusHabits);
  // U5: a switch per habit for its Home section (Salat = the timeline) and
  // one for Today's goals. With no section on, the goals card stays on.
  const [homeOn, setHomeOn] = useState<Record<Habit, boolean>>(() => ({
    salat: getHomeTimeline(),
    zikr: isSectionOn('zikr'),
    quran: isSectionOn('quran'),
    fasting: isSectionOn('fasting'),
  }));
  const [goalsPick, setGoalsPick] = useState(() => getHomeGoals().on);
  const noSection = !HABITS.some((h) => homeOn[h]);
  const goalsOn = goalsPick || noSection;
  const [zikrTarget, setZikrTarget] = useState<number | null>(null);
  const [quranAyat, setQuranAyat] = useState<number | null>(null);
  const zikrPick =
    zikrTarget ?? initialGoal(zikrGoal?.dailyTarget, ZIKR_GOAL_OPTIONS, DEFAULT_ZIKR_GOAL);
  const quranPick =
    quranAyat ??
    initialGoal(quranSummary?.profile.dailyGoalAyat, QURAN_AYAT_OPTIONS, DEFAULT_QURAN_AYAT);

  const updateProfile = useUpdateProfile();
  const updateGoal = useUpdateGoal();
  const updateQuran = useUpdateQuranProfile();

  const finishOnboarding = () => {
    markOnboardedLocally();
    // Fire and forget: the local flag already hides the flow on this device.
    updateProfile.mutate({ onboarded: true });
  };

  const skip = () => {
    finishOnboarding();
    navigate('/', { replace: true });
  };

  const savePrayerChoice = () => {
    setCalcMethod(method);
    setAsrMadhab(madhab);
    // An explicit choice answers the one-time "your country usually…" card.
    dismissPrayerDefaultsSuggestion();
  };

  const finish = async () => {
    setSaving(true);
    setFocusHabits(habits);
    saveSetupHomeChoice(homeOn, goalsOn);
    const writes: Promise<unknown>[] = [];
    if (zikrPick !== zikrGoal?.dailyTarget) {
      writes.push(updateGoal.mutateAsync({ dailyTarget: zikrPick }));
    }
    if (quranPick !== quranSummary?.profile.dailyGoalAyat) {
      writes.push(updateQuran.mutateAsync({ dailyGoalAyat: quranPick }));
    }
    const results = await Promise.allSettled(writes);
    finishOnboarding();
    setSaving(false);
    if (results.some((r) => r.status === 'rejected')) {
      toast.error(
        t(
          'onboarding.goalSaveFailed',
          'Your goals could not be saved. You can set them on the Zikr and Quran pages.'
        )
      );
    } else {
      toast.success(t('onboarding.done', 'All set. May Allah put barakah in it.'));
    }
    navigate('/', { replace: true });
  };

  const next = () => {
    if (step === 1) savePrayerChoice();
    setStep((s) => Math.min(STEPS - 1, s + 1));
    window.scrollTo({ top: 0 });
  };

  const stepTitle = [
    t('onboarding.locationTitle', 'Where do you pray?'),
    t('onboarding.prayerTitle', 'Your prayer times'),
    t('onboarding.orderTitle', 'Your habits, in your order'),
  ][step];

  return (
    <div className="min-h-screen bg-brand-void">
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-10">
        {/* Top row: back, progress, skip */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-5">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="justify-self-start flex items-center gap-1 text-white/70 hover:text-white text-sm min-h-[44px] pr-2"
            >
              <ChevronLeftIcon className="w-4 h-4" aria-hidden="true" />
              {t('onboarding.back', 'Back')}
            </button>
          ) : (
            <span />
          )}
          <div
            className="flex items-center gap-1.5"
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={STEPS}
            aria-valuenow={step + 1}
            aria-label={t('onboarding.progress', 'Step {{n}} of {{total}}', {
              n: formatLocaleNumber(step + 1),
              total: formatLocaleNumber(STEPS),
            })}
          >
            {Array.from({ length: STEPS }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step
                    ? 'w-6 bg-brand-emerald'
                    : i < step
                      ? 'w-3 bg-brand-emerald/60'
                      : 'w-3 bg-brand-border'
                }`}
              />
            ))}
          </div>
          <button
            onClick={skip}
            className="justify-self-end text-white/70 hover:text-white text-sm underline underline-offset-2 min-h-[44px] pl-2"
          >
            {t('onboarding.skip', 'Skip setup')}
          </button>
        </div>

        {/* The screen's one arch */}
        <header className="rounded-arch border border-brand-border bg-gradient-to-b from-hero to-brand-deep shadow-hero px-6 pt-10 pb-6 text-center mb-5">
          <LeafIcon className="w-8 h-8 mx-auto text-brand-emerald" aria-hidden="true" />
          {step === 0 && (
            <p className="text-brand-gold text-xs font-semibold uppercase tracking-wider mt-3">
              {t('onboarding.welcome', 'Welcome to Bustandeen')}
            </p>
          )}
          <h1 className="font-display text-white text-2xl font-bold mt-2">{stepTitle}</h1>
          <p className="text-white/70 text-sm mt-2 leading-relaxed">
            {
              [
                t(
                  'onboarding.locationIntro',
                  'Prayer times are worked out on this device from your location. It never leaves your phone.'
                ),
                t(
                  'onboarding.prayerIntro',
                  'We picked what most mosques near you use. Match your local mosque if it differs.'
                ),
                t(
                  'onboarding.orderIntro',
                  'Home follows this order. Move a habit up or down; small and steady is the aim.'
                ),
              ][step]
            }
          </p>
          <p className="text-white/50 text-xs mt-3">
            {t('onboarding.progress', 'Step {{n}} of {{total}}', {
              n: formatLocaleNumber(step + 1),
              total: formatLocaleNumber(STEPS),
            })}
          </p>
        </header>

        {step === 0 && (
          <section className={`${CARD} p-5`}>
            {location && !changingLocation ? (
              <div className="flex items-center justify-between gap-2 p-3 rounded-control border border-brand-border bg-brand-surface/50">
                <span className="flex items-center gap-1.5 text-white/80 text-sm min-w-0">
                  <MapPinIcon className="w-4 h-4 text-brand-emerald shrink-0" aria-hidden="true" />
                  <span className="truncate" data-testid="onboarding-location">
                    {location.name}
                  </span>
                </span>
                <button
                  onClick={() => setChangingLocation(true)}
                  className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs shrink-0`}
                >
                  {t('prayerTimes.change', 'Change')}
                </button>
              </div>
            ) : (
              <LocationPicker onLocationChange={saveLocation} />
            )}
            {!location && (
              <p className="flex items-start gap-2 text-white/60 text-xs mt-4 leading-relaxed">
                <LockClosedIcon className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
                {t(
                  'onboarding.locationLater',
                  'No location yet? That is fine. Prayer times wait until you set one.'
                )}
              </p>
            )}
          </section>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <section className={`${CARD} p-5`}>
              <h2 className={SECTION_TITLE}>
                <AsrIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
                {t('salatSettings.asrTitle', 'ʿAṣr timing (madhab)')}
              </h2>
              <p className="text-white/70 text-xs mt-1 leading-relaxed">
                {t(
                  'onboarding.asrDesc',
                  'The schools differ on when ʿAṣr begins, and Ẓuhr lasts until it does. Choose the one you follow.'
                )}
              </p>
              <div className="mt-3 space-y-2.5" role="radiogroup">
                {ASR_MADHABS.map((m) => {
                  const active = madhab === m.id;
                  const time = asrTimes ? formatTime(asrTimes[m.id]) : null;
                  return (
                    <button
                      key={m.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMadhab(m.id)}
                      className={`w-full text-left p-3.5 rounded-control border transition-colors ${active ? OPTION_ON : OPTION_OFF}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">
                          {m.id === 'hanafi'
                            ? t('onboarding.asrHanafi', 'Ḥanafī')
                            : t('onboarding.asrStandard', 'Shāfiʿī, Mālikī, Ḥanbalī')}
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          {usualLabel && m.id === region.asr && (
                            <span className="text-[10px] font-semibold text-brand-gold border border-brand-gold/40 rounded-full px-2 py-0.5">
                              {usualLabel}
                            </span>
                          )}
                          {active && (
                            <CheckIcon className="w-4 h-4 text-brand-emerald" aria-hidden="true" />
                          )}
                        </span>
                      </span>
                      <span className="block text-white/70 text-xs mt-1 leading-relaxed">
                        {m.id === 'hanafi'
                          ? t(
                              'onboarding.asrHanafiDetail',
                              "ʿAṣr when an object's shadow is twice its length."
                            )
                          : t(
                              'onboarding.asrStandardDetail',
                              "ʿAṣr when an object's shadow equals its length."
                            )}
                      </span>
                      {time && (
                        <span className="block text-white text-xs font-semibold mt-1.5 tabular-nums">
                          {t('onboarding.asrToday', 'ʿAṣr today: {{time}}', { time })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className={`${CARD} p-5`}>
              <h2 className={SECTION_TITLE}>
                <MosqueIcon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
                {t('salatSettings.calcMethodTitle', 'Calculation method')}
              </h2>
              <p className="text-white/70 text-xs mt-1 leading-relaxed">
                {t(
                  'onboarding.methodDesc',
                  'Sets Fajr and ʿIshāʾ. If your times feel off from your mosque, change it later in Prayer time settings.'
                )}
              </p>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as CalculationMethodId)}
                aria-label={t('salatSettings.calcMethodTitle', 'Calculation method')}
                className="select select-bordered w-full mt-3 bg-shade/30 border-brand-border text-white text-sm rounded-control"
              >
                {CALC_METHODS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-brand-deep text-white">
                    {m.label}
                    {usualLabel && m.id === region.method ? ` · ${usualLabel}` : ''}
                  </option>
                ))}
              </select>
            </section>
          </div>
        )}

        {step === 2 && (
          <section className="space-y-2.5" aria-label={stepTitle}>
            <ol className="space-y-2.5">
              {habits.map((h, idx) => {
                const Icon = HABIT_ICON[h];
                const label = t(`onboarding.habit.${h}`);
                return (
                  <li
                    key={h}
                    data-habit={h}
                    className={`rounded-card border shadow-elev-1 bg-brand-deep ${
                      idx === 0 ? 'border-brand-emerald/50' : 'border-brand-border'
                    }`}
                  >
                    <div className="flex items-center gap-3 p-3 pl-4">
                      <span
                        className="w-6 text-center font-display font-bold text-brand-gold tabular-nums shrink-0"
                        aria-hidden="true"
                      >
                        {formatLocaleNumber(idx + 1)}
                      </span>
                      <span className="w-10 h-10 rounded-control bg-brand-emerald/15 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-brand-emerald" aria-hidden="true" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-white font-bold text-sm">{label}</span>
                        <span className="block text-white/70 text-xs mt-0.5 leading-snug">
                          {t(`onboarding.habitDetail.${h}`)}
                        </span>
                      </span>
                      <span className="flex flex-col shrink-0">
                        <button
                          type="button"
                          onClick={() => setHabits((cur) => moveHabit(cur, h, -1))}
                          disabled={idx === 0}
                          aria-label={t('onboarding.moveUp', 'Move {{habit}} up', { habit: label })}
                          className="w-11 h-9 min-h-0 flex items-center justify-center rounded-control text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30"
                        >
                          <ChevronUpIcon className="w-5 h-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHabits((cur) => moveHabit(cur, h, 1))}
                          disabled={idx === habits.length - 1}
                          aria-label={t('onboarding.moveDown', 'Move {{habit}} down', {
                            habit: label,
                          })}
                          className="w-11 h-9 min-h-0 flex items-center justify-center rounded-control text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-30"
                        >
                          <ChevronDownIcon className="w-5 h-5" aria-hidden="true" />
                        </button>
                      </span>
                    </div>

                    {h === 'zikr' && (
                      <GoalChips
                        label={t('onboarding.zikrGoal', 'Daily zikr goal')}
                        options={ZIKR_GOAL_OPTIONS}
                        value={zikrPick}
                        onChange={setZikrTarget}
                        format={(n) => formatLocaleNumber(n)}
                      />
                    )}
                    {h === 'quran' && (
                      <GoalChips
                        label={t('onboarding.quranGoal', 'Daily Quran goal')}
                        options={QURAN_AYAT_OPTIONS}
                        value={quranPick}
                        onChange={setQuranAyat}
                        format={(n) =>
                          t('onboarding.ayatCount', '{{n}} āyāt', { n: formatLocaleNumber(n) })
                        }
                      />
                    )}
                    <label className="flex items-center gap-3 px-4 py-1 border-t border-brand-border/60 cursor-pointer">
                      <span className="flex-1 min-w-0 text-xs leading-snug">
                        <span className="block text-white/85 font-semibold">
                          {homeOn[h]
                            ? t('onboarding.onHome', 'On Home')
                            : t('onboarding.notOnHome', 'Not on Home')}
                        </span>
                        {h === 'salat' && (
                          <span className="block text-white/60">
                            {t(
                              'onboarding.salatOnHome',
                              'As the prayer timeline. The prayer row in the arch always stays.'
                            )}
                          </span>
                        )}
                      </span>
                      <span className="w-11 h-11 shrink-0 flex items-center justify-center">
                        <input
                          type="checkbox"
                          className="toggle toggle-success toggle-sm"
                          checked={homeOn[h]}
                          onChange={(e) => setHomeOn((cur) => ({ ...cur, [h]: e.target.checked }))}
                          aria-label={t('onboarding.showOnHome', 'Show {{habit}} on Home', {
                            habit: label,
                          })}
                        />
                      </span>
                    </label>
                  </li>
                );
              })}
            </ol>

            <label className="flex items-center gap-3 p-4 rounded-card border border-brand-border bg-brand-deep shadow-elev-1 cursor-pointer">
              <span className="flex-1 min-w-0">
                <span className="block text-white font-bold text-sm">
                  {t('onboarding.goalsTitle', "Today's goals card")}
                </span>
                <span className="block text-white/70 text-xs mt-0.5 leading-snug">
                  {noSection
                    ? t(
                        'onboarding.goalsKept',
                        'With no habit on Home, the goals card stays so Home is never empty.'
                      )
                    : t('onboarding.goalsDetail', 'Your progress towards each daily goal.')}
                </span>
              </span>
              <input
                type="checkbox"
                className="toggle toggle-success shrink-0"
                checked={goalsOn}
                disabled={noSection}
                onChange={(e) => setGoalsPick(e.target.checked)}
                aria-label={t('onboarding.goalsTitle', "Today's goals card")}
              />
            </label>
          </section>
        )}

        <div className="mt-6">
          {step < STEPS - 1 ? (
            <button onClick={next} className={`${BTN_PRIMARY} w-full min-h-[48px]`}>
              {step === 0 && !location
                ? t('onboarding.nextNoLocation', 'Continue without location')
                : t('onboarding.next', 'Next')}
            </button>
          ) : (
            <button
              onClick={() => void finish()}
              disabled={saving}
              className={`${BTN_PRIMARY} w-full min-h-[48px]`}
            >
              {t('onboarding.finish', 'Start')}
            </button>
          )}
          <p className="text-white/50 text-xs text-center mt-3 leading-relaxed">
            {t('onboarding.changeLater', 'You can change any of this later in Settings.')}
          </p>
        </div>
      </div>
    </div>
  );
}

function GoalChips({
  label,
  options,
  value,
  onChange,
  format,
}: {
  label: string;
  options: readonly number[];
  value: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
}) {
  return (
    <div className="px-4 pb-4 -mt-1" role="radiogroup" aria-label={label}>
      <p className="text-white/70 text-xs font-semibold mb-2">{label}</p>
      <div className="flex gap-2">
        {options.map((n) => (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={`flex-1 min-h-[44px] rounded-control border text-sm font-bold tabular-nums transition-colors ${
              value === n ? OPTION_ON : OPTION_OFF
            }`}
          >
            {format(n)}
          </button>
        ))}
      </div>
    </div>
  );
}
