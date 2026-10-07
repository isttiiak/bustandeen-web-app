import { describe, it, expect } from 'vitest';
import en from '../locales/en/common.json';
import bn from '../locales/bn/common.json';
import { TERMS_SECTIONS } from './Terms.js';

const DASH_OR_EMOJI = /—|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
type Dict = Record<string, unknown>;

describe('Terms of Service', () => {
  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s has every section the page renders, without emoji or em dashes', (_lang, dict) => {
    const terms = (dict as Dict).terms as Dict;
    for (const { key, bodyCount } of TERMS_SECTIONS) {
      const section = terms[key] as Dict;
      expect(typeof section.title, `${key}.title`).toBe('string');
      for (let i = 0; i < bodyCount; i++) {
        const line = section[`body${i}`];
        expect(typeof line, `${key}.body${i}`).toBe('string');
        expect(String(line)).not.toMatch(DASH_OR_EMOJI);
      }
    }
  });

  it.each([
    ['en', en],
    ['bn', bn],
  ])('%s sign-in/up agreement lines link Terms (<1>) and Privacy (<3>)', (_lang, dict) => {
    const legal = (dict as Dict).legal as Dict;
    for (const key of ['agreeSignIn', 'agreeSignUp']) {
      expect(String(legal[key])).toMatch(/<1>.+<\/1>.*<3>.+<\/3>/);
    }
  });
});
