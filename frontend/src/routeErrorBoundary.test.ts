import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import RouteErrorBoundary from './components/RouteErrorBoundary.js';

// Audit 2026-11-16 P4-2: one crashing page must not blank the whole app. The
// boundary clears itself when the location changes; the browser-level proof
// (navbar stays, next page loads) is e2e/route-error.spec.ts.

const src = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8').replace(/^\uFEFF/, '');

const boom = new Error('boom');
type State = { error: Error | null; resetKey: string };
const derive = (props: { resetKey: string }, state: State) =>
  RouteErrorBoundary.getDerivedStateFromProps({ ...props, children: null }, state);

describe('RouteErrorBoundary state', () => {
  it('keeps the error it caught', () => {
    expect(RouteErrorBoundary.getDerivedStateFromError(boom)).toEqual({ error: boom });
  });

  it('keeps showing the error while the location is the same', () => {
    expect(derive({ resetKey: 'a:0' }, { error: boom, resetKey: 'a:0' })).toBeNull();
  });

  it('clears the error as soon as the location changes', () => {
    expect(derive({ resetKey: 'b:0' }, { error: boom, resetKey: 'a:0' })).toEqual({
      error: null,
      resetKey: 'b:0',
    });
  });

  it('clears it when a sign-in sync remounts the routes (revision changes)', () => {
    expect(derive({ resetKey: 'a:1' }, { error: boom, resetKey: 'a:0' })).toEqual({
      error: null,
      resetKey: 'a:1',
    });
  });
});

describe('wiring', () => {
  const app = src('./App.tsx');

  it('App wraps the route table in the boundary, keyed by path, location key and revision', () => {
    expect(app).toMatch(
      /<RouteErrorBoundary\s+resetKey=\{`\$\{location\.pathname\}\$\{location\.search\}\|\$\{location\.key\}\|\$\{prefsRevision\}`\}\s*>\s*<Suspense fallback=\{<RouteFallback \/>\}>\s*<AppRoutes/
    );
  });

  it('the boundary sits inside <main>, so the navbar is outside it', () => {
    const main = app.indexOf('<MainLandmark');
    expect(app.indexOf('<Navbar />')).toBeLessThan(main);
    expect(app.indexOf('<RouteErrorBoundary')).toBeGreaterThan(main);
  });

  it('keeps the app-wide boundary as the last resort', () => {
    expect(src('./main.tsx')).toContain('<ErrorBoundary>');
  });

  it.each(['en', 'bn'])('%s has the route fallback strings', (lang) => {
    const t = JSON.parse(src(`./locales/${lang}/common.json`)).errorBoundary;
    expect(t.routeBody).toBeTruthy();
    expect(t.retry).toBeTruthy();
  });
});
