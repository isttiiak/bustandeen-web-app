import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GeneralDomainProtected, ServantProtected } from './adminGuards.js';
import type { AdminRole, AnsarDomain } from './store/useAdminStore.js';
import adminRoutes from './adminRoutes.tsx?raw';

// R9a (decision D, 2026-10-17): the 'general' Ansar enters moon records, so
// the Moon sighting page must render for them, not only for the Servant.

// A server render reads zustand's initial state, never setState, so the
// guards get a plain stand-in store here.
const admin = vi.hoisted(() => ({
  state: { role: null as AdminRole | null, ansarDomain: null as AnsarDomain | null },
}));
vi.mock('./store/useAdminStore.js', () => ({
  useAdminStore: <T>(select: (s: typeof admin.state) => T) => select(admin.state),
}));

const render = (
  Guard: typeof GeneralDomainProtected,
  role: AdminRole | null,
  ansarDomain: AnsarDomain | null
) => {
  admin.state = { role, ansarDomain };
  return renderToStaticMarkup(
    createElement(Guard, null, createElement('p', null, 'MOON_PAGE_BODY'))
  );
};

describe('admin route guards', () => {
  afterEach(() => {
    admin.state = { role: null, ansarDomain: null };
  });

  it('GeneralDomainProtected shows the page to the Servant and the general Ansar', () => {
    expect(render(GeneralDomainProtected, 'servant', null)).toContain('MOON_PAGE_BODY');
    expect(render(GeneralDomainProtected, 'ansar', 'general')).toContain('MOON_PAGE_BODY');
  });

  it('GeneralDomainProtected hides it from the sadaqah Ansar and the signed out', () => {
    expect(render(GeneralDomainProtected, 'ansar', 'sadaqah')).not.toContain('MOON_PAGE_BODY');
    expect(render(GeneralDomainProtected, null, null)).not.toContain('MOON_PAGE_BODY');
  });

  it('ServantProtected stays Servant only', () => {
    expect(render(ServantProtected, 'servant', null)).toContain('MOON_PAGE_BODY');
    expect(render(ServantProtected, 'ansar', 'general')).not.toContain('MOON_PAGE_BODY');
  });

  it('the Moon sighting route uses the general-domain guard, not the Servant one', () => {
    const route = adminRoutes.slice(adminRoutes.indexOf('path="/admin/moon-sighting"'));
    const element = route.slice(0, route.indexOf('/>\n'));
    expect(element).toContain('<GeneralDomainProtected>');
    expect(element).not.toContain('ServantProtected');
  });
});
