import { useEffect, useState } from 'react';
import axios from 'axios';
import { getEnv } from '../utils/Env';
import type { VideoDetail as VideoDetailData } from '../types/Video';

type VideoDetailProps = {
  videoId: number;
  onBack: () => void;
};

export function VideoDetail({ videoId, onBack }: VideoDetailProps) {
  const [video, setVideo] = useState<VideoDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playbackError, setPlaybackError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setVideo(null);
    setError('');
    setPlaybackError(false);

    async function loadVideo() {
      try {
        const response = await axios.get<VideoDetailData>(`${getEnv().API_BASE_URL}/videos/${videoId}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setVideo(response.data);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;

        setError(
          axios.isAxiosError(error) && error.response?.status === 404
            ? 'Vídeo no encontrado.'
            : 'No se pudo cargar el vídeo.'
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadVideo();

    return () => controller.abort();
  }, [videoId]);

  if (loading) {
    return (
      <section>
        <p>Cargando vídeo...</p>
        <button onClick={onBack}>Volver al catálogo</button>
      </section>
    );
  }

  if (error || !video) {
    return (
      <section>
        <p role="alert">{error || 'Vídeo no disponible.'}</p>
        <button onClick={onBack}>Volver al catálogo</button>
      </section>
    );
  }

  const videoSrc = new URL(video.videoUrl, `${getEnv().MEDIA_BASE_URL}/`).href;

  return (
    <section className="video-detail">
      <button onClick={onBack}>Volver al catálogo</button>

      <h1>{video.title}</h1>
      <p>{video.user}</p>

      <video
        key={video.id}
        src={videoSrc}
        controls
        preload="metadata"
        onError={() => setPlaybackError(true)}
        style={{ width: '100%', maxWidth: '800px' }}
      >
        Tu navegador no permite reproducir este vídeo.
      </video>

      {playbackError && <p role="alert">No se pudo reproducir el archivo de vídeo.</p>}

      <p className="video-description">{video.description || 'Sin descripción'}</p>

      <h2>Tags</h2>
      {video.tags.length === 0 ? (
        <p>Sin etiquetas.</p>
      ) : (
        <ul className="video-tags">
          {video.tags.map((tag, index) => (
            <li key={`${tag}-${index}`}>{tag}</li>
          ))}
        </ul>
      )}

      <h2>Comentarios ({video.comments.length})</h2>
      {video.comments.length === 0 ? (
        <p>Este vídeo todavía no tiene comentarios.</p>
      ) : (
        <ul className="video-comments">
          {video.comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.author}</strong>
              <p>{comment.text}</p>
              <small>{new Date(comment.createdAt * 1000).toLocaleString()}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
