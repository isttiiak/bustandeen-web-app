import { useEffect, useState } from 'react';
import {
  DevicePhoneMobileIcon,
  MoonIcon,
  QueueListIcon,
  RectangleStackIcon,
  SunIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { SunriseIcon } from '../icons/IslamicIcons.js';
import { useUiStore, type ReduceMotionMode } from '../../store/useUiStore.js';
import type { HomeSpecialLayout } from '../../utils/homeSpecial.js';
import { getThemeMode, setThemeMode, THEME_MODE_EVENT, type ThemeMode } from '../../utils/theme.js';
import { OPTION_OFF, OPTION_ON, type SvgIcon } from './settingsParts.js';

const THEME_ICONS: Record<ThemeMode, SvgIcon> = {
  system: DevicePhoneMobileIcon,
  dark: MoonIcon,
  light: SunIcon,
  daylight: SunriseIcon,
};

export function ThemeModePicker({ t }: { t: (key: string) => string }) {
  const [mode, setMode] = useState<ThemeMode>(getThemeMode);
  // The navbar toggle can change the mode while this screen is open.
  useEffect(() => {
    const sync = () => setMode(getThemeMode());
    window.addEventListener(THEME_MODE_EVENT, sync);
    return () => window.removeEventListener(THEME_MODE_EVENT, sync);
  }, []);
  const options: { mode: ThemeMode; label: string; detail: string }[] = [
    { mode: 'system', label: t('settings.themeSystem'), detail: t('settings.themeSystemDetail') },
    { mode: 'dark', label: t('settings.themeDark'), detail: t('settings.themeDarkDetail') },
    { mode: 'light', label: t('settings.themeLight'), detail: t('settings.themeLightDetail') },
    {
      mode: 'daylight',
      label: t('settings.themeDaylight'),
      detail: t('settings.themeDaylightDetail'),
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('settings.appearanceSection')}
      className="grid grid-cols-1 sm:grid-cols-2 gap-2"
    >
      {options.map(({ mode: m, label, detail }) => {
        const Icon = THEME_ICONS[m];
        const on = mode === m;
        return (
          <button
            key={m}
            role="radio"
            aria-checked={on}
            onClick={() => {
              setThemeMode(m);
              setMode(m);
            }}
            className={`flex items-start gap-3 text-left p-3 rounded-control border transition-colors ${
              on ? OPTION_ON : OPTION_OFF
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-brand-emerald' : ''}`} />
            <span className="min-w-0">
              <span className="block font-semibold text-sm">{label}</span>
              <span className="block text-xs text-white/70 mt-0.5 leading-snug">{detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Reduce animations: Auto (follows the device), On, Off (T3.5). */
export function ReduceMotionPicker({ t }: { t: (key: string) => string }) {
  const mode = useUiStore((s) => s.reduceMotionMode);
  const setMode = useUiStore((s) => s.setReduceMotionMode);
  const options: { value: ReduceMotionMode; label: string }[] = [
    { value: 'auto', label: t('settings.reduceMotionAuto') },
    { value: 'on', label: t('settings.reduceMotionOn') },
    { value: 'off', label: t('settings.reduceMotionOff') },
  ];
  return (
    <div className="p-3 rounded-control border border-brand-border bg-brand-surface/50">
      <p id="reduce-motion-title" className="font-semibold text-white text-sm">
        {t('settings.reduceMotion')}
      </p>
      <p className="text-white/70 text-xs leading-snug mt-0.5">
        {t('settings.reduceMotionDetail')}
      </p>
      <div
        role="radiogroup"
        aria-labelledby="reduce-motion-title"
        className="grid grid-cols-3 gap-1.5 mt-2.5"
      >
        {options.map(({ value, label }) => {
          const on = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setMode(value)}
              className={`min-h-[44px] rounded-control border text-xs font-bold transition-colors ${
                on ? OPTION_ON : OPTION_OFF
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const HOME_SPECIAL_ICONS: Record<HomeSpecialLayout, SvgIcon> = {
  full: RectangleStackIcon,
  strip: QueueListIcon,
  pills: TagIcon,
};

/** Settings → Home: how much Home shows about today's special days
 * (utils/homeSpecial.ts). Synced across devices like the other UI prefs. */
export function HomeSpecialPicker({ t }: { t: (key: string) => string }) {
  const layout = useUiStore((s) => s.homeSpecialLayout);
  const setLayout = useUiStore((s) => s.setHomeSpecialLayout);
  const options: { mode: HomeSpecialLayout; label: string; detail: string }[] = [
    {
      mode: 'full',
      label: t('settings.homeSpecialFull'),
      detail: t('settings.homeSpecialFullDetail'),
    },
    {
      mode: 'strip',
      label: t('settings.homeSpecialStrip'),
      detail: t('settings.homeSpecialStripDetail'),
    },
    {
      mode: 'pills',
      label: t('settings.homeSpecialPills'),
      detail: t('settings.homeSpecialPillsDetail'),
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t('settings.homeSection')}
      className="grid grid-cols-1 sm:grid-cols-3 gap-2"
    >
      {options.map(({ mode, label, detail }) => {
        const Icon = HOME_SPECIAL_ICONS[mode];
        const on = layout === mode;
        return (
          <button
            key={mode}
            role="radio"
            aria-checked={on}
            onClick={() => setLayout(mode)}
            className={`flex items-start gap-3 text-left p-3 rounded-control border transition-colors ${
              on ? OPTION_ON : OPTION_OFF
            }`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${on ? 'text-brand-emerald' : ''}`} />
            <span className="min-w-0">
              <span className="block font-semibold text-sm">{label}</span>
              <span className="block text-xs text-white/70 mt-0.5 leading-snug">{detail}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
