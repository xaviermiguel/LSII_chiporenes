import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../SessionContext';
import { AuthError } from '../auth';
import type { VideoComment } from '../types/Video';
import { AuthForm } from './AuthForm';

const MAX_REPLY_LENGTH = 300;

type ReplyFormProps = {
  videoId: number;
  parent: VideoComment;
  onPublished: (reply: VideoComment) => void;
  onCancel: () => void;
};

export function ReplyForm({ videoId, parent, onPublished, onCancel }: ReplyFormProps) {
  const { user, loading, authenticated, request } = useSession();
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const inputId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const loginPrompt = useRef<HTMLParagraphElement>(null);
  const inFlight = useRef<AbortController | null>(null);
  const needsLogin = !loading && (!user || expired);

  useEffect(() => {
    if (needsLogin) loginPrompt.current?.focus();
    else if (!loading) input.current?.focus();
  }, [loading, needsLogin]);

  useEffect(() => () => inFlight.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || expired || inFlight.current) return;
    const invalid = !text.trim()
      ? 'Escribe una respuesta antes de enviarla.'
      : text.length > MAX_REPLY_LENGTH
        ? `La respuesta admite hasta ${MAX_REPLY_LENGTH} caracteres.`
        : '';
    setFieldError(invalid);
    setError('');
    if (invalid) {
      input.current?.focus();
      return;
    }

    const controller = new AbortController();
    inFlight.current = controller;
    setPending(true);
    try {
      const response = await request(`/videos/${videoId}/comments/${parent.id}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      const reply: VideoComment = await response.json();
      if (!controller.signal.aborted) onPublished(reply);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof AuthError && failure.status === 401) {
        setExpired(true);
        setError('Tu sesión ha caducado. Inicia sesión para enviar tu respuesta.');
      } else if (failure instanceof AuthError && failure.code === 'COMMENT_NOT_FOUND') {
        setError('El comentario ya no está disponible.');
      } else {
        setError(
          failure instanceof AuthError
            ? failure.detail || failure.message
            : 'No se ha podido enviar la respuesta. Comprueba tu conexión e inténtalo de nuevo.'
        );
      }
    } finally {
      inFlight.current = null;
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return (
    <div className="reply-composer">
      {loading ? (
        <p role="status">Comprobando sesión…</p>
      ) : needsLogin ? (
        <>
          <p ref={loginPrompt} tabIndex={-1} role={error ? 'alert' : undefined}>
            {error || 'Inicia sesión para responder a este comentario.'}
          </p>
          <AuthForm
            mode="login"
            embedded
            onSuccess={(account) => {
              authenticated(account);
              setExpired(false);
              setError('');
            }}
          />
        </>
      ) : (
        <form onSubmit={(event) => void submit(event)} noValidate aria-busy={pending}>
          <div className="form-field">
            <label htmlFor={inputId}>Responder a {parent.user}</label>
            <textarea
              id={inputId}
              ref={input}
              required
              maxLength={MAX_REPLY_LENGTH}
              value={text}
              readOnly={pending}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${inputId}-error` : `${inputId}-help`}
              onChange={(event) => {
                setText(event.target.value);
                setFieldError('');
              }}
            />
            <small id={`${inputId}-help`}>Máximo {MAX_REPLY_LENGTH} caracteres.</small>
            {fieldError && (
              <p id={`${inputId}-error`} className="field-error" role="alert">
                {fieldError}
              </p>
            )}
          </div>
          {error && (
            <p className="status-message status-error" role="alert">
              {error}
            </p>
          )}
          <button className="button" type="submit" disabled={pending}>
            {pending ? 'Enviando respuesta…' : 'Enviar respuesta'}
          </button>
        </form>
      )}
      {pending && <p role="status">Enviando respuesta…</p>}
      <button className="button button-secondary" type="button" onClick={onCancel} disabled={pending}>
        Cancelar respuesta
      </button>
    </div>
  );
}
