import { describe, expect, it } from 'vitest';
import { AVATARS, avatarById } from './AvatarGlyphs.js';
import src from '../../../../backend/src/utils/avatars.ts?raw';

// The server only accepts ids in backend/src/utils/avatars.ts; a preset the
// picker offers but the server rejects would fail silently for the user.
describe('preset avatars', () => {
  it('match the backend whitelist exactly', () => {
    const block = src.slice(src.indexOf('AVATAR_IDS = ['), src.indexOf('] as const'));
    const backendIds = [...block.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    expect(AVATARS.map((a) => a.id)).toEqual(backendIds);
  });

  it('look up by id and ignore unknown ids', () => {
    expect(avatarById('leaf')?.label).toBe('Leaf');
    expect(avatarById('unicorn')).toBeUndefined();
    expect(avatarById(null)).toBeUndefined();
  });
});
