import type { Donation } from '../../../types/api.js';

export function donorLabel(d: Donation): string {
  if (d.isAnonymous) return 'Anonymous';
  return d.donorName || '(no name)';
}
