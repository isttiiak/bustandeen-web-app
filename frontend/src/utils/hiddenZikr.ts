// Names the user removed from their counter list. Kept in a PLAIN localStorage
// key (read synchronously) — NOT in the zustand persist blob — so predefined
// defaults, which are re-merged from a constant on every mount, stay gone once
// deleted without racing zustand's async rehydration.

const KEY = 'bustandeen_zikr_hidden';

export function getHiddenZikr(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? (v as string[]) : [];
  } catch {
    return [];
  }
}

export function hideZikr(name: string): string[] {
  const set = new Set(getHiddenZikr());
  set.add(name);
  const next = [...set];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
