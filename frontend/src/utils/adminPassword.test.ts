import { describe, expect, it } from 'vitest';
import { passwordProblem } from './adminPassword.js';

describe('passwordProblem (U8.7)', () => {
  it('needs both passwords', () => {
    expect(passwordProblem('', 'newpassword', 'newpassword')).toBe('missing');
    expect(passwordProblem('old', '', '')).toBe('missing');
  });
  it('needs 8 characters', () => {
    expect(passwordProblem('oldpassword', 'short', 'short')).toBe('short');
  });
  it('refuses the same password', () => {
    expect(passwordProblem('samepassword', 'samepassword', 'samepassword')).toBe('same');
  });
  it('needs the repeat to match', () => {
    expect(passwordProblem('oldpassword', 'newpassword', 'newpasswort')).toBe('mismatch');
  });
  it('accepts a good change', () => {
    expect(passwordProblem('oldpassword', 'newpassword', 'newpassword')).toBeNull();
  });
});
