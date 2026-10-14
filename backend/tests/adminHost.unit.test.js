import {
  adminHostFromEnv,
  isAdminCorsOriginAllowed,
  isAdminRequestHostAllowed,
  previewConfigFromEnv,
} from '../src/utils/corsOrigins.js';

// v5.163.0: the admin panel is its own site. With ADMIN_HOST set, the admin
// API answers only there (plus previews and localhost), and only the admin
// site may call it cross-origin: never the app's own site.

const preview = previewConfigFromEnv({});
const ADMIN = 'admin.bustandeen.com';

describe('ADMIN_HOST', () => {
  test('reads a plain host name, lower-cased', () => {
    expect(adminHostFromEnv({ ADMIN_HOST: ' Admin.Bustandeen.com ' })).toBe(ADMIN);
  });
  test.each([undefined, '', 'https://admin.bustandeen.com', 'admin', 'admin.bustandeen.com/x'])(
    'ignores %p (no restriction)',
    (value) => {
      expect(adminHostFromEnv({ ADMIN_HOST: value })).toBeNull();
    }
  );
});

describe('admin API host guard', () => {
  test.each([
    ADMIN,
    'ADMIN.BUSTANDEEN.COM',
    'localhost',
    '127.0.0.1:5000',
    'bustandeenvercel-abc123-isttiiak-projects.vercel.app',
  ])('answers on %s', (host) => {
    expect(isAdminRequestHostAllowed(host, ADMIN, preview)).toBe(true);
  });

  test.each([
    'bustandeen.com',
    'www.bustandeen.com',
    'bustandeen.com.evil.test',
    'evil-bustandeenvercel-abc-isttiiak-projects.vercel.app',
    '',
    undefined,
  ])('refuses %p', (host) => {
    expect(isAdminRequestHostAllowed(host, ADMIN, preview)).toBe(false);
  });

  test('no ADMIN_HOST: every host, as before', () => {
    expect(isAdminRequestHostAllowed('bustandeen.com', null, preview)).toBe(true);
  });
});

describe('admin API CORS', () => {
  test.each([
    'https://admin.bustandeen.com',
    'http://localhost:5173',
    'https://bustandeenvercel-abc123-isttiiak-projects.vercel.app',
  ])('allows %s', (origin) => {
    expect(isAdminCorsOriginAllowed(origin, ADMIN, preview)).toBe(true);
  });

  test.each([
    'https://bustandeen.com',
    'https://www.bustandeen.com',
    'http://admin.bustandeen.com',
    'https://admin.bustandeen.com.evil.test',
  ])('refuses %s', (origin) => {
    expect(isAdminCorsOriginAllowed(origin, ADMIN, preview)).toBe(false);
  });
});
