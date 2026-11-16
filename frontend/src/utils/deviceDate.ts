import toast from 'react-hot-toast';
import i18n from '../i18n.js';

/**
 * The server refuses a "today" that is impossible for any place on earth right
 * now (audit 2026-11-16 P0-3) and answers 400 with `code: 'client_day_mismatch'`.
 * The usual cause is a device clock set to the wrong date. Without a message the
 * app looked broken: reads came back empty and saves quietly did not happen.
 */
export const DEVICE_DATE_CODE = 'client_day_mismatch';

/** True when a 400 response body is the server's wrong-device-date refusal. */
export function isDeviceDateError(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as { code?: unknown }).code === DEVICE_DATE_CODE
  );
}

/** One calm message, however many requests fail at once (fixed toast id). */
export function notifyDeviceDateWrong(): void {
  toast.error(
    i18n.t('common.deviceDateWrong', {
      defaultValue:
        "The date on your device does not match today's date, so some things may not load or save. Set the date and time on your device to automatic, then try again.",
    }),
    { id: 'device-date', duration: 9000 }
  );
}
