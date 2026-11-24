/**
 * The visitor's answer to "may we count page visits?" (audit 2026-11-16 P2-10). Analytics is OFF
 * until the answer is a yes: "unset" and "denied" both mean no. The answer is kept on this device
 * only (localStorage) and never sent to our server. If storage is blocked, nothing is saved, the
 * banner asks again next visit, and this visit still follows the answer it was given.
 */
export type Consent = 'granted' | 'denied' | 'unset';

export const CONSENT_KEY = 'bustandeen_analytics_consent';

type Listener = (consent: 'granted' | 'denied') => void;
const listeners = new Set<Listener>();
/** Kept for a visit where storage is blocked. */
let inMemory: Consent = 'unset';

export function readConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === 'granted' || v === 'denied') return v;
    return 'unset';
  } catch {
    return inMemory;
  }
}

export function writeConsent(value: 'granted' | 'denied'): void {
  inMemory = value;
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked: the answer holds for this visit only */
  }
  listeners.forEach((fn) => fn(value));
}

/** Calls `fn` whenever the answer changes, here or (via the storage event) in another tab. Returns a stop function. */
export function onConsentChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  // Another tab of this browser changed the answer: follow it.
  window.addEventListener('storage', (e) => {
    if (e.key !== CONSENT_KEY) return;
    const v = readConsent();
    if (v === 'granted' || v === 'denied') listeners.forEach((fn) => fn(v));
  });
}
