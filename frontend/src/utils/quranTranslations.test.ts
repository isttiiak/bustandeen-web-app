import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveTranslationChoice, selectedTranslations } from './quranData.js';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem = (k: string) => this.m.get(k) ?? null;
  setItem = (k: string, v: string) => void this.m.set(k, String(v));
  removeItem = (k: string) => void this.m.delete(k);
  clear = () => this.m.clear();
}

const setLang = (l: string) => localStorage.setItem('bustandeen_lang', l);

describe('the Quran translation follows the language until the user chooses', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));

  it('follows the app language when nothing was chosen, without storing anything', () => {
    setLang('en');
    expect(selectedTranslations()).toEqual(['en.sahih']);
    setLang('bn');
    expect(selectedTranslations()).toEqual(['bn.bengali']);
    expect(localStorage.getItem('bustandeen_quran_translations')).toBeNull();
  });

  it('keeps a chosen translation whatever the language button does', () => {
    saveTranslationChoice(['en.sahih']);
    setLang('bn');
    expect(selectedTranslations()).toEqual(['en.sahih']);
    saveTranslationChoice(['bn.hoque', 'en.sahih']);
    setLang('en');
    expect(selectedTranslations()).toEqual(['bn.hoque', 'en.sahih']);
  });

  it('lets a value an older build wrote on a language change keep following the language', () => {
    localStorage.setItem('bustandeen_quran_translations', JSON.stringify(['bn.bengali']));
    setLang('en');
    expect(selectedTranslations()).toEqual(['en.sahih']);
  });

  it('treats an older two-translation or other saved value as a real choice', () => {
    localStorage.setItem('bustandeen_quran_translations', JSON.stringify(['bn.hoque']));
    setLang('en');
    expect(selectedTranslations()).toEqual(['bn.hoque']);
  });

  it('ignores a corrupt or unknown value', () => {
    setLang('bn');
    localStorage.setItem('bustandeen_quran_translations', 'not json');
    expect(selectedTranslations()).toEqual(['bn.bengali']);
    localStorage.setItem('bustandeen_quran_translations', JSON.stringify(['xx.nope']));
    expect(selectedTranslations()).toEqual(['bn.bengali']);
  });
});
