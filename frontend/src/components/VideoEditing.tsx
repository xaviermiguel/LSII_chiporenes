import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useSession } from '../SessionContext';
import { AuthError } from '../auth';
import type { Category, VideoDetail } from '../types/Video';
import { blankMetadata, editingError } from '../videoEditing';

export type EditingDraft = { title: string; description: string; tags: string; categoryId: string };
type Props = {
  videoId: string;
  draft?: EditingDraft;
  onDraft: (draft: EditingDraft | undefined) => void;
  onBack: (id: number) => void;
};

export function VideoEditing({ videoId, draft, onDraft, onBack }: Props) {
  const { user, request } = useSession();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState<VideoDetail | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof EditingDraft, string>>>({});
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const callbacks = useRef({ request, onDraft, draft });
  callbacks.current = { request, onDraft, draft };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setReady(false);
    setMessage('');
    setBlocked(false);
    async function load() {
      try {
        const response = await callbacks.current.request(`/videos/${encodeURIComponent(videoId)}`, {
          signal: controller.signal,
        });
        const video: VideoDetail = await response.json();
        if (controller.signal.aborted) return;
        if (video.ownerId !== user?.id) {
          setBlocked(true);
          setMessage('Solo puedes editar vídeos propios.');
          return;
        }
        const result = await callbacks.current.request('/videos/categories', { signal: controller.signal });
        const values: Category[] = await result.json();
        if (controller.signal.aborted) return;
        setCategories(values);
        setReady(true);
        if (!callbacks.current.draft)
          callbacks.current.onDraft({
            title: video.title,
            description: video.description,
            tags: video.tags.join('\n'),
            categoryId: video.category ? String(video.category.id) : '',
          });
      } catch (error) {
        if (!controller.signal.aborted) {
          setMessage(editingError(error));
          setBlocked(error instanceof AuthError && [403, 404].includes(error.status));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [videoId, user?.id, retry]);

  useEffect(() => {
    if (message || saved) status.current?.focus();
  }, [message, saved]);

  function change(field: keyof EditingDraft, value: string) {
    onDraft({ ...draft!, [field]: value });
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !draft || blocked || saved) return;
    const invalid: typeof errors = {};
    if (blankMetadata(draft.title)) invalid.title = 'Introduce un título.';
    else if (draft.title.length > 255) invalid.title = 'El título admite hasta 255 caracteres.';
    if (blankMetadata(draft.description)) invalid.description = 'Introduce una descripción.';
    if (draft.categoryId && !categories.some((category) => String(category.id) === draft.categoryId))
      invalid.categoryId = 'Selecciona una categoría disponible.';
    setErrors(invalid);
    setMessage('');
    const first = (Object.keys(invalid) as (keyof EditingDraft)[])[0];
    if (first) {
      (form.current?.elements.namedItem(first) as HTMLElement)?.focus();
      return;
    }
    lock.current = true;
    setPending(true);
    try {
      const response = await request(`/videos/${encodeURIComponent(videoId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          description: draft.description,
          tags: draft.tags.split('\n').filter(Boolean),
          categoryId: draft.categoryId ? Number(draft.categoryId) : null,
        }),
      });
      setSaved(await response.json());
      onDraft(undefined);
    } catch (error) {
      setMessage(editingError(error));
      if (error instanceof AuthError && [403, 404].includes(error.status) && error.code !== 'INVALID_CSRF_TOKEN')
        setBlocked(true);
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  return (
    <section className="auth-panel" aria-labelledby="editing-title">
      <h1 id="editing-title">Editar vídeo</h1>
      {loading ? (
        <p className="status-message" role="status">
          Cargando datos del vídeo…
        </p>
      ) : saved ? (
        <>
          <p ref={status} tabIndex={-1} className="status-message status-success" role="status">
            Cambios guardados correctamente.
          </p>
          <h2>{saved.title}</h2>
          <p className="video-description">{saved.description}</p>
          <p>Categoría: {saved.category?.name || 'Sin categoría'}</p>
          <ul className="video-tags" aria-label="Etiquetas guardadas">
            {saved.tags.map((tag) => (
              <li className="tag" key={tag}>
                {tag}
              </li>
            ))}
          </ul>
          <button className="button" onClick={() => onBack(saved.id)}>
            Ver vídeo actualizado
          </button>
        </>
      ) : (
        <>
          {message && (
            <p ref={status} tabIndex={-1} className="status-message status-error" role="alert">
              {message}
            </p>
          )}
          {draft && ready && (
            <form ref={form} noValidate aria-busy={pending} onSubmit={(event) => void submit(event)}>
              <fieldset disabled={pending || blocked}>
                <legend className="visually-hidden">Metadatos del vídeo</legend>
                <p>Los campos marcados con * son obligatorios.</p>
                {(['title', 'description', 'tags', 'categoryId'] as const).map((field) => {
                  const props = {
                    id: field,
                    name: field,
                    value: draft[field],
                    required: field === 'title' || field === 'description',
                    'aria-invalid': !!errors[field],
                    'aria-describedby': errors[field] ? `${field}-error` : field === 'tags' ? 'tags-help' : undefined,
                    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
                      change(field, event.target.value),
                  };
                  return (
                    <div className="form-field" key={field}>
                      <label htmlFor={field}>
                        {
                          {
                            title: 'Título *',
                            description: 'Descripción *',
                            tags: 'Etiquetas (opcional)',
                            categoryId: 'Categoría (opcional)',
                          }[field]
                        }
                      </label>
                      {field === 'title' ? (
                        <input {...props} type="text" />
                      ) : field === 'categoryId' ? (
                        <select {...props}>
                          <option value="">Sin categoría</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <textarea {...props} rows={field === 'tags' ? 3 : 5} />
                      )}
                      {field === 'tags' && (
                        <p id="tags-help" className="muted-text">
                          Escribe una etiqueta por línea. Las vacías y repetidas se omiten.
                        </p>
                      )}
                      {errors[field] && (
                        <p className="field-error" id={`${field}-error`}>
                          {errors[field]}
                        </p>
                      )}
                    </div>
                  );
                })}
                <button className="button" type="submit">
                  {pending ? 'Guardando cambios…' : 'Guardar cambios'}
                </button>
              </fieldset>
              {pending && (
                <p className="status-message" role="status">
                  Guardando cambios…
                </p>
              )}
            </form>
          )}
          {!ready && !blocked && (
            <button className="button" onClick={() => setRetry((value) => value + 1)}>
              Reintentar
            </button>
          )}
          <button
            className="button button-secondary"
            disabled={pending}
            onClick={() => {
              onDraft(undefined);
              onBack(Number(videoId));
            }}
          >
            Cancelar
          </button>
        </>
      )}
    </section>
  );
}
