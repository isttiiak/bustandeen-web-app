import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryStorage } from '../test/memoryStorage.js';

// Audit T2.3: a queued salat change replays only for the account (or the
// demo) that made it; existing queues from before the owner tag still replay.

vi.hoisted(() => {
  const m = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
    },
  });
});

const patch = vi.fn();
vi.mock('../lib/api.js', () => ({ default: { patch: (...a: unknown[]) => patch(...a) } }));
vi.mock('react-hot-toast', () => ({ default: Object.assign(() => {}, { success: () => {} }) }));

const { useAuthStore } = await import('../store/useAuthStore.js');
const { enqueueSalatOp, peekSalatOutbox } = await import('./salatOutbox.js');
const { replaySalatOutbox } = await import('../hooks/useSalatLog.js');

const signIn = (uid: string | null) =>
  useAuthStore.setState({ user: uid ? { uid, email: null, displayName: null } : null });
const fajr = (status: 'completed' | 'missed') =>
  ({ kind: 'prayer', vars: { prayer: 'fajr', status, date: '2026-03-01' } }) as const;
const qc = { invalidateQueries: vi.fn() };

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());
  patch.mockReset().mockResolvedValue({ data: { ok: true } });
  signIn('user-a');
});

describe('salat outbox ownership', () => {
  it('tags ops with the uid; the same prayer from two accounts is two ops', () => {
    enqueueSalatOp(fajr('completed'));
    enqueueSalatOp(fajr('missed')); // same account: replaces
    signIn('demo-001');
    enqueueSalatOp(fajr('completed'));
    expect(peekSalatOutbox().map((o) => [o.owner, (o.vars as { status?: string }).status])).toEqual(
      [
        ['user-a', 'missed'],
        ['demo-001', 'completed'],
      ]
    );
  });

  it("replays only the signed-in account's ops and drops the rest", async () => {
    signIn('demo-001');
    enqueueSalatOp(fajr('missed'));
    signIn('user-a');
    enqueueSalatOp({
      kind: 'prayer',
      vars: { prayer: 'isha', status: 'completed', date: '2026-03-01' },
    });
    await replaySalatOutbox(qc as never);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch.mock.calls[0]![1]).toMatchObject({ prayer: 'isha' });
    expect(peekSalatOutbox()).toEqual([]);
  });

  it('waits while nobody is signed in', async () => {
    enqueueSalatOp(fajr('completed'));
    signIn(null);
    await replaySalatOutbox(qc as never);
    expect(patch).not.toHaveBeenCalled();
    expect(peekSalatOutbox()).toHaveLength(1);
  });

  it('ops queued before the owner tag existed still replay', async () => {
    localStorage.setItem(
      'bustandeen_salat_outbox',
      JSON.stringify([
        { id: '1-a', kind: 'prayer', vars: { prayer: 'fajr', status: 'completed' }, queuedAt: 1 },
      ])
    );
    await replaySalatOutbox(qc as never);
    expect(patch).toHaveBeenCalledTimes(1);
  });
});
