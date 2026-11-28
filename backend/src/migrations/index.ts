import { cycleDayEncryption } from './001-cycle-day-encryption.js';
import { removeZikrAudioLinks } from './002-remove-zikr-audio-links.js';
import { retireNaseeh } from './003-retire-naseeh.js';
import type { Migration } from './runner.js';

/** In the order they run. Append new ones; never reorder, rename or delete. */
export const MIGRATIONS: readonly Migration[] = [
  cycleDayEncryption,
  removeZikrAudioLinks,
  retireNaseeh,
];
