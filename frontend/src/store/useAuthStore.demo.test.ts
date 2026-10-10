import { beforeEach, describe, expect, it, vi } from 'vitest';

// U9: the demo is kept for the tab (sessionStorage), so a refresh carries on
// with it; a real session on the device always wins.

const { local, session } = vi.hoisted(() => {
  const store = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, String(v)),
      removeItem: (k: string) => void m.delete(k),
      clear: () => m.clear(),
    };
  };
  const local = store();
  const session = store();
  Object.assign(globalThis, { localStorage: local, sessionStorage: session });
  return { local, session };
});

const { useAuthStore } = await import('./useAuthStore.js');
const { DEMO_SESSION_KEY } = await import('../utils/demoSession.js');

beforeEach(() => {
  local.clear();
  session.clear();
  useAuthStore.setState({ user: null, isDemoMode: false, authLoading: true });
});

describe('demo kept for the tab', () => {
  it('entering the demo remembers it, leaving forgets it', () => {
    useAuthStore.getState().enterDemoMode('female');
    expect(session.getItem(DEMO_SESSION_KEY)).toBe('female');
    expect(useAuthStore.getState().isDemoMode).toBe(true);

    useAuthStore.getState().exitDemoMode();
    expect(session.getItem(DEMO_SESSION_KEY)).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('a refresh during the demo carries on with the same demo user', () => {
    session.setItem(DEMO_SESSION_KEY, 'female');
    useAuthStore.getState().init();
    const s = useAuthStore.getState();
    expect(s.isDemoMode).toBe(true);
    expect(s.authLoading).toBe(false);
    expect(s.user?.email).toBe('demo@bustandeen.com');
    expect(s.user?.displayName).toBe('Khadijah');
  });

  it('a real cached session wins and the demo flag is dropped', () => {
    session.setItem(DEMO_SESSION_KEY, 'male');
    local.setItem('bustandeen_user', JSON.stringify({ uid: 'real', email: 'r@t.dev' }));
    useAuthStore.getState().init();
    const s = useAuthStore.getState();
    expect(s.isDemoMode).toBe(false);
    expect(s.user?.uid).toBe('real');
    expect(session.getItem(DEMO_SESSION_KEY)).toBeNull();
  });

  it('a token on disk (Firebase still confirming) is not overridden by the demo', () => {
    session.setItem(DEMO_SESSION_KEY, 'male');
    local.setItem('bustandeen_idToken', 'tok');
    useAuthStore.getState().init();
    expect(useAuthStore.getState().isDemoMode).toBe(false);
  });

  it('an unknown stored value is ignored', () => {
    session.setItem(DEMO_SESSION_KEY, 'other');
    useAuthStore.getState().init();
    expect(useAuthStore.getState().isDemoMode).toBe(false);
  });
});
