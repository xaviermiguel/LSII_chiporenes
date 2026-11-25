import { useEffect, useRef, useState } from 'react';
import { AuthError } from '../../auth.ts';
import { useSession } from '../../SessionContext.tsx';

type LikeState = { likeCount: number; likedByMe: boolean };

type CommentLikesProps = { videoId: number; commentId: number; author: string };

export function CommentLikes({ videoId, commentId, author }: CommentLikesProps) {
  const { user, loading, loggingOut, request } = useSession();
  const viewer = user?.id ?? null;
  const path = `/videos/${videoId}/comments/${commentId}/likes`;
  const [confirmed, setConfirmed] = useState<{ viewer: number | null; likes: LikeState }>();
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [pending, setPending] = useState(false);
  const scope = useRef<AbortController>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    scope.current = controller;
    setLoadError(false);
    setPending(false);
    sending.current = false;

    async function load() {
      try {
        const response = await request(path, { signal: controller.signal });
        const likes: LikeState = await response.json();
        if (!controller.signal.aborted) setConfirmed({ viewer, likes });
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }

    void load();
    return () => controller.abort();
  }, [attempt, loading, path, request, viewer]);

  const ready = confirmed?.viewer === viewer && !loadError;
  const liked = ready && viewer !== null && confirmed.likes.likedByMe;
  const disabled = loading || loggingOut || pending || (viewer !== null && !ready);

  async function toggle() {
    if (disabled || sending.current) return;
    if (viewer === null) {
      setPrompt('Inicia sesión para dar me gusta a este comentario.');
      return;
    }

    const signal = scope.current?.signal;
    if (!signal || signal.aborted) return;
    sending.current = true;
    setPending(true);
    setPrompt('');
    setActionError('');
    try {
      const response = await request(path, { method: liked ? 'DELETE' : 'PUT', signal });
      const likes: LikeState = await response.json();
      if (!signal.aborted) setConfirmed({ viewer, likes });
    } catch (error) {
      if (signal.aborted) return;
      if (error instanceof AuthError && error.status === 401) {
        setPrompt('Tu sesión ha caducado. Inicia sesión para volver a reaccionar.');
      } else {
        setActionError('No se pudo actualizar el me gusta. Inténtalo de nuevo.');
      }
    } finally {
      if (!signal.aborted) {
        sending.current = false;
        setPending(false);
      }
    }
  }

  return (
    <div>
      <button
        className="button button-secondary"
        type="button"
        aria-label={`Me gusta el comentario de ${author}`}
        aria-pressed={liked}
        aria-disabled={disabled}
        onClick={() => void toggle()}
      >
        {liked && <span aria-hidden="true">✓ </span>}Me gusta
      </button>{' '}
      <span aria-live="polite">
        {confirmed ? `${confirmed.likes.likeCount} Me gusta` : loadError ? 'Sin contador' : 'Cargando likes…'}
      </span>
      {loadError && (
        <div>
          <p role="alert">No se pudieron cargar los me gusta.</p>
          <button className="button button-secondary" type="button" onClick={() => setAttempt(attempt + 1)}>
            Reintentar carga
          </button>
        </div>
      )}
      {actionError && <p role="alert">{actionError}</p>}
      {prompt && (
        <div>
          <p role="alert">{prompt}</p>
          <a href="#login">Iniciar sesión</a>
        </div>
      )}
    </div>
  );
}
