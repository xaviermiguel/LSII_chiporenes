import { AuthError } from './auth';

// Match Java String.isBlank (Character.isWhitespace), including its treatment of NBSP.
export function blankMetadata(value: string): boolean {
  return Array.from(value).every((character) => {
    const code = character.charCodeAt(0);
    return (
      (code >= 9 && code <= 13) ||
      (code >= 28 && code <= 32) ||
      /^[\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]$/u.test(character)
    );
  });
}

export function editingError(error: unknown): string {
  if (!(error instanceof AuthError))
    return 'No se ha podido conectar. Comprueba tu conexión e inténtalo de nuevo. Se conservan tus cambios.';
  if (error.status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo. Se conservan tus cambios.';
  if (error.status === 404) return 'Vídeo no encontrado o no disponible.';
  if (error.code === 'INVALID_CSRF_TOKEN') return error.message;
  if (error.status === 403) return 'No tienes permiso para editar este vídeo.';
  if (error.status === 400) return error.detail || 'Revisa los campos y su formato.';
  return 'El servidor no ha podido guardar los cambios. Inténtalo de nuevo. Se conservan tus cambios.';
}
