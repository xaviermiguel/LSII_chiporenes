import { useEffect, useState } from 'react';
import axios from 'axios';
import { getEnv } from '../utils/Env';
import { defaultAvatarPath, resolveAvatarURL } from '../userProfile';
import type { VideoComment, VideoDetail } from '../types/Video';

type AuthorState = { status: 'loading' | 'missing' | 'error' } | { status: 'ready'; comment: VideoComment };

type ImportedCommentProfileProps = {
  videoId: string;
  commentId: string;
  onBack: () => void;
};

export function ImportedCommentProfile({ videoId, commentId, onBack }: ImportedCommentProfileProps) {
  const [state, setState] = useState<AuthorState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void axios
      .get<VideoDetail>(`${getEnv().API_BASE_URL}/videos/${videoId}`, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const comment = data.comments.find(({ id }) => String(id) === commentId);
        setState(comment ? { status: 'ready', comment } : { status: 'missing' });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({ status: axios.isAxiosError(error) && error.response?.status === 404 ? 'missing' : 'error' });
      });
    return () => controller.abort();
  }, [videoId, commentId, attempt]);

  return (
    <section className="account-panel" aria-label="Perfil del comentarista">
      {state.status === 'loading' && <p role="status">Cargando perfil…</p>}
      {state.status === 'missing' && (
        <p role="alert" className="status-message status-error">
          Perfil no encontrado.
        </p>
      )}
      {state.status === 'error' && (
        <>
          <p role="alert" className="status-message status-error">
            No se ha podido cargar el perfil.
          </p>
          <button
            className="button"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((previous) => previous + 1);
            }}
          >
            Reintentar
          </button>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <img className="profile-avatar" src={resolveAvatarURL(defaultAvatarPath)} alt="" width={96} height={96} />
          <h1>{state.comment.user}</h1>
          <p>Participa en la conversación de este vídeo del catálogo de ProTube.</p>
        </>
      )}
      <button className="button button-secondary" onClick={onBack}>
        Volver al vídeo
      </button>
    </section>
  );
}
