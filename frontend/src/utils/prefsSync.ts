// Cross-device preference sync.
//
// Every setting still lives in plain localStorage (dozens of call sites read
// them synchronously on render), and this module layers sync on top:
//  - a patched localStorage.setItem notices writes to a whitelisted key,
//    stamps it with the time of the change, and pushes it (debounced);
//  - on sign-in / tab focus we pull the server's copy and, per key, keep
//    whichever side changed most recently.
// To sync a new setting, add its key to SYNCED_KEYS here AND to
// SYNCED_PREF_KEYS in backend/src/services/userPrefs.service.ts.

import api from '../lib/api.js';
import { useUiStore } from '../store/useUiStore.js';
import i18n from '../i18n.js';

export const SYNCED_KEYS: readonly string[] = [
  'bustandeen_reduce_motion',
  'bustandeen_high_contrast',
  'bustandeen_noor_alltime',
  'bustandeen_noor_today',
  'bustandeen_vibration',
  'bustandeen_zikr_sound',
  'bustandeen_tasbih_mode',
  'bustandeen_tasbih_target',
  'bustandeen_zikr_audio',
  'bustandeen_zikr_volume',
  'bustandeen_zikr_hidden',
  'bustandeen_share_card_prefs',
  'bustandeen_lang',
  'bustandeen_discreet_mode',
  'bustandeen_cycle_height_unit',
  'bustandeen_cycle_weight_unit',
  'bustandeen_hide_bmi',
  'bustandeen_tasbih_breakdown',
  'bustandeen_salat_auto_count',
  'bustandeen_show_sunnah_guide',
  'bustandeen_show_nafl_guide',
  'bustandeen_asr_madhab',
  'bustandeen_calc_method',
  'bustandeen_musafir',
  'bustandeen_musafir_history',
  'bustandeen_musafir_kaza_rule',
  'bustandeen_arabic_font',
  'bustandeen_qfs_arabic',
  'bustandeen_qfs_translation',
  'bustandeen_qfs_translit',
  'bustandeen_qfs_tafsir',
  'bustandeen_quran_translit',
  'bustandeen_quran_listen_counts',
  'bustandeen_reciter',
  'bustandeen_quran_translations',
  'bustandeen_tafsir_edition',
];

const SYNCED = new Set(SYNCED_KEYS);
const TS_KEY = 'bustandeen_prefs_ts';
const UID_KEY = 'bustandeen_prefs_uid';
const PUSH_DEBOUNCE_MS = 1200;
/** A value that existed before sync shipped: older than any real change. */
const LEGACY_TS = 1;

type Entry = { v: string; t: number };
type TsMap = Record<string, number>;

// Kept as the originals so our own writes (applying server values) bypass stamping.
const rawSet = Storage.prototype.setItem;
const rawGet = Storage.prototype.getItem;
const rawRemove = Storage.prototype.removeItem;

let installed = false;
/** Only stamp/push writes once the initial pull is done: at startup the app
 * (and i18n) write defaults that must not count as user changes. */
let stampingOn = false;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
const dirty = new Set<string>();

function readTs(): TsMap {
  try {
    const raw = rawGet.call(localStorage, TS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    return parsed && typeof parsed === 'object' ? (parsed as TsMap) : {};
  } catch {
    return {};
  }
}
function writeTs(ts: TsMap): void {
  try {
    rawSet.call(localStorage, TS_KEY, JSON.stringify(ts));
  } catch {
    /* storage full/blocked: sync degrades to best effort */
  }
}
const getLocal = (key: string): string | null => {
  try {
    return rawGet.call(localStorage, key);
  } catch {
    return null;
  }
};

function install(): void {
  if (installed) return;
  installed = true;
  Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
    const tracked = this === localStorage && SYNCED.has(key);
    const before = tracked ? getLocal(key) : null;
    rawSet.call(this, key, value);
    if (!tracked || !stampingOn) return;
    if (before === String(value)) return; // not an actual change
    const ts = readTs();
    ts[key] = Date.now();
    writeTs(ts);
    dirty.add(key);
    schedulePush();
  };
}

function schedulePush(): void {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushDirty(), PUSH_DEBOUNCE_MS);
}

