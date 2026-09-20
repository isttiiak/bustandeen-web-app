import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';

/**
 * Natural-language logging — "Prayed fajr in jamaah, read 5 pages, 100
 * istighfar" parsed into structured salat/zikr/quran entries. Two-step by
 * design: /parse never writes anything (just an AI call), the caller shows
 * the result as an editable preview, and only /commit (a plain data write,
 * no AI involved) actually applies it — see naturalLog.service.ts.
 */

export type ParsedPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type ParsedLocation = 'home' | 'mosque' | 'jamat';

export interface ParsedSalatEntry {
  prayer: ParsedPrayer;
  status: 'completed' | 'kaza';
  location?: ParsedLocation;
}
export interface ParsedZikrEntry {
  typeName: string;
  count: number;
  /** No existing dhikr matches this name, so confirming creates a new one. */
  isNew?: boolean;
}
export interface ParsedQuranEntry {
  ayat: number;
  approximate: boolean;
}
export interface ParsedLogResult {
  ok: boolean;
  salat: ParsedSalatEntry[];
  zikr: ParsedZikrEntry[];
  quran: ParsedQuranEntry | null;
  /** The day the note is about ("yesterday" only when it clearly said so). */
  day: 'today' | 'yesterday';
}

export function useParseNaturalLog() {
  return useMutation({
    mutationFn: async (text: string) => {
      const { data } = await api.post<ParsedLogResult>('/api/natural-log/parse', { text });
      return data;
    },
  });
}

export interface CommitNaturalLogVars {
  salat: ParsedSalatEntry[];
  zikr: ParsedZikrEntry[];
  quranAyat: number | null;
  date?: string;
  timezoneOffset?: number;
}

export function useCommitNaturalLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: CommitNaturalLogVars) => {
      const { data } = await api.post<{
        ok: boolean;
        salatApplied: number;
        zikrApplied: number;
        quranApplied: boolean;
      }>('/api/natural-log/commit', vars);
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['salat'] });
      void qc.invalidateQueries({ queryKey: ['zikr'] });
      void qc.invalidateQueries({ queryKey: ['quran'] });
    },
  });
}
