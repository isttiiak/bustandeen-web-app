// The one-day shift of the Ramadan calendars (R12): worldwide pages are
// English; Bangladesh pages English and Bangla.
import type { MonthlyLang } from './monthly.js';

export interface RamadanShiftStrings {
  question: string;
  explain: string;
  /** Labels of shift -1, 0, +1. */
  options: [string, string, string];
  /** The note on screen and paper once a shift is chosen. */
  adjusted: (firstFast: string) => string;
}

export const RAMADAN_SHIFT: Record<MonthlyLang, RamadanShiftStrings> = {
  en: {
    question: 'Did Ramadan begin on a different day where you live?',
    explain: 'Adjust by one day: the times stay the same, only the fast numbers move.',
    options: ['One day earlier', 'As shown', 'One day later'],
    adjusted: (d) => `Adjusted on this device for your area: the first fast is on ${d}.`,
  },
  bn: {
    question: 'আপনার এলাকায় রমজান কি অন্য দিনে শুরু হয়েছে?',
    explain: 'এক দিন সরিয়ে নিন: সময় একই থাকবে, শুধু রোজার নম্বর সরে যাবে।',
    options: ['এক দিন আগে', 'যেমন দেখানো আছে', 'এক দিন পরে'],
    adjusted: (d) => `আপনার এলাকার জন্য এই ডিভাইসে বদলানো হয়েছে: প্রথম রোজা ${d}।`,
  },
};
