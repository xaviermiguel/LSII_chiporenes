import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../SessionContext';
import { AuthError } from '../auth';

type Profile = { id: number; displayName: string; email: string; description: string };
const profileFields = ['displayName', 'email', 'description'] as const;
const passwordFields = ['currentPassword', 'newPassword', 'confirmPassword'] as const;
const labels = {
  displayName: 'Nombre de usuario',
  email: 'Email',
  description: 'Descripción',
  currentPassword: 'Contraseña actual',
  newPassword: 'Nueva contraseña',
  confirmPassword: 'Confirmar nueva contraseña',
};

export function AccountProfile({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const { request, authenticated } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState<'profile' | 'password' | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const alert = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError('');
    void request('/auth/profile', { signal: controller.signal })
      .then((response) => response.json())
      .then((value: Profile) => {
        if (!controller.signal.aborted) setProfile(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError('No se ha podido cargar tu perfil.');
      });
    return () => controller.abort();
  }, [request, retry]);

  useEffect(() => {
    if (error) alert.current?.focus();
  }, [error]);

  async function submit(event: FormEvent<HTMLFormElement>, kind: 'profile' | 'password') {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const fields = kind === 'profile' ? profileFields : passwordFields;
    const body = Object.fromEntries(fields.map((key) => [key, String(data.get(key) || '')]));
    setError('');
    setNotice('');
    if (kind === 'password' && body.newPassword !== body.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    lock.current = true;
    setPending(kind);
    try {
      const response = await request(kind === 'profile' ? '/auth/profile' : '/auth/password', {
        method: kind === 'profile' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!mounted.current) return;
      if (kind === 'profile') {
        const updated: Profile = await response.json();
        if (!mounted.current) return;
        setProfile(updated);
        authenticated(updated);
        setNotice('Perfil actualizado.');
      } else {
        form.reset();
        onPasswordChanged();
      }
    } catch (cause) {
      setError(
        cause instanceof AuthError
          ? cause.message
          : 'No se ha podido guardar. Comprueba tu conexión e inténtalo de nuevo.'
      );
    } finally {
      if (kind === 'password') form.reset();
      lock.current = false;
      setPending(null);
    }
  }

  if (loadError)
    return (
      <section>
        <h1>Mi cuenta</h1>
        <p role="alert" className="status-message status-error">
          {loadError}
        </p>
        <button className="button" onClick={() => setRetry((value) => value + 1)}>
          Reintentar
        </button>
      </section>
    );
  if (!profile) return <p role="status">Cargando perfil…</p>;
  return (
    <section className="account-page" aria-labelledby="account-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Tu espacio</p>
          <h1 id="account-title">Mi cuenta</h1>
        </div>
        <a className="button button-secondary" href="#my-videos">
          Mis vídeos
        </a>
      </div>
      <p>Actualiza tus datos y la seguridad de tu cuenta. Los campos con * son obligatorios.</p>
      {notice && (
        <p className="status-message" role="status">
          {notice}
        </p>
      )}
      <p ref={alert} role="alert" tabIndex={-1} className={error ? 'status-message status-error' : 'visually-hidden'}>
        {error}
      </p>
      <div className="account-grid">
        <form
          className="account-panel"
          onSubmit={(event) => void submit(event, 'profile')}
          aria-busy={pending === 'profile'}
        >
          <h2>Información personal</h2>
          <fieldset disabled={pending !== null}>
            <legend className="visually-hidden">Datos del perfil</legend>
            {profileFields.map((field) => (
              <div className="form-field" key={field}>
                <label htmlFor={`profile-${field}`}>
                  {labels[field]}
                  {field !== 'description' ? ' *' : ''}
                </label>
                {field === 'description' ? (
                  <textarea
                    id={`profile-${field}`}
                    name={field}
                    rows={5}
                    maxLength={2000}
                    value={profile[field]}
                    onChange={(event) => setProfile({ ...profile, [field]: event.target.value })}
                  />
                ) : (
                  <input
                    id={`profile-${field}`}
                    name={field}
                    type={field === 'email' ? 'email' : 'text'}
                    required
                    maxLength={field === 'email' ? 254 : undefined}
                    autoComplete={field === 'email' ? 'email' : 'nickname'}
                    value={profile[field]}
                    onChange={(event) => setProfile({ ...profile, [field]: event.target.value })}
                  />
                )}
              </div>
            ))}
            <p className="muted-text">Nombre: hasta 30 caracteres. Descripción: hasta 2000.</p>
            <button className="button" type="submit">
              {pending === 'profile' ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </fieldset>
        </form>
        <form
          className="account-panel"
          onSubmit={(event) => void submit(event, 'password')}
          aria-busy={pending === 'password'}
        >
          <h2>Cambiar contraseña</h2>
          <p>Después del cambio tendrás que iniciar sesión de nuevo en este navegador.</p>
          <fieldset disabled={pending !== null}>
            <legend className="visually-hidden">Seguridad de la cuenta</legend>
            {passwordFields.map((field) => (
              <div className="form-field" key={field}>
                <label htmlFor={field}>{labels[field]} *</label>
                <input
                  id={field}
                  name={field}
                  type="password"
                  required
                  autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'}
                  maxLength={72}
                  minLength={field === 'currentPassword' ? undefined : 8}
                  aria-describedby="password-help"
                />
              </div>
            ))}
            <p id="password-help" className="muted-text">
              Usa entre 8 y 72 caracteres ASCII imprimibles, sin espacios al principio ni al final.
            </p>
            <button className="button" type="submit">
              {pending === 'password' ? 'Cambiando…' : 'Cambiar contraseña'}
            </button>
          </fieldset>
        </form>
      </div>
    </section>
  );
}
