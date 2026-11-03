import { useEffect, useState } from 'react';
import axios from 'axios';
import { getEnv } from '../utils/Env';
import type { VideoDetail as VideoDetailData } from '../types/Video';

type VideoDetailProps = {
  videoId: number;
  onBack: () => void;
  userId?: number;
};

export function VideoDetail({ videoId, onBack, userId }: VideoDetailProps) {
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
      <section className="video-detail state-panel">
        <p className="status-message" role="status">
          Cargando vídeo...
        </p>
        <button className="button button-secondary" onClick={onBack}>
          Volver al catálogo
        </button>
      </section>
    );
  }

  if (error || !video) {
    return (
      <section className="video-detail state-panel">
        <p className="status-message status-error" role="alert">
          {error || 'Vídeo no disponible.'}
        </p>
        <button className="button button-secondary" onClick={onBack}>
          Volver al catálogo
        </button>
      </section>
    );
  }

  const mediaBase = new URL(`${getEnv().MEDIA_BASE_URL}/`, window.location.href);
  const videoSrc = new URL(video.videoUrl, mediaBase).href;

  return (
    <section className="video-detail">
      <button className="button button-secondary" onClick={onBack}>
        Volver al catálogo
      </button>

      {userId !== undefined && userId === video.ownerId && (
        <a className="button" href={`#videos/${video.id}/edit`}>
          Editar vídeo
        </a>
      )}

      <div className="detail-heading">
        <p className="eyebrow">Ahora en ProTube</p>
        <h1>{video.title}</h1>
        <p>{video.user}</p>
      </div>

      <video
        key={video.id}
        src={videoSrc}
        controls
        preload="metadata"
        onError={() => setPlaybackError(true)}
        className="video-player"
        aria-label={`Reproductor: ${video.title}`}
      >
        Tu navegador no permite reproducir este vídeo.
      </video>

      {playbackError && (
        <p className="status-message status-error" role="alert">
          No se pudo reproducir el archivo de vídeo.
        </p>
      )}

      <section className="detail-section" aria-label="Descripción">
        <h2>Acerca del vídeo</h2>
        <p className="video-description">{video.description || 'Sin descripción'}</p>
      </section>

      <section className="detail-section" aria-label="Categoría">
        <h2>Categoría</h2>
        <p>{video.category?.name || 'Sin categoría'}</p>
      </section>
      <section className="detail-section" aria-label="Etiquetas">
        <h2>Tags</h2>
        {video.tags.length === 0 ? (
          <p className="muted-text">Sin etiquetas.</p>
        ) : (
          <ul className="video-tags">
            {video.tags.map((tag, index) => (
              <li className="tag" key={`${tag}-${index}`}>
                {tag}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="detail-section" aria-label="Comentarios">
        <h2>Comentarios ({video.comments.length})</h2>
        {video.comments.length === 0 ? (
          <p className="status-message">Este vídeo todavía no tiene comentarios.</p>
        ) : (
          <ul className="video-comments">
            {video.comments.map((comment) => (
              <li key={comment.id}>
                <strong>{comment.user}</strong>
                <p>{comment.text}</p>
                <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
