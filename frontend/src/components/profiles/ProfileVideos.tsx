import { useEffect, useState } from 'react';
import axios from 'axios';
import { getEnv } from '../../utils/Env.ts';
import type { VideoDetail, VideoListResponse, VideoSummary } from '../../types/Video.ts';

type ProfileVideosProps = {
  authorName: string;
  authorId: number | null;
  onOpen: (id: number) => void;
  onImportedFollowers?: (count: number | null) => void;
};

export function ProfileVideos({ authorName, authorId, onOpen, onImportedFollowers }: ProfileVideosProps) {
  const [videos, setVideos] = useState<VideoSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { API_BASE_URL } = getEnv();
    const { signal } = controller;

    async function loadVideos() {
      const found = new Map<number, VideoDetail>();
      let page = 0;
      let hasNext: boolean;
      do {
        const { data } = await axios.get<VideoListResponse>(`${API_BASE_URL}/videos`, {
          params: { page, size: 100 },
          signal,
        });
        if (signal.aborted) return;
        const matches = data.items.filter((video) => video.user === authorName);
        const details = await Promise.all(
          matches.map(async ({ id }) => {
            try {
              return (await axios.get<VideoDetail>(`${API_BASE_URL}/videos/${id}`, { signal })).data;
            } catch (error) {
              if (axios.isAxiosError(error) && error.response?.status === 404) return null;
              throw error;
            }
          })
        );
        for (const video of details) {
          if (video?.authorId === authorId && video.user === authorName) found.set(video.id, video);
        }
        hasNext = data.hasNext;
        page = data.page + 1;
      } while (hasNext && !signal.aborted);

      if (signal.aborted) return;
      const published = [...found.values()];
      setVideos(published);
      const source = published.find((video) => video.channel === authorName && video.channelFollowerCount != null);
      onImportedFollowers?.(source?.channelFollowerCount ?? null);
    }

    void loadVideos().catch(() => {
      if (!signal.aborted) setFailed(true);
    });
    return () => controller.abort();
  }, [authorName, authorId, attempt, onImportedFollowers]);

  const mediaBase = new URL(`${getEnv().MEDIA_BASE_URL}/`, window.location.href);

  return (
    <section aria-label="Vídeos en ProTube">
      <h2>Vídeos en ProTube</h2>
      {failed ? (
        <>
          <p role="alert" className="status-message status-error">
            No se han podido cargar los vídeos.
          </p>
          <button
            className="button"
            onClick={() => {
              setFailed(false);
              setAttempt((previous) => previous + 1);
            }}
          >
            Reintentar vídeos
          </button>
        </>
      ) : videos === null ? (
        <p role="status">Cargando vídeos…</p>
      ) : videos.length === 0 ? (
        <p>No hay vídeos disponibles de este perfil.</p>
      ) : (
        <ul className="video-catalog" aria-label="Vídeos publicados">
          {videos.map((video) => (
            <li key={video.id}>
              <button className="video-card" onClick={() => onOpen(video.id)}>
                <span className="video-card-media">
                  <img src={new URL(video.thumbnailUrl, mediaBase).href} alt="" loading="lazy" />
                </span>
                <span className="video-card-body">
                  <span className="video-card-title">{video.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
