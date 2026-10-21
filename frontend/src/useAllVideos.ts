import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getEnv } from './utils/Env';
import type { VideoSummary, VideoListResponse } from './types/Video';

type LoadingState = 'loading' | 'success' | 'error';

export function useAllVideos() {
  const [value, setValue] = useState<VideoSummary[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState<LoadingState>('loading');
  const [hasNext, setHasNext] = useState(false);
  const nextPage = useRef(0);
  const moreAvailable = useRef(true);
  const request = useRef<AbortController | null>(null);

  const loadMore = useCallback(async () => {
    // Lock immediately, before React renders the disabled button.
    if (request.current || !moreAvailable.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading('loading');
    setMessage('');

    try {
      const response = await axios.get<VideoListResponse>(`${getEnv().API_BASE_URL}/videos`, {
        params: { page: nextPage.current, size: 12 },
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      setValue((previous) => {
        const videos = new Map(previous.map((video) => [video.id, video]));
        response.data.items.forEach((video) => videos.set(video.id, video));
        return [...videos.values()];
      });
      nextPage.current = response.data.page + 1;
      moreAvailable.current = response.data.hasNext;
      setHasNext(response.data.hasNext);
      setLoading('success');
    } catch (error: unknown) {
      if (controller.signal.aborted) return;

      setMessage(
        axios.isAxiosError(error) ? `Error al cargar los vídeos: ${error.message}` : 'Error al cargar los vídeos'
      );
      setLoading('error');
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, []);

  useEffect(() => {
    void loadMore();

    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [loadMore]);

  return { value, message, loading, hasNext, loadMore };
}
