import { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { getEnv } from './utils/Env';

type LoadingState = 'loading' | 'success' | 'error' | 'idle';

const ALL_VIDEOS_URL = `${getEnv().API_BASE_URL}/videos`;
export function useAllVideos() {
  const [value, setValue] = useState<string[]>([]);
  const [message, setMessage] = useState<string>('Loading...');
  const [loading, setLoading] = useState<LoadingState>('idle');

  useEffect(() => {
    const getVideos = async () => {
      try {
        setLoading('loading');
        const response = await axios.get<string[]>(ALL_VIDEOS_URL);
        if (response.status === 200) {
          setValue(response.data);
        }
        setLoading('success');
      } catch (error: unknown) {
        setLoading('error');
        setMessage('Error fetching videos: ' + (error as AxiosError).message);
      }
    };
    getVideos().then();
  }, []);

  return { value, message, loading };
}