async function pushDirty(): Promise<void> {
  if (!dirty.size) return;
  const keys = [...dirty];
  const ts = readTs();
  const prefs: Record<string, Entry> = {};
  for (const k of keys) {
    const v = getLocal(k);
    if (v !== null) prefs[k] = { v, t: ts[k] ?? Date.now() };
  }
  dirty.clear();
  if (!Object.keys(prefs).length) return;
  try {
    await api.put('/api/user/prefs', { prefs });
  } catch {
    // Offline or server hiccup: keep them queued for the next attempt.
    keys.forEach((k) => dirty.add(k));
  }
}

/** Reset synced keys when a different account signs in on this device, so one
 * account's settings never leak into another's. */
function isolateAccount(uid: string): void {
  const last = getLocal(UID_KEY);
  if (last && last !== uid) {
    for (const k of SYNCED_KEYS) rawRemove.call(localStorage, k);
    rawRemove.call(localStorage, TS_KEY);
  }
  rawSet.call(localStorage, UID_KEY, uid);
}

/**
 * Pull the server's preferences and reconcile per key (newest change wins),
 * pushing anything this device has that is newer. Returns true if any local
 * value changed. Never throws.
 */
export async function syncPrefsNow(): Promise<boolean> {
  let server: Record<string, Entry>;
  try {
    const res = await api.get<{ ok: boolean; prefs: Record<string, Entry> }>('/api/user/prefs');
    server = res.data.prefs ?? {};
  } catch {
    return false;
  }

  const ts = readTs();
  const toPush: Record<string, Entry> = {};
  let changed = false;
  let langChanged = false;

  for (const key of SYNCED_KEYS) {
    const local = getLocal(key);
    const localT = ts[key] ?? (local !== null ? LEGACY_TS : 0);
    const remote = server[key];

    if (remote && remote.t > localT) {
      if (local !== remote.v) {
        rawSet.call(localStorage, key, remote.v);
        changed = true;
        if (key === 'bustandeen_lang') langChanged = true;
      }
      ts[key] = remote.t;
    } else if (local !== null && (!remote || localT > remote.t)) {
      toPush[key] = { v: local, t: localT };
      ts[key] = localT;
    }
  }
  writeTs(ts);

  if (Object.keys(toPush).length) {
    try {
      await api.put('/api/user/prefs', { prefs: toPush });
    } catch {
      Object.keys(toPush).forEach((k) => dirty.add(k));
    }
  }

  if (langChanged) {
    const lng = getLocal('bustandeen_lang');
    if (lng) void i18n.changeLanguage(lng);
  }
  return changed;
}

let focusHandler: (() => void) | null = null;
let lastFocusSync = 0;

/** Start syncing for the signed-in user. Safe to call repeatedly. */
export async function startPrefsSync(uid: string): Promise<void> {
  install();
  stampingOn = false;
  isolateAccount(uid);

  const changed = await syncPrefsNow();
  // Settings that changed underneath already-mounted screens: refresh the
  // zustand-held ones and remount routes so plain-localStorage readers re-read.
  if (changed) useUiStore.getState().reloadFromStorage(true);
  stampingOn = true;
  lastFocusSync = Date.now();

  if (focusHandler) document.removeEventListener('visibilitychange', focusHandler);
  focusHandler = () => {
    if (document.visibilityState === 'hidden') {
      clearTimeout(pushTimer);
      void pushDirty();
      return;
    }
    // Coming back to the tab: pick up changes made on another device.
    if (Date.now() - lastFocusSync < 30_000) return;
    lastFocusSync = Date.now();
    void pushDirty().then(() =>
      syncPrefsNow().then((c) => {
        if (c) useUiStore.getState().reloadFromStorage(false);
      })
    );
  };
  document.addEventListener('visibilitychange', focusHandler);
}

/** Stop on sign-out; the next sign-in re-checks the account. */
export function stopPrefsSync(): void {
  stampingOn = false;
  clearTimeout(pushTimer);
  dirty.clear();
  if (focusHandler) document.removeEventListener('visibilitychange', focusHandler);
  focusHandler = null;
}
