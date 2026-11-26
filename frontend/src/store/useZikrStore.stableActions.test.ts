import { describe, expect, it, vi } from 'vitest';

// Audit 2026-11-16 P4-5: Home lists `hydrate` in an effect's dependencies. That
// is only a no-op for the effect if the store action keeps its identity.

vi.hoisted(() => {
  const m = new Map<string, string>();
  Object.assign(globalThis, {
    localStorage: {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
    },
  });
});
vi.mock('../lib/api.js', () => ({ API_BASE: '', getIdToken: () => Promise.resolve('t') }));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const { useZikrStore } = await import('./useZikrStore.js');

describe('useZikrStore actions', () => {
  it('hydrate keeps its identity when the store state changes', () => {
    const before = useZikrStore.getState().hydrate;
    useZikrStore.setState({ currentCount: 3 } as never);
    useZikrStore.setState({ currentCount: 4 } as never);
    expect(useZikrStore.getState().hydrate).toBe(before);
  });
});
