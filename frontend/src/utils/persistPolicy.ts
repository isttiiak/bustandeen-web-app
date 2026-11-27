// Which React Query results are saved to IndexedDB (main.tsx) so a reload paints
// at once. The saved copy is plain text on the device for up to a day, so:
//  - demo answers are never saved (U9): a later real sign-in must not start from them;
//  - Rayhanah (cycle) data is never saved. The server keeps it encrypted
//    (fieldCrypto), and it must not sit readable in a shared or borrowed
//    browser either. It is fetched again on each visit instead.
//  - only successful results are saved.

/** Query key roots that are never written to the on-device cache. */
export const NEVER_PERSISTED = ['cycle'] as const;

export function shouldPersistQuery(
  queryKey: readonly unknown[],
  status: string,
  isDemoMode: boolean
): boolean {
  if (isDemoMode || status !== 'success') return false;
  return !(NEVER_PERSISTED as readonly unknown[]).includes(queryKey[0]);
}
