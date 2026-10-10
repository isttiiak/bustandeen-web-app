import { create } from 'zustand';
import {
  HOME_SPECIAL_KEY,
  parseHomeSpecialLayout,
  type HomeSpecialLayout,
} from '../utils/homeSpecial.js';

interface UiState {
  /** Bumped when a cross-device sync changed settings at session start, so the
   * routes remount and re-read plain-localStorage prefs (see App.tsx). */
  prefsRevision: number;
  /** Re-read all persisted prefs after sync rewrote localStorage. */
  reloadFromStorage: (remount?: boolean) => void;
  /** Settings choice (T3.5): 'auto' follows the device's reduce-motion setting */
  reduceMotionMode: ReduceMotionMode;
  /** The device asks for reduced motion (prefers-reduced-motion) */
  osReducedMotion: boolean;
  /** In force now: 'on', or 'auto' while the device asks for it */
  reduceMotion: boolean;
  highContrast: boolean;
  /** Haptic pulse on each zikr count tap (mobile browsers only) */
  vibrationEnabled: boolean;
  /** Subtle click sound on each zikr count tap */
  zikrSoundEnabled: boolean;
  /** Tasbih mode: count DOWN from tasbihTarget for the selected dhikr, with
   * a distinct completion feedback at 0 (a session-scoped countdown, not
   * tied to the dhikr's lifetime total). */
  tasbihMode: boolean;
  /** How many counts one tasbih segment is worth (33/34/99/100/custom) */
  tasbihTarget: number;
  /** Master toggle for zikr audio playback features */
  zikrAudioEnabled: boolean;
  /** Volume for zikr audio (0–1) */
  zikrAudioVolume: number;
  /** Play the dhikr's audio on every count tap (opt-in, off by default). A tap
   * while it is still playing lets it finish instead of restarting it. */
  zikrPlayOnTap: boolean;
  /** Rayhanah discreet mode: swaps the pink 🌸 "Rayhanah"/cycle-day wording
   * on the home screen and nav for a neutral "Wellness" label — for a
   * shared device or over-the-shoulder scenario. Purely cosmetic/local; the
   * underlying data and page are unaffected once she's actually on /cycle. */
  discreetMode: boolean;
  /** Rayhanah body-stats display units (values are always stored metric) */
  cycleHeightUnit: 'm' | 'ft';
  cycleWeightUnit: 'kg' | 'lbs';
  /** Hide the BMI card on Rayhanah analytics (local preference) */
  hideBmi: boolean;
  /** How Home shows today's special days (utils/homeSpecial.ts) */
  homeSpecialLayout: HomeSpecialLayout;
  setHomeSpecialLayout: (val: HomeSpecialLayout) => void;
  /** Home timeline: morning/evening adhkār cards while their window is open. */
  homeAdhkar: boolean;
  setHomeAdhkar: (val: boolean) => void;
  setCycleHeightUnit: (val: 'm' | 'ft') => void;
  setCycleWeightUnit: (val: 'kg' | 'lbs') => void;
  setHideBmi: (val: boolean) => void;
  setReduceMotionMode: (mode: ReduceMotionMode) => void;
  setOsReducedMotion: (val: boolean) => void;
  setHighContrast: (val: boolean) => void;
  setVibrationEnabled: (val: boolean) => void;
  setZikrSoundEnabled: (val: boolean) => void;
  setTasbihMode: (val: boolean) => void;
  setTasbihTarget: (val: number) => void;
  setZikrAudioEnabled: (val: boolean) => void;
  setZikrAudioVolume: (val: number) => void;
  setZikrPlayOnTap: (val: boolean) => void;
  setDiscreetMode: (val: boolean) => void;
}

export type ReduceMotionMode = 'auto' | 'on' | 'off';

/** 'on' / 'off' / 'auto'. Before T3.5 the key held '1' (on) or '0' (the
 * default, never chosen), so '1' stays on and anything else is auto. */
export function parseReduceMotionMode(raw: string | null): ReduceMotionMode {
  if (raw === 'on' || raw === '1') return 'on';
  if (raw === 'off') return 'off';
  return 'auto';
}

function osPrefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function effectiveReduceMotion(mode: ReduceMotionMode, os: boolean): boolean {
  return mode === 'on' || (mode === 'auto' && os);
}

type StoredPrefs = Pick<
  UiState,
  | 'reduceMotionMode'
  | 'highContrast'
  | 'vibrationEnabled'
  | 'zikrSoundEnabled'
  | 'tasbihMode'
  | 'tasbihTarget'
  | 'zikrAudioEnabled'
  | 'zikrAudioVolume'
  | 'zikrPlayOnTap'
  | 'discreetMode'
  | 'cycleHeightUnit'
  | 'cycleWeightUnit'
  | 'hideBmi'
  | 'homeSpecialLayout'
  | 'homeAdhkar'
>;

/** Reads every persisted UI preference from localStorage. Used for the initial
 * state and again after cross-device sync (utils/prefsSync.ts) rewrites storage. */
