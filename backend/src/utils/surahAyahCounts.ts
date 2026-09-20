/** Ayah count per surah (1-indexed array; index 0 unused) — standard Kufan
 * numbering, same convention as QURAN_TOTAL_AYAT (6236) elsewhere in the app. */
export const SURAH_AYAH_COUNTS: readonly number[] = [
  0, 7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89,
  59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30,
  52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15,
  21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];

export function ayahCountOf(surah: number): number {
  return (surah >= 0 ? SURAH_AYAH_COUNTS.at(surah) : undefined) ?? 0;
}

/** Advance one ayah forward through the mushaf, wrapping surah→surah and
 * back to 1:1 after 114:last. Mirrors the khatam bookmark's wrap behaviour. */
export function nextAyahPosition(surah: number, ayah: number): { surah: number; ayah: number } {
  const count = ayahCountOf(surah);
  if (ayah < count) return { surah, ayah: ayah + 1 };
  if (surah >= 114) return { surah: 1, ayah: 1 };
  return { surah: surah + 1, ayah: 1 };
}
