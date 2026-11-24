import { useSyncExternalStore } from 'react';
import { onConsentChange, readConsent, type Consent } from '../utils/analyticsConsent.js';

/** The visitor's current answer to "may we count page visits?", live. */
export function useAnalyticsConsent(): Consent {
  return useSyncExternalStore(
    (notify) => onConsentChange(notify),
    readConsent,
    () => 'unset'
  );
}