function readStoredPrefs(): StoredPrefs {
  return {
    reduceMotionMode: parseReduceMotionMode(localStorage.getItem('bustandeen_reduce_motion')),
    highContrast: localStorage.getItem('bustandeen_high_contrast') === '1',
    vibrationEnabled: localStorage.getItem('bustandeen_vibration') !== '0',
    zikrSoundEnabled: localStorage.getItem('bustandeen_zikr_sound') === '1',
    tasbihMode: localStorage.getItem('bustandeen_tasbih_mode') === '1',
    tasbihTarget: Math.max(
      1,
      parseInt(localStorage.getItem('bustandeen_tasbih_target') || '33', 10) || 33
    ),
    zikrAudioEnabled: localStorage.getItem('bustandeen_zikr_audio') !== '0',
    zikrAudioVolume: parseFloat(localStorage.getItem('bustandeen_zikr_volume') || '0.7'),
    zikrPlayOnTap: localStorage.getItem('bustandeen_zikr_play_on_tap') === '1',
    discreetMode: localStorage.getItem('bustandeen_discreet_mode') === '1',
    cycleHeightUnit: localStorage.getItem('bustandeen_cycle_height_unit') === 'ft' ? 'ft' : 'm',
    cycleWeightUnit: localStorage.getItem('bustandeen_cycle_weight_unit') === 'lbs' ? 'lbs' : 'kg',
    hideBmi: localStorage.getItem('bustandeen_hide_bmi') === '1',
    homeSpecialLayout: parseHomeSpecialLayout(localStorage.getItem(HOME_SPECIAL_KEY)),
    homeAdhkar: localStorage.getItem('bustandeen_home_adhkar') !== '0',
  };
}

const initialPrefs = readStoredPrefs();
const initialOs = osPrefersReducedMotion();

export const useUiStore = create<UiState>((set) => ({
  ...initialPrefs,
  osReducedMotion: initialOs,
  reduceMotion: effectiveReduceMotion(initialPrefs.reduceMotionMode, initialOs),
  prefsRevision: 0,
  reloadFromStorage: (remount) =>
    set((st) => {
      const prefs = readStoredPrefs();
      return {
        ...prefs,
        reduceMotion: effectiveReduceMotion(prefs.reduceMotionMode, st.osReducedMotion),
        prefsRevision: remount ? st.prefsRevision + 1 : st.prefsRevision,
      };
    }),

  setCycleHeightUnit: (val) => {
    localStorage.setItem('bustandeen_cycle_height_unit', val);
    set({ cycleHeightUnit: val });
  },

  setCycleWeightUnit: (val) => {
    localStorage.setItem('bustandeen_cycle_weight_unit', val);
    set({ cycleWeightUnit: val });
  },

  setHideBmi: (val) => {
    localStorage.setItem('bustandeen_hide_bmi', val ? '1' : '0');
    set({ hideBmi: !!val });
  },

  setReduceMotionMode: (mode) => {
    localStorage.setItem('bustandeen_reduce_motion', mode);
    set((st) => ({
      reduceMotionMode: mode,
      reduceMotion: effectiveReduceMotion(mode, st.osReducedMotion),
    }));
  },

  setOsReducedMotion: (val) =>
    set((st) => ({
      osReducedMotion: val,
      reduceMotion: effectiveReduceMotion(st.reduceMotionMode, val),
    })),

  setHighContrast: (val) => {
    localStorage.setItem('bustandeen_high_contrast', val ? '1' : '0');
    set({ highContrast: !!val });
  },

  setVibrationEnabled: (val) => {
    localStorage.setItem('bustandeen_vibration', val ? '1' : '0');
    set({ vibrationEnabled: !!val });
  },

  setZikrSoundEnabled: (val) => {
    localStorage.setItem('bustandeen_zikr_sound', val ? '1' : '0');
    set({ zikrSoundEnabled: !!val });
  },

  setTasbihMode: (val) => {
    localStorage.setItem('bustandeen_tasbih_mode', val ? '1' : '0');
    set({ tasbihMode: !!val });
  },

  setTasbihTarget: (val) => {
    const clamped = Math.max(1, Math.min(1000, Math.round(val) || 33));
    localStorage.setItem('bustandeen_tasbih_target', String(clamped));
    set({ tasbihTarget: clamped });
  },

  setZikrAudioEnabled: (val) => {
    localStorage.setItem('bustandeen_zikr_audio', val ? '1' : '0');
    set({ zikrAudioEnabled: !!val });
  },

  setZikrAudioVolume: (val) => {
    const clamped = Math.max(0, Math.min(1, val));
    localStorage.setItem('bustandeen_zikr_volume', String(clamped));
    set({ zikrAudioVolume: clamped });
  },

  setZikrPlayOnTap: (val) => {
    localStorage.setItem('bustandeen_zikr_play_on_tap', val ? '1' : '0');
    set({ zikrPlayOnTap: !!val });
  },

  setHomeSpecialLayout: (val) => {
    localStorage.setItem(HOME_SPECIAL_KEY, val);
    set({ homeSpecialLayout: val });
  },

  setHomeAdhkar: (val) => {
    localStorage.setItem('bustandeen_home_adhkar', val ? '1' : '0');
    set({ homeAdhkar: !!val });
  },

  setDiscreetMode: (val) => {
    localStorage.setItem('bustandeen_discreet_mode', val ? '1' : '0');
    set({ discreetMode: !!val });
  },
}));
