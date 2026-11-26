import { useState } from 'react';
import { useTafsir } from '../../hooks/useQuran.js';
import { TAFSIRS, getPreferredTafsir, setPreferredTafsir } from '../../utils/tafsir.js';
import type { AyahText } from '../../utils/quranData.js';

/** The tafsir edition and its text (authentic, from quran.com; no AI). */
export function useReaderTafsir({
  surahNo,
  current,
  tafsirOpen,
  splitTafsir,
  fs,
}: {
  surahNo: number;
  current: AyahText | null;
  tafsirOpen: boolean;
  splitTafsir: boolean;
  fs: { tafsir: number };
}) {
  const [tafsirEdition, setTafsirEdition] = useState<number>(getPreferredTafsir);
  // ── Tafsir (authentic, from quran.com — NO AI anywhere in the Quran rooms) ──
  const ayahNo = current?.numberInSurah ?? 0;
  const tafsir = useTafsir(
    surahNo,
    ayahNo,
    tafsirEdition,
    (tafsirOpen || splitTafsir) && ayahNo > 0
  );
  const tafsirIsBn = TAFSIRS.find((tf) => tf.id === tafsirEdition)?.language === 'bn';
  // Calm long-form reading: warm ink (never pure white), generous line-height,
  // and a Bengali-friendly font stack when a বাংলা edition is selected.
  const tafsirTextStyle = {
    color: 'rgb(var(--c-reader-soft))',
    fontSize: fs.tafsir,
    lineHeight: tafsirIsBn ? 2.15 : 1.95,
    ...(tafsirIsBn
      ? {
          fontFamily:
            "'Noto Sans Bengali', 'Hind Siliguri', 'Bangla Sangam MN', 'Vrinda', sans-serif",
        }
      : {}),
  } as const;
  const changeTafsirEdition = (id: number) => {
    setTafsirEdition(id);
    setPreferredTafsir(id);
  };

  return { tafsirEdition, changeTafsirEdition, tafsir, tafsirTextStyle, ayahNo };
}
