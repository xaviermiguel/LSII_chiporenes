import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoListResponse, VideoSummary } from './types/Video';

type PageState = {
  value: VideoSummary[];
  loading: 'loading' | 'success' | 'error';
  error: unknown;
  nextPage: number | null;
};

const initial: PageState = { value: [], loading: 'loading', error: null, nextPage: 0 };

export function useVideoPages(fetchPage: (page: number, signal: AbortSignal) => Promise<VideoListResponse>) {
  const [state, setState] = useState(initial);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(
    async (page: number) => {
      if (request.current) return;
      const controller = new AbortController();
      request.current = controller;
      setState((previous) => (page === 0 ? initial : { ...previous, loading: 'loading', error: null }));
      try {
        const response = await fetchPage(page, controller.signal);
        if (controller.signal.aborted) return;
        setState((previous) => {
          const videos = new Map(previous.value.map((video) => [video.id, video]));
          for (const video of response.items) videos.set(video.id, video);
          return {
            value: [...videos.values()],
            loading: 'success',
            error: null,
            nextPage: response.hasNext ? response.page + 1 : null,
          };
        });
      } catch (error) {
        if (!controller.signal.aborted) setState((previous) => ({ ...previous, loading: 'error', error }));
      } finally {
        if (request.current === controller) request.current = null;
      }
    },
    [fetchPage]
  );

  useEffect(() => {
    void load(0);
    return () => {
      request.current?.abort();
      request.current = null;
    };
  }, [load]);

  const { nextPage } = state;
  const loadMore = useCallback(() => {
    if (nextPage !== null) void load(nextPage);
  }, [load, nextPage]);
  return { ...state, hasNext: nextPage !== null, loadMore };
}
