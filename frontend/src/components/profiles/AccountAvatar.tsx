import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../../SessionContext.tsx';
import { AuthError } from '../../auth.ts';
import { defaultAvatarPath, getPublicProfile, resolveAvatarURL } from '../../userProfile.ts';

const maxAvatarSize = 2 * 1024 * 1024;

function avatarUploadError(error: unknown) {
  if (error instanceof AuthError) {
    if (error.status === 413) return 'El avatar no puede superar los 2 MiB.';
    if (error.status === 400) return 'Selecciona un JPEG o PNG válido de hasta 4096 × 4096 píxeles.';
    return error.message;
  }
  return 'No se ha podido subir el avatar. Comprueba tu conexión e inténtalo de nuevo.';
}

export function AccountAvatar({ userId }: { userId: number }) {
  const { request } = useSession();
  const [avatarPath, setAvatarPath] = useState(defaultAvatarPath);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const upload = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getPublicProfile(userId, controller.signal)
      .then(({ avatarURL }) => {
        if (!controller.signal.aborted) setAvatarPath(avatarURL || defaultAvatarPath);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRefreshFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, retry]);

  useEffect(() => () => upload.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (upload.current || loading) return;
    setNotice('');
    setError('');

    const file = input.current?.files?.[0];
    const supported =
      file &&
      (file.type === 'image/jpeg' || file.type === 'image/png' || (!file.type && /\.(jpe?g|png)$/i.test(file.name)));
    if (!file || !supported || file.size === 0) {
      setError('Selecciona una imagen JPEG o PNG válida.');
      return;
    }
    if (file.size > maxAvatarSize) {
      setError('El avatar no puede superar los 2 MiB.');
      return;
    }

    const body = new FormData();
    body.append('avatar', file);
    const controller = new AbortController();
    const { signal } = controller;
    upload.current = controller;
    setUploading(true);
    try {
      await request('/auth/profile/avatar', { method: 'PUT', body, signal });
      if (signal.aborted) return;
      if (input.current) input.current.value = '';
      setNotice('Avatar guardado.');
      setRefreshFailed(false);

      try {
        const { avatarURL } = await getPublicProfile(userId, signal);
        if (!signal.aborted) setAvatarPath(avatarURL || defaultAvatarPath);
      } catch {
        if (!signal.aborted) setRefreshFailed(true);
      }
    } catch (cause) {
      if (!signal.aborted) setError(avatarUploadError(cause));
    } finally {
      upload.current = null;
      if (!signal.aborted) setUploading(false);
    }
  }

  return (
    <form className="account-panel" onSubmit={(event) => void submit(event)} aria-busy={loading || uploading}>
      <h2>Avatar</h2>
      <img
        className="profile-avatar"
        src={resolveAvatarURL(avatarPath)}
        alt="Tu avatar actual"
        width={96}
        height={96}
      />
      <fieldset disabled={loading || uploading}>
        <legend className="visually-hidden">Cambiar avatar</legend>
        <div className="form-field">
          <label htmlFor="profile-avatar">Imagen del avatar</label>
          <input
            ref={input}
            id="profile-avatar"
            type="file"
            accept="image/jpeg,image/png,.jpg,.jpeg,.png"
            aria-describedby="profile-avatar-help"
            onChange={() => {
              setError('');
              setNotice('');
            }}
          />
        </div>
        <p id="profile-avatar-help" className="muted-text">
          JPEG o PNG de hasta 2 MiB y 4096 × 4096 píxeles.
        </p>
        <button className="button" type="submit">
          {uploading ? 'Subiendo avatar…' : 'Guardar avatar'}
        </button>
      </fieldset>
      {notice && (
        <p className="status-message" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="status-message status-error" role="alert">
          {error}
        </p>
      )}
      {refreshFailed && (
        <div>
          <p>No se ha podido actualizar la imagen del avatar.</p>
          <button
            className="button button-secondary"
            type="button"
            disabled={loading || uploading}
            onClick={() => {
              setRefreshFailed(false);
              setLoading(true);
              setRetry((value) => value + 1);
            }}
          >
            Volver a cargar el avatar
          </button>
        </div>
      )}
    </form>
  );
}
