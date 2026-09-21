import { create } from 'zustand';

interface UiState {
  /** Bumped when a cross-device sync changed settings at session start, so the
   * routes remount and re-read plain-localStorage prefs (see App.tsx). */
  prefsRevision: number;
  /** Re-read all persisted prefs after sync rewrote localStorage. */
  reloadFromStorage: (remount?: boolean) => void;
  reduceMotion: boolean;
  highContrast: boolean;
  /** Show all-time Noor in the navbar on every page (default: friends page only) */
  showNoorAllTime: boolean;
  /** Show today's Noor in the navbar on every page (default: friends page only) */
  showNoorToday: boolean;
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
  setCycleHeightUnit: (val: 'm' | 'ft') => void;
  setCycleWeightUnit: (val: 'kg' | 'lbs') => void;
  setHideBmi: (val: boolean) => void;
  setReduceMotion: (val: boolean) => void;
  setHighContrast: (val: boolean) => void;
  setShowNoorAllTime: (val: boolean) => void;
  setShowNoorToday: (val: boolean) => void;
  setVibrationEnabled: (val: boolean) => void;
  setZikrSoundEnabled: (val: boolean) => void;
  setTasbihMode: (val: boolean) => void;
  setTasbihTarget: (val: number) => void;
  setZikrAudioEnabled: (val: boolean) => void;
  setZikrAudioVolume: (val: number) => void;
  setDiscreetMode: (val: boolean) => void;
}

type StoredPrefs = Pick<
  UiState,
  | 'reduceMotion'
  | 'highContrast'
  | 'showNoorAllTime'
  | 'showNoorToday'
  | 'vibrationEnabled'
  | 'zikrSoundEnabled'
  | 'tasbihMode'
  | 'tasbihTarget'
  | 'zikrAudioEnabled'
  | 'zikrAudioVolume'
  | 'discreetMode'
  | 'cycleHeightUnit'
  | 'cycleWeightUnit'
  | 'hideBmi'
>;

/** Reads every persisted UI preference from localStorage. Used for the initial
 * state and again after cross-device sync (utils/prefsSync.ts) rewrites storage. */
function readStoredPrefs(): StoredPrefs {
  return {
    reduceMotion: localStorage.getItem('bustandeen_reduce_motion') === '1',
    highContrast: localStorage.getItem('bustandeen_high_contrast') === '1',
    showNoorAllTime: localStorage.getItem('bustandeen_noor_alltime') === '1',
    showNoorToday: localStorage.getItem('bustandeen_noor_today') === '1',
    vibrationEnabled: localStorage.getItem('bustandeen_vibration') !== '0',
    zikrSoundEnabled: localStorage.getItem('bustandeen_zikr_sound') === '1',
    tasbihMode: localStorage.getItem('bustandeen_tasbih_mode') === '1',
    tasbihTarget: Math.max(
      1,
      parseInt(localStorage.getItem('bustandeen_tasbih_target') || '33', 10) || 33
    ),
    zikrAudioEnabled: localStorage.getItem('bustandeen_zikr_audio') !== '0',
    zikrAudioVolume: parseFloat(localStorage.getItem('bustandeen_zikr_volume') || '0.7'),
    discreetMode: localStorage.getItem('bustandeen_discreet_mode') === '1',
    cycleHeightUnit: localStorage.getItem('bustandeen_cycle_height_unit') === 'ft' ? 'ft' : 'm',
    cycleWeightUnit: localStorage.getItem('bustandeen_cycle_weight_unit') === 'lbs' ? 'lbs' : 'kg',
    hideBmi: localStorage.getItem('bustandeen_hide_bmi') === '1',
  };
}

export const useUiStore = create<UiState>((set) => ({
  ...readStoredPrefs(),
  prefsRevision: 0,
  reloadFromStorage: (remount) =>
    set((st) => ({
      ...readStoredPrefs(),
      prefsRevision: remount ? st.prefsRevision + 1 : st.prefsRevision,
    })),

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

  setReduceMotion: (val) => {
    localStorage.setItem('bustandeen_reduce_motion', val ? '1' : '0');
    set({ reduceMotion: !!val });
  },

  setHighContrast: (val) => {
    localStorage.setItem('bustandeen_high_contrast', val ? '1' : '0');
    set({ highContrast: !!val });
  },

  setShowNoorAllTime: (val) => {
    localStorage.setItem('bustandeen_noor_alltime', val ? '1' : '0');
    set({ showNoorAllTime: !!val });
  },

  setShowNoorToday: (val) => {
    localStorage.setItem('bustandeen_noor_today', val ? '1' : '0');
    set({ showNoorToday: !!val });
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

  setDiscreetMode: (val) => {
    localStorage.setItem('bustandeen_discreet_mode', val ? '1' : '0');
    set({ discreetMode: !!val });
  },
}));
