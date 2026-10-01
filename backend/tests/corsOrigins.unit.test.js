import {
  DEFAULT_PREVIEW_BASES,
  DEFAULT_PREVIEW_OWNER,
  isVercelPreviewOrigin,
  previewConfigFromEnv,
} from '../src/utils/corsOrigins.js';

// Audit SEC-05: preview slugs come from the environment; both the current
// project slugs and the pre-rename one are accepted during the transition.

const defaults = previewConfigFromEnv({});

describe('Vercel preview origin matcher', () => {
  test.each([
    // Real hosts of this project (deploy + branch previews), 2026-10-01
    'https://bustandeenvercel-oa9kpluov-isttiiak-projects.vercel.app',
    'https://bustandeenvercelapp-git-audit-t27-self-dfa63d-isttiiak-projects.vercel.app',
    'https://bustandeenvercel.vercel.app',
    // Pre-rename slug, still accepted during the transition
    'https://ihsan-web-app-main.vercel.app',
    'https://ihsan-web-app-main-abc123-isttiiak-projects.vercel.app',
    'HTTPS://BUSTANDEENVERCEL-ABC-ISTTIIAK-PROJECTS.VERCEL.APP',
  ])('accepts %s', (origin) => {
    expect(isVercelPreviewOrigin(origin, defaults)).toBe(true);
  });

  test.each([
    'http://bustandeenvercel-abc-isttiiak-projects.vercel.app', // not https
    'https://bustandeenvercel-abc-someoneelse.vercel.app', // another account
    'https://evil-bustandeenvercel-abc-isttiiak-projects.vercel.app', // not our project
    'https://bustandeenvercelx-abc-isttiiak-projects.vercel.app', // look-alike project
    'https://bustandeenvercel-isttiiak-projects.vercel.app.evil.com',
    'https://bustandeenvercel--isttiiak-projects.vercel.app', // empty slug
    'https://bustandeenvercel-abc-isttiiak-projects.vercel.app:8443',
    'https://bustandeen.com', // production is FRONTEND_ORIGIN's job, not this matcher's
  ])('rejects %s', (origin) => {
    expect(isVercelPreviewOrigin(origin, defaults)).toBe(false);
  });

  test('defaults when the environment says nothing', () => {
    expect(defaults).toEqual({ bases: DEFAULT_PREVIEW_BASES, owner: DEFAULT_PREVIEW_OWNER });
  });

  test('reads bases and owner from the environment', () => {
    const cfg = previewConfigFromEnv({
      VERCEL_PREVIEW_BASES: ' NewName , other-app ',
      VERCEL_PREVIEW_OWNER: '-my-team',
    });
    expect(cfg).toEqual({ bases: ['newname', 'other-app'], owner: 'my-team' });
    expect(isVercelPreviewOrigin('https://newname-git-main-my-team.vercel.app', cfg)).toBe(true);
    expect(
      isVercelPreviewOrigin('https://bustandeenvercel-abc-isttiiak-projects.vercel.app', cfg)
    ).toBe(false);
  });

  test('ignores malformed environment values instead of trusting them', () => {
    const cfg = previewConfigFromEnv({
      VERCEL_PREVIEW_BASES: '*,.vercel.app, ',
      VERCEL_PREVIEW_OWNER: '*',
    });
    expect(cfg).toEqual({ bases: DEFAULT_PREVIEW_BASES, owner: DEFAULT_PREVIEW_OWNER });
  });
});
