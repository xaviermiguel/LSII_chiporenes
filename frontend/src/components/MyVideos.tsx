import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../SessionContext';
import { AuthError } from '../auth';
import { getEnv } from '../utils/Env';
import type { VideoListResponse } from '../types/Video';

function errorMessage(error: unknown) {
  if (error instanceof AuthError) {
    if (error.status === 403) return 'Solo puedes editar tus propios vídeos.';
    if (error.status === 404) return 'El vídeo ya no está disponible.';
    if (error.code === 'INVALID_VIDEO_UPDATE') return error.detail || 'Revisa el título y la descripción.';
    return error.message;
  }
  return 'No se ha podido completar la solicitud. Comprueba tu conexión y vuelve a intentarlo.';
}

export function MyVideos({ onOpen }: { onOpen: (id: number) => void }) {
  const { request } = useSession();
  const [page, setPage] = useState(0);
  const [videos, setVideos] = useState<VideoListResponse | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setVideos(null);
    setError('');
    void request(`/videos/me?page=${page}&size=12`, { signal: controller.signal })
      .then((response) => response.json())
      .then((value: VideoListResponse) => {
        if (!controller.signal.aborted) setVideos(value);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [request, page, retry]);
  return (
    <section aria-labelledby="my-videos-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tu espacio</p>
          <h1 id="my-videos-title">Mis vídeos</h1>
        </div>
        <a className="button" href="#upload">
          Publicar vídeo
        </a>
      </div>
      <p>Consulta y actualiza los vídeos que has publicado.</p>
      {error ? (
        <div>
          <p className="status-message status-error" role="alert">
            {error}
          </p>
          <button className="button" onClick={() => setRetry((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      ) : !videos ? (
        <p role="status">Cargando tus vídeos…</p>
      ) : (
        <>
          {videos.items.length === 0 ? (
            <p className="status-message">
              {page === 0 ? 'Todavía no has publicado ningún vídeo.' : 'No hay vídeos en esta página.'}
            </p>
          ) : (
            <ul className="video-catalog" aria-label="Tus vídeos">
              {videos.items.map((video) => (
                <li key={video.id} className="owned-video">
                  <button className="video-card" onClick={() => onOpen(video.id)} aria-label={`Ver ${video.title}`}>
                    <span className="video-card-media">
                      <img
                        alt=""
                        src={
                          new URL(video.thumbnailUrl, new URL(`${getEnv().MEDIA_BASE_URL}/`, window.location.href)).href
                        }
                      />
                    </span>
                    <span className="video-card-body">
                      <span className="video-card-title">{video.title}</span>
                    </span>
                  </button>
                  <a
                    className="button button-secondary"
                    href={`#videos/${video.id}/edit`}
                    aria-label={`Editar ${video.title}`}
                  >
                    Editar vídeo
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="account-pagination" aria-label="Paginación de mis vídeos">
            <button className="button button-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
              Anterior
            </button>
            <span>Página {page + 1}</span>
            <button className="button button-secondary" disabled={!videos.hasNext} onClick={() => setPage(page + 1)}>
              Siguiente
            </button>
          </div>
        </>
      )}
    </section>
  );
}

type EditableVideo = { id: number; title: string; description: string };
export function EditVideo({ videoId }: { videoId: number }) {
  const { request } = useSession();
  const [video, setVideo] = useState<EditableVideo | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const alert = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setVideo(null);
    setNotice('');
    void request(`/videos/${videoId}/edit`, { signal: controller.signal })
      .then((response) => response.json())
      .then((value: EditableVideo) => {
        if (!controller.signal.aborted) setVideo(value);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(cause));
      });
    return () => controller.abort();
  }, [request, videoId, retry]);
  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !video || !event.currentTarget.reportValidity()) return;
    if (!video.title.trim() || !video.description.trim()) {
      setError('El título y la descripción son obligatorios.');
      return;
    }
    lock.current = true;
    setPending(true);
    setError('');
    setNotice('');
    try {
      const response = await request(`/videos/${videoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: video.title.trim(), description: video.description.trim() }),
      });
      setVideo(await response.json());
      setNotice('Vídeo actualizado.');
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section className="auth-panel" aria-labelledby="edit-title">
      <p className="eyebrow">Tus publicaciones</p>
      <h1 id="edit-title">Editar vídeo</h1>
      <p>
        <a href="#my-videos">Volver a mis vídeos</a>
      </p>
      <p ref={alert} role="alert" tabIndex={-1} className={error ? 'status-message status-error' : 'visually-hidden'}>
        {error}
      </p>
      {notice && (
        <p role="status" className="status-message">
          {notice}
        </p>
      )}
      {!video ? (
        error ? (
          <button className="button" onClick={() => setRetry((value) => value + 1)}>
            Reintentar
          </button>
        ) : (
          <p role="status">Cargando vídeo…</p>
        )
      ) : (
        <form onSubmit={(event) => void save(event)} aria-busy={pending}>
          <fieldset disabled={pending}>
            <legend className="visually-hidden">Datos del vídeo</legend>
            <div className="form-field">
              <label htmlFor="edit-video-title">Título *</label>
              <input
                id="edit-video-title"
                required
                maxLength={255}
                value={video.title}
                onChange={(event) => setVideo({ ...video, title: event.target.value })}
              />
            </div>
            <div className="form-field">
              <label htmlFor="edit-description">Descripción *</label>
              <textarea
                id="edit-description"
                required
                rows={6}
                value={video.description}
                onChange={(event) => setVideo({ ...video, description: event.target.value })}
              />
            </div>
            <button className="button" type="submit">
              {pending ? 'Guardando…' : 'Guardar vídeo'}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
