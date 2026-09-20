/**
 * Lightweight, dependency-free duplicate hint for zikr-name submissions.
 * Spelling/transliteration legitimately varies ("SubhanAllah" vs
 * "Subhan Allah" vs "Subhaanallah"), so this NEVER blocks a submission — it
 * only sets a non-blocking flag an admin sees while reviewing. Pure
 * normalize + Levenshtein distance; no npm dependency, since this is a
 * serverless app with no staging environment to catch a bad package upgrade.
 */

/** Lowercase, strip diacritics/punctuation, collapse whitespace. */
export const normalizeZikrName = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row.push(
        Math.min((row.at(j - 1) ?? 0) + 1, (prev.at(j) ?? 0) + 1, (prev.at(j - 1) ?? 0) + cost)
      );
    }
    prev = row;
  }
  return prev[b.length];
};

/**
 * True when two normalized names are close enough to flag as a possible
 * duplicate. Deliberately conservative (favors fewer, higher-confidence
 * matches) — an exact match after normalizing, OR a small edit distance
 * relative to length, since short common phrases ("SubhanAllah") would
 * otherwise produce noisy false positives against each other.
 */
export const isLikelyDuplicateName = (a: string, b: string): boolean => {
  const na = normalizeZikrName(a);
  const nb = normalizeZikrName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen < 6) return false; // too short to compare meaningfully
  const distance = levenshtein(na, nb);
  return distance <= Math.max(1, Math.floor(maxLen * 0.15));
};

export interface DuplicateCandidate {
  id: string;
  name: string;
}

export interface DuplicateMatch {
  id: string;
  model: 'GlobalZikrLibraryItem' | 'ZikrRequest';
}

/** Checks a submitted name against published library items first (a real
 * duplicate is more useful to flag than a same-day pending request), then
 * other pending requests. Returns the first match found, or null. */
export const findPossibleDuplicate = (
  submittedName: string,
  libraryItems: DuplicateCandidate[],
  pendingRequests: DuplicateCandidate[]
): DuplicateMatch | null => {
  const inLibrary = libraryItems.find((item) => isLikelyDuplicateName(submittedName, item.name));
  if (inLibrary) return { id: inLibrary.id, model: 'GlobalZikrLibraryItem' };

  const inPending = pendingRequests.find((req) => isLikelyDuplicateName(submittedName, req.name));
  if (inPending) return { id: inPending.id, model: 'ZikrRequest' };

  return null;
};
