import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../SessionContext';
import { createThumbnail, MAX_UPLOAD_BYTES, publicationError, VIDEO_ACCEPT } from '../videoPublication';
import type { Publication, PublicationDraft } from '../videoPublication';

type Field = 'video' | 'title' | 'description';
type Props = {
  draft: PublicationDraft;
  onDraft: (value: PublicationDraft) => void;
  onOpen: (id: number) => void;
};

export function VideoPublication({ draft, onDraft, onOpen }: Props) {
  const { request } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [published, setPublished] = useState<Publication | null>(null);
  const lock = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (message) status.current?.focus();
  }, [message]);
  useEffect(() => {
    if (published) confirmation.current?.focus();
  }, [published]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || published) return;
    const invalid: Partial<Record<Field, string>> = {};
    if (!file) invalid.video = 'Selecciona un archivo de vídeo.';
    else if (!file.size) invalid.video = 'El archivo está vacío.';
    else if (!/\.mp4$/i.test(file.name) || (file.type && file.type !== 'video/mp4'))
      invalid.video = 'Selecciona un vídeo en formato MP4.';
    else if (file.size > MAX_UPLOAD_BYTES) invalid.video = 'El vídeo supera el máximo de 100 MiB.';
    if (!draft.title.trim()) invalid.title = 'Introduce un título.';
    else if (draft.title.length > 255) invalid.title = 'El título admite hasta 255 caracteres.';
    if (!draft.description.trim()) invalid.description = 'Introduce una descripción.';
    setErrors(invalid);
    setMessage('');
    const first = (['video', 'title', 'description'] as Field[]).find((field) => invalid[field]);
    if (first) {
      (form.current?.elements.namedItem(first) as HTMLInputElement).focus();
      return;
    }
    lock.current = true;
    setPending(true);
    try {
      const thumbnail = await createThumbnail(file!);
      const data = new FormData();
      data.append('title', draft.title);
      data.append('description', draft.description);
      data.append('video', file!);
      data.append('thumbnail', thumbnail, 'thumbnail.webp');
      // The server remains authoritative for multipart overhead and all validation.
      if (file!.size + thumbnail.size + new Blob([draft.title, draft.description]).size >= MAX_UPLOAD_BYTES) {
        setMessage(
          'El vídeo, la miniatura y los textos deben caber en los 100 MiB de la petición. Selecciona un vídeo más pequeño.'
        );
        return;
      }
      const response = await request('/videos', { method: 'POST', body: data });
      const result: Publication = await response.json();
      if (!Number.isSafeInteger(result.id) || result.id <= 0) {
        setMessage(
          'El servidor ha respondido sin un identificador válido. Revisa el catálogo antes de volver a publicar.'
        );
        return;
      }
      setPublished(result);
      onDraft({ title: '', description: '', hadFile: false });
    } catch (error) {
      setMessage(publicationError(error));
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  if (published)
    return (
      <section className="auth-panel" aria-labelledby="publication-success">
        <h1 ref={confirmation} id="publication-success" tabIndex={-1}>
          Vídeo publicado
        </h1>
        <p className="status-message status-success" role="status">
          Se ha publicado correctamente «{published.title}».
        </p>
        <div className="state-panel">
          <button className="button" onClick={() => onOpen(published.id)}>
            Ver vídeo publicado
          </button>
          <a className="button button-secondary" href="#contenido">
            Ir al catálogo
          </a>
        </div>
      </section>
    );

  return (
    <section className="auth-panel" aria-labelledby="publication-title">
      <p className="eyebrow">Comunidad ProTube</p>
      <h1 id="publication-title">Publicar vídeo</h1>
      <p>Todos los campos son obligatorios (*). La miniatura se genera automáticamente a partir del vídeo.</p>
      <p id="video-help" className="muted-text">
        Formato admitido: MP4 reproducible en tu navegador. Máximo: 100 MiB (104 857 600 bytes) por archivo y por
        petición completa, incluidos miniatura, textos y datos del formulario. El servidor realiza la validación
        definitiva.
      </p>
      {draft.hadFile && !file && (
        <p className="status-message status-warning" role="status">
          Se han conservado el título y la descripción. Debes volver a seleccionar el archivo de vídeo.
        </p>
      )}
      <form ref={form} noValidate aria-busy={pending} onSubmit={(event) => void submit(event)}>
        <fieldset disabled={pending}>
          <legend className="visually-hidden">Datos de publicación</legend>
          <div className="form-field">
            <label htmlFor="video">Archivo de vídeo *</label>
            <input
              id="video"
              name="video"
              type="file"
              accept={VIDEO_ACCEPT}
              required
              aria-invalid={!!errors.video}
              aria-describedby={`video-help${errors.video ? ' video-error' : ''}`}
              onChange={(event) => {
                const selected = event.target.files?.[0] || null;
                setFile(selected);
                onDraft({ ...draft, hadFile: !!selected });
                setErrors((previous) => ({ ...previous, video: undefined }));
              }}
            />
            {errors.video && (
              <p className="field-error" id="video-error">
                {errors.video}
              </p>
            )}
          </div>
          {(['title', 'description'] as const).map((field) => {
            const props = {
              id: field,
              name: field,
              required: true,
              value: draft[field],
              'aria-invalid': !!errors[field],
              'aria-describedby': errors[field] ? `${field}-error` : undefined,
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                onDraft({ ...draft, [field]: event.target.value });
                setErrors((previous) => ({ ...previous, [field]: undefined }));
              },
            };
            return (
              <div className="form-field" key={field}>
                <label htmlFor={field}>{field === 'title' ? 'Título' : 'Descripción'} *</label>
                {field === 'title' ? <input {...props} type="text" /> : <textarea {...props} rows={5} />}
                {errors[field] && (
                  <p className="field-error" id={`${field}-error`}>
                    {errors[field]}
                  </p>
                )}
              </div>
            );
          })}
          <button className="button" type="submit">
            {pending ? 'Subiendo vídeo…' : 'Publicar vídeo'}
          </button>
        </fieldset>
        <p
          ref={status}
          role="alert"
          tabIndex={-1}
          className={message ? 'status-message status-error' : 'visually-hidden'}
        >
          {message}
        </p>
        {pending && (
          <p className="status-message" role="status">
            Preparando la miniatura y subiendo el vídeo. Espera a la confirmación.
          </p>
        )}
      </form>
    </section>
  );
}
