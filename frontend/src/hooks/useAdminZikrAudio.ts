import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import type { GlobalLibraryItem } from './useAdminZikr.js';

export interface CuratedAudioAsset {
  _id: string;
  name: string;
  audioUrl: string;
  addedBy: string;
  createdAt: string;
}

interface AudioStatusResult {
  curated: CuratedAudioAsset[];
  libraryItems: GlobalLibraryItem[];
}

const KEY = ['admin', 'zikr-audio-status'] as const;

export function useZikrAudioStatus() {
  return useQuery<AudioStatusResult>({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.get<{ ok: boolean } & AudioStatusResult>(
        '/api/admin/zikr-requests/audio-status'
      );
      return res.data;
    },
    staleTime: 15_000,
  });
}

export function useSetCuratedAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, audioUrl }: { name: string; audioUrl: string }) =>
      api.put(`/api/admin/zikr-requests/audio/${encodeURIComponent(name)}`, { audioUrl }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetLibraryItemAudio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, audioUrl }: { id: string; audioUrl: string }) =>
      api.patch(`/api/admin/zikr-requests/library/${id}/audio`, { audioUrl }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
