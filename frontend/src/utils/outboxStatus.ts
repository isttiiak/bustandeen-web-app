import toast from 'react-hot-toast';
import i18n from '../i18n.js';

// What the person sees when an offline outbox cannot deliver (audit P1-5).
// Fixed toast ids: however many writes are stuck, one calm message shows.

const STUCK_ID = 'outbox-stuck';

/** The queue has failed more than once for a reason that is not "offline". */
export function notifyOutboxStuck(): void {
  toast.error(
    i18n.t('common.outboxStuck', {
      defaultValue:
        'Some of your changes are not saved to your account yet. They are kept on this device and we will keep trying.',
    }),
    { id: STUCK_ID, duration: 8000 }
  );
}

/** The queue delivered everything: drop the "stuck" message. */
export function clearOutboxStuck(): void {
  toast.dismiss(STUCK_ID);
}

/** A prayer update the server refused for good, or one too old to send. */
export function notifySalatUpdateDropped(): void {
  toast.error(
    i18n.t('common.salatUpdateDropped', {
      defaultValue:
        'A prayer update you made earlier could not be saved. Please check that day and mark it again.',
    }),
    { id: 'salat-outbox-dropped', duration: 9000 }
  );
}
