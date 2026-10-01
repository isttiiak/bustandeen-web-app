import { useAuthStore } from '../store/useAuthStore.js';

// Every offline-queued write is tagged with the uid that made it, and only
// that account's session replays it (audit T2.3). Demo mode queues offline
// writes too, and lives only in memory: without the tag, a demo tap queued
// offline could replay into a real account after signing in on the same
// device. Ops queued before the tag existed (no owner) stay with whoever is
// signed in, as before.

export function currentOutboxOwner(): string | undefined {
  return useAuthStore.getState().user?.uid ?? undefined;
}

/** 'mine' replays, 'wait' stays queued (nobody signed in yet), 'foreign' is dropped. */
export function outboxOpOwnership(owner: string | undefined): 'mine' | 'wait' | 'foreign' {
  if (!owner) return 'mine';
  const me = currentOutboxOwner();
  if (!me) return 'wait';
  return owner === me ? 'mine' : 'foreign';
}
