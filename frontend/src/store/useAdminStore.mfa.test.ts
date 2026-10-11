import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAdminStore } from './useAdminStore.js';
import { clearAdminMfaProof, getAdminMfaProof, setAdminMfaProof } from '../lib/adminMfa.js';
import { qrPath } from '../seo/utils/qr.js';

// T1.4: the admin gate's second-factor states.
describe('admin store, second factor', () => {
  beforeEach(() => useAdminStore.getState().setSignedOut());

  it('a session without a passed factor waits on the MFA step', () => {
    useAdminStore.getState().setSession('a@test.dev', 'servant', null, 'enroll');
    expect(useAdminStore.getState()).toMatchObject({
      status: 'mfa',
      mfaStep: 'enroll',
      email: 'a@test.dev',
    });
    useAdminStore.getState().setMfaPassed();
    expect(useAdminStore.getState()).toMatchObject({ status: 'ready', mfaStep: null });
  });

  it('a session with mfa ok (or none reported) is ready', () => {
    useAdminStore.getState().setSession('a@test.dev', 'ansar', 'general');
    expect(useAdminStore.getState().status).toBe('ready');
  });

  it('a 403 mfa_required mid-session asks again, keeping who is signed in', () => {
    useAdminStore.getState().setSession('a@test.dev', 'ansar', 'general', 'ok');
    useAdminStore.getState().setMfaRequired('verify');
    expect(useAdminStore.getState()).toMatchObject({
      status: 'mfa',
      mfaStep: 'verify',
      role: 'ansar',
    });
  });

  it('a voluntary setup (switch off) can be left without passing a code', () => {
    useAdminStore.getState().setSession('a@test.dev', 'servant', null, 'ok');
    useAdminStore.getState().startMfaSetup();
    expect(useAdminStore.getState()).toMatchObject({
      status: 'mfa',
      mfaStep: 'enroll',
      mfaVoluntary: true,
    });
    useAdminStore.getState().setMfaPassed();
    expect(useAdminStore.getState()).toMatchObject({ status: 'ready', mfaVoluntary: false });
  });

  it('a required step is never voluntary, and setup needs a ready session', () => {
    useAdminStore.getState().startMfaSetup();
    expect(useAdminStore.getState().status).toBe('signedOut');
    useAdminStore.getState().setSession('a@test.dev', 'servant', null, 'ok');
    useAdminStore.getState().startMfaSetup();
    useAdminStore.getState().setMfaRequired('enroll');
    expect(useAdminStore.getState().mfaVoluntary).toBe(false);
  });

  it('never leaves the signed-out state on a late 403', () => {
    useAdminStore.getState().setMfaRequired('verify');
    expect(useAdminStore.getState().status).toBe('signedOut');
  });
});

describe('admin MFA proof storage', () => {
  it('stores, reads and clears the proof', () => {
    const items = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => items.get(k) ?? null,
      setItem: (k: string, v: string) => void items.set(k, v),
      removeItem: (k: string) => void items.delete(k),
    });
    clearAdminMfaProof();
    expect(getAdminMfaProof()).toBeNull();
    setAdminMfaProof('body.mac');
    expect(getAdminMfaProof()).toBe('body.mac');
    clearAdminMfaProof();
    expect(getAdminMfaProof()).toBeNull();
    vi.unstubAllGlobals();
  });

  it('without storage (private mode) it fails quietly', () => {
    expect(() => setAdminMfaProof('x')).not.toThrow();
    expect(getAdminMfaProof()).toBeNull();
  });
});

describe('authenticator QR', () => {
  it('encodes an otpauth URI as a square SVG path', () => {
    const { size, d } = qrPath(
      'otpauth://totp/Bustandeen%20Admin%3Aservant%40test.dev?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Bustandeen+Admin&algorithm=SHA1&digits=6&period=30'
    );
    expect(size).toBeGreaterThan(25);
    expect(d.startsWith('M')).toBe(true);
  });
});
