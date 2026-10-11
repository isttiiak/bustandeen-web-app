import { describe, it, expect } from 'vitest';
import { buildReport, ownFrame } from './errorReporting.js';

const ctx = {
  origin: 'https://bustandeen.com',
  pathname: '/salat',
  version: '5.158.3',
};

const ourError = () => {
  const e = new TypeError("Cannot read properties of undefined (reading 'fajr')");
  e.stack = `TypeError: Cannot read properties of undefined (reading 'fajr')
    at Xe (https://bustandeen.com/assets/SalatTracker-DPxpfXv0.js:12:345)
    at Ai (https://bustandeen.com/assets/react-vendor-B46skpNN.js:1:999)`;
  return e;
};

describe('frontend error reporting', () => {
  it('reports our own error with file, line, redacted page and version', () => {
    expect(buildReport(ourError(), 'render', ctx)).toEqual({
      kind: 'render',
      message: "TypeError: Cannot read properties of undefined (reading 'fajr')",
      file: '/assets/SalatTracker-DPxpfXv0.js',
      line: 12,
      route: '/salat',
      version: '5.158.3',
    });
  });

  it('private pages are sent as /private, never their address', () => {
    for (const pathname of ['/cycle', '/connect/ABC123', '/admin/users']) {
      expect(buildReport(ourError(), 'error', { ...ctx, pathname })?.route).toBe('/private');
    }
  });

  it('ignores errors that are not ours to fix', () => {
    const ext = new Error('boom');
    ext.stack = 'Error: boom\n    at x (chrome-extension://abcdef/content.js:1:2)';
    expect(buildReport(ext, 'error', ctx)).toBeNull();

    const chunk = new TypeError(
      'Failed to fetch dynamically imported module: https://bustandeen.com/assets/x.js'
    );
    expect(buildReport(chunk, 'rejection', ctx)).toBeNull();

    expect(buildReport({ isAxiosError: true, message: '500' }, 'rejection', ctx)).toBeNull();
    expect(buildReport('ResizeObserver loop limit exceeded', 'error', ctx)).toBeNull();
    expect(buildReport('Script error.', 'error', ctx)).toBeNull();

    // window.onerror from another origin's file
    expect(
      buildReport('oops', 'error', { ...ctx, filename: 'https://cdn.other.com/a.js', lineno: 3 })
    ).toBeNull();
  });

  it('window.onerror with only a filename uses it when it is ours', () => {
    expect(
      buildReport('oops', 'error', {
        ...ctx,
        filename: 'https://bustandeen.com/assets/main-AbCdEf12.js',
        lineno: 7,
      })
    ).toMatchObject({ file: '/assets/main-AbCdEf12.js', line: 7, message: 'oops' });
  });

  it('a rejection with a plain value (no stack) is still reported, without a file', () => {
    expect(buildReport({ code: 42 }, 'rejection', ctx)).toEqual({
      kind: 'rejection',
      message: '{"code":42}',
      route: '/salat',
      version: '5.158.3',
    });
  });

  it('ownFrame picks the first frame on our origin', () => {
    expect(ownFrame(ourError().stack, ctx.origin)).toEqual({
      file: '/assets/SalatTracker-DPxpfXv0.js',
      line: 12,
    });
    expect(ownFrame(undefined, ctx.origin)).toBeNull();
  });
});
