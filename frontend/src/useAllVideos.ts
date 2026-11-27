import { useCallback } from 'react';
import axios from 'axios';
import { getEnv } from './utils/Env';
import type { VideoListResponse } from './types/Video';
import { useVideoPages } from './useVideoPages';

export function useAllVideos(query?: string) {
  const fetchPage = useCallback(
    async (page: number, signal: AbortSignal) => {
      const path = query === undefined ? '/videos' : '/videos/search';
      const response = await axios.get<VideoListResponse>(`${getEnv().API_BASE_URL}${path}`, {
        params: query === undefined ? { page, size: 12 } : { page, size: 12, q: query },
        signal,
      });
      return response.data;
    },
    [query]
  );
  const pages = useVideoPages(fetchPage);
  let message = '';
  if (pages.loading === 'error') {
    message =
      query !== undefined
        ? 'No se pudo realizar la búsqueda. Inténtalo de nuevo.'
        : axios.isAxiosError(pages.error)
          ? `Error al cargar los vídeos: ${pages.error.message}`
          : 'Error al cargar los vídeos';
  }
  return { ...pages, message };
}
