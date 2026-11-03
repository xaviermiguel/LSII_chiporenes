import { AuthError } from './auth';

// application.properties: 100MB per file AND per complete multipart request.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
// VideoUploadService stores uploads as .mp4; it does not transcode other containers.
export const VIDEO_ACCEPT = '.mp4,video/mp4';
export type Publication = { id: number; title: string; description: string };
export type PublicationDraft = { title: string; description: string; tags?: string; hadFile: boolean };

export class VideoPreviewError extends Error {}

export function createThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (blob?: Blob | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      video.onloadeddata = null;
      video.onerror = null;
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      if (blob?.type === 'image/webp') resolve(blob);
      else
        reject(
          new VideoPreviewError(
            'No se ha podido generar la miniatura. Selecciona un MP4 que tu navegador pueda reproducir.'
          )
        );
    };
    const timeout = window.setTimeout(() => finish(), 15000);
    video.muted = true;
    video.preload = 'auto';
    video.onloadeddata = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) return finish();
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 640 / video.videoWidth);
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return finish();
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(finish, 'image/webp');
      } catch {
        finish();
      }
    };
    video.onerror = () => finish();
    video.src = url;
  });
}

export function publicationError(error: unknown): string {
  if (error instanceof VideoPreviewError) return error.message;
  if (!(error instanceof AuthError))
    return 'No se ha podido conectar. Comprueba tu conexión. Si la subida llegó al servidor, revisa el catálogo antes de reintentar para evitar duplicados.';
  if (error.status === 401) return 'Tu sesión ha caducado. Inicia sesión de nuevo para publicar.';
  if (error.status === 413)
    return 'La publicación supera el límite de 100 MiB de la petición completa, incluida la miniatura y los textos. Selecciona un vídeo más pequeño.';
  if (error.code === 'INVALID_VIDEO_UPLOAD')
    return error.detail || 'El servidor ha rechazado los datos del vídeo. Revisa los campos y el archivo.';
  if (error.status === 403) return error.message;
  if (error.status >= 500)
    return 'El servidor no ha podido completar el almacenamiento o la publicación del vídeo. Revisa el catálogo antes de reintentar.';
  return 'No se ha podido publicar el vídeo. Revisa los datos e inténtalo de nuevo.';
}
