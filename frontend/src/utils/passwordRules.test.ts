import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN, passwordTooShort } from './passwordRules.js';

describe('passwordRules', () => {
  it('asks for 8 characters', () => {
    expect(PASSWORD_MIN).toBe(8);
  });

  it('refuses 7 and accepts 8', () => {
    expect(passwordTooShort('abcdef1')).toBe(true);
    expect(passwordTooShort('abcdefg1')).toBe(false);
    expect(passwordTooShort('')).toBe(true);
  });

  it('counts a Bangla password by characters typed, not bytes', () => {
    expect(passwordTooShort('আমারপাসওয়ার্ড')).toBe(false);
  });
});
