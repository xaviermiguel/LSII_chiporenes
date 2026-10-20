import { useEffect, useState } from 'react';
import axios from 'axios';
import { getEnv } from './utils/Env';
import type { VideoSummary } from './types/Video';

type LoadingState = 'loading' | 'success' | 'error';

export function useAllVideos() {
  const [value, setValue] = useState<VideoSummary[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState<LoadingState>('loading');

  useEffect(() => {
    const controller = new AbortController();

    async function getVideos() {
      try {
        const response = await axios.get<VideoSummary[]>(`${getEnv().API_BASE_URL}/videos`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setValue(response.data);
        setLoading('success');
      } catch (error: unknown) {
        if (controller.signal.aborted) return;

        setMessage(
          axios.isAxiosError(error) ? `Error al cargar los vídeos: ${error.message}` : 'Error al cargar los vídeos'
        );
        setLoading('error');
      }
    }

    void getVideos();

    return () => controller.abort();
  }, []);

  return { value, message, loading };
}
