// ── Resume tracking: where the reader left off, per surah ─────────────────────
// localStorage is the fast cache; the SERVER copy (QuranProfile.readerPos) is
// the source of truth so the same account resumes at the same āyah on every
// device (Istiak: web said āyah 12, phone said 3 — critical bug).
const RESUME_KEY = 'bustandeen_reader_pos';
function readResumeMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(RESUME_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}
export function getResume(surah: number): number {
  return readResumeMap()[String(surah)] ?? 0;
}
export function saveResume(surah: number, ayah: number): void {
  const m = readResumeMap();
  m[String(surah)] = ayah;
  localStorage.setItem(RESUME_KEY, JSON.stringify(m));
}
export function clearResume(surah: number): void {
  const m = readResumeMap();
  delete m[String(surah)];
  localStorage.setItem(RESUME_KEY, JSON.stringify(m));
}
