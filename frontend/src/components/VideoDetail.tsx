import { useEffect, useState } from 'react';
import axios from 'axios';
import { getEnv } from '../utils/Env';
import { VideoEngagement } from './VideoEngagement';
import { defaultAvatarPath, getPublicProfile, resolveAvatarURL } from '../userProfile';
import type { VideoDetail as VideoDetailData } from '../types/Video';
import { VideoComments } from './VideoComments';

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
  const [commentAvatars, setCommentAvatars] = useState<Record<number, string>>({});

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setVideo(null);
    setError('');
    setPlaybackError(false);
    setCommentAvatars({});

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

  useEffect(() => {
    if (!video) return;
    const controller = new AbortController();
    const authors = new Set(video.comments.flatMap(({ authorId }) => (authorId == null ? [] : [authorId])));
    for (const authorId of authors) {
      void getPublicProfile(authorId, controller.signal)
        .then(({ avatarURL }) => {
          if (!controller.signal.aborted && avatarURL) {
            setCommentAvatars((previous) => ({ ...previous, [authorId]: avatarURL }));
          }
        })
        .catch(() => {
          // Fall back to the generic avatar if the public profile cannot be loaded.
        });
    }
    return () => controller.abort();
  }, [video]);

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

  const defaultAvatar = resolveAvatarURL(defaultAvatarPath);
  const videoSrc = new URL(video.videoUrl, `${getEnv().MEDIA_BASE_URL}/`).href;
  const channelRoute =
    video.user === 'Mark Ronson' ? '#channels/mark-ronson' : `#channels/name/${encodeURIComponent(video.user)}`;

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
        <p>
          {video.authorId != null ? (
            <a href={`#users/${video.authorId}`}>{video.user}</a>
          ) : video.authorId === null ? (
            <a href={channelRoute}>{video.user}</a>
          ) : (
            video.user
          )}
        </p>
        {video.channel && video.channel !== video.user && <p>Canal de origen: {video.channel}</p>}
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

      <VideoEngagement
        key={`engagement-${video.id}`}
        videoId={video.id}
        userId={userId}
        viewCount={video.viewCount}
        likeCount={video.likeCount}
      />

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
      <VideoComments
        key={`comments-${video.id}`}
        videoId={video.id}
        comments={video.comments}
        renderAuthor={(comment) => (
          <div className="comment-author">
            <img
              className="profile-avatar"
              src={
                comment.authorId != null && commentAvatars[comment.authorId]
                  ? resolveAvatarURL(commentAvatars[comment.authorId])
                  : defaultAvatar
              }
              onError={({ currentTarget }) => {
                if (currentTarget.src !== defaultAvatar) currentTarget.src = defaultAvatar;
              }}
              alt=""
              width={32}
              height={32}
              loading="lazy"
            />
            <strong>
              <a
                href={
                  comment.authorId != null
                    ? `#users/${comment.authorId}`
                    : `#videos/${video.id}/comments/${comment.id}/author`
                }
              >
                {comment.user}
              </a>
            </strong>
          </div>
        )}
        onReply={(reply) =>
          setVideo((current) =>
            current?.id === video.id && !current.comments.some((comment) => comment.id === reply.id)
              ? { ...current, comments: [...current.comments, reply] }
              : current
          )
        }
      />
    </section>
  );
}
