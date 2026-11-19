/**
 * Upper bounds for lists a person (or someone else) can add to (audit
 * 2026-11-16 P1-12). Each is far above real use; they exist so one account
 * cannot grow a document without end.
 */

/** Zikr names in the dropdown. The backup import and day correction already stop at 200. */
export const MAX_ZIKR_TYPES = 200;
/** Lifetime-total keys. Removing a type keeps its total, so this outlives the list above. */
export const MAX_ZIKR_TOTAL_KEYS = 1000;
/** Friend requests waiting for an answer, per direction. */
export const MAX_PENDING_REQUESTS = 100;
/** People one account has blocked. */
export const MAX_BLOCKED = 500;

/** An error the global handler turns into this status. */
export function limitError(message: string): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode: 409 });
}
