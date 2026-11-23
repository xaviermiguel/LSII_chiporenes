import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../SessionContext';
import { AuthError } from '../auth';
import type { VideoComment } from '../types/Video';
import { AuthForm } from './AuthForm';

const MAX_COMMENT_LENGTH = 300;
// Character.isWhitespace (Java 21): Unicode separators except non-breaking spaces, plus these controls.
// eslint-disable-next-line no-control-regex -- Java explicitly includes the U+001C–U+001F separators.
const javaBlank = /^(?:[\t-\r\u001c-\u001f]|(?![\u00a0\u2007\u202f])\p{Z})*$/u;

type CommentFormProps = {
  videoId: number;
  parent?: VideoComment;
  onPublished: (comment: VideoComment) => void;
  onCancel?: () => void;
};

export function CommentForm({ videoId, parent, onPublished, onCancel }: CommentFormProps) {
  const { user, loading, authenticated, request } = useSession();
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [resumeDraft, setResumeDraft] = useState(false);
  const [pending, setPending] = useState(false);
  const inputId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const loginPrompt = useRef<HTMLParagraphElement>(null);
  const inFlight = useRef<AbortController | null>(null);
  const needsLogin = !loading && !user;
  const sending = parent ? 'Enviando respuesta…' : 'Publicando…';

  useEffect(() => {
    if (!parent && !resumeDraft) return;
    if (needsLogin) loginPrompt.current?.focus();
    else if (!loading) input.current?.focus();
  }, [loading, needsLogin, parent, resumeDraft]);

  useEffect(() => () => inFlight.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || inFlight.current) return;
    const invalid = javaBlank.test(text)
      ? parent
        ? 'Escribe una respuesta antes de enviarla.'
        : 'Escribe un comentario antes de publicar.'
      : text.length > MAX_COMMENT_LENGTH
        ? `${parent ? 'La respuesta' : 'El comentario'} admite hasta ${MAX_COMMENT_LENGTH} caracteres.`
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
      const path = `/videos/${videoId}/comments`;
      const response = await request(parent ? `${path}/${parent.id}/replies` : path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (response.status !== 201) throw new Error('Unexpected publication status');
      const saved: VideoComment = await response.json();
      if (!controller.signal.aborted) {
        onPublished(saved);
        setText('');
        setResumeDraft(false);
      }
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (failure instanceof AuthError && failure.status === 401) {
        setResumeDraft(true);
        setError(
          parent
            ? 'Tu sesión ha caducado. Inicia sesión para enviar tu respuesta.'
            : 'Tu sesión ha caducado. Inicia sesión para publicar tu comentario.'
        );
      } else if (failure instanceof AuthError && failure.code === 'VIDEO_NOT_FOUND') {
        setError('El vídeo ya no está disponible.');
      } else if (failure instanceof AuthError && failure.code === 'COMMENT_NOT_FOUND') {
        setError('El comentario ya no está disponible.');
      } else {
        setError(
          failure instanceof AuthError
            ? failure.detail || failure.message
            : 'No se ha podido confirmar el envío. Comprueba tu conexión y revisa los comentarios antes de reintentar.'
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
      ) : needsLogin && !parent && !resumeDraft && !text ? (
        <a href="#login">Inicia sesión para comentar</a>
      ) : needsLogin ? (
        <>
          <p ref={loginPrompt} tabIndex={-1} role={error ? 'alert' : undefined}>
            {error || (parent ? 'Inicia sesión para responder a este comentario.' : 'Inicia sesión para comentar.')}
          </p>
          <AuthForm
            mode="login"
            embedded
            onSuccess={(account) => {
              authenticated(account);
              setError('');
            }}
          />
        </>
      ) : (
        <form onSubmit={(event) => void submit(event)} noValidate aria-busy={pending}>
          <div className="form-field">
            <label htmlFor={inputId}>{parent ? `Responder a ${parent.user}` : 'Escribe un comentario'}</label>
            <textarea
              id={inputId}
              ref={input}
              required
              maxLength={MAX_COMMENT_LENGTH}
              value={text}
              readOnly={pending}
              aria-invalid={!!fieldError}
              aria-describedby={fieldError ? `${inputId}-error` : `${inputId}-help`}
              onChange={(event) => {
                setText(event.target.value);
                setFieldError('');
              }}
            />
            <small id={`${inputId}-help`}>Máximo {MAX_COMMENT_LENGTH} caracteres.</small>
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
            {pending ? sending : parent ? 'Enviar respuesta' : 'Publicar comentario'}
          </button>
        </form>
      )}
      {pending && <p role="status">{sending}</p>}
      {onCancel && (
        <button className="button button-secondary" type="button" onClick={onCancel} disabled={pending}>
          Cancelar respuesta
        </button>
      )}
    </div>
  );
}
