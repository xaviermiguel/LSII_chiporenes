import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import fetchMock from 'jest-fetch-mock';
import { VideoPublication } from '../VideoPublication';
import { SessionProvider } from '../../SessionContext';
import { AuthError } from '../../auth';
import { createThumbnail, MAX_UPLOAD_BYTES, publicationError, VideoPreviewError } from '../../videoPublication';
import type { PublicationDraft } from '../../videoPublication';

jest.mock('../../videoPublication', () => ({
  ...jest.requireActual('../../videoPublication'),
  createThumbnail: jest.fn(),
}));
jest.mock('../../auth', () => ({ ...jest.requireActual('../../auth'), currentUser: () => new Promise(() => {}) }));
const thumbnail = jest.mocked(createThumbnail);
const open = jest.fn();
function Harness({ draft: initial = { title: '', description: '', hadFile: false } }: { draft?: PublicationDraft }) {
  const [draft, setDraft] = useState(initial);
  return (
    <SessionProvider>
      <VideoPublication draft={draft} onDraft={setDraft} onOpen={open} />
    </SessionProvider>
  );
}
function fill(file = new File(['video'], 'example.mp4', { type: 'video/mp4' })) {
  fireEvent.change(screen.getByLabelText('Archivo de vídeo *'), { target: { files: [file] } });
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Mi vídeo' } });
  fireEvent.change(screen.getByLabelText('Descripción *'), { target: { value: 'Mi descripción' } });
}
function send() {
  fireEvent.click(screen.getByRole('button', { name: 'Publicar vídeo' }));
}
beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.resetMocks();
  thumbnail.mockResolvedValue(new Blob(['thumb'], { type: 'image/webp' }));
});

test('renders labelled fields, formats, request limit and automatic thumbnail information', () => {
  render(<Harness />);
  expect(screen.getByLabelText('Archivo de vídeo *')).toHaveAttribute('accept', '.mp4,video/mp4');
  expect(screen.getByLabelText('Título *')).toBeRequired();
  expect(screen.getByLabelText('Descripción *')).toBeRequired();
  expect(screen.getByText(/Formato admitido: MP4/)).toHaveTextContent('100 MiB');
  expect(screen.getByText(/La miniatura se genera automáticamente/)).toBeInTheDocument();
});

test('validates required fields, focuses the first and associates errors', () => {
  render(<Harness />);
  send();
  const file = screen.getByLabelText('Archivo de vídeo *');
  expect(file).toHaveFocus();
  expect(file).toHaveAccessibleDescription(expect.stringContaining('Selecciona un archivo'));
  expect(screen.getByLabelText('Título *')).toHaveAccessibleDescription('Introduce un título.');
  expect(screen.getByLabelText('Descripción *')).toHaveAccessibleDescription('Introduce una descripción.');
  expect(thumbnail).not.toHaveBeenCalled();
});

test.each([
  [new File(['v'], 'clip.webm', { type: 'video/webm' }), 'Selecciona un vídeo en formato MP4.'],
  [new File(['v'], 'clip.mp4', { type: 'text/plain' }), 'Selecciona un vídeo en formato MP4.'],
  [new File([], 'empty.mp4', { type: 'video/mp4' }), 'El archivo está vacío.'],
])('rejects invalid file %s', (file, message) => {
  render(<Harness />);
  fill(file);
  send();
  expect(screen.getByText(message)).toBeInTheDocument();
  expect(thumbnail).not.toHaveBeenCalled();
});

test('rejects oversized video and title over persisted 255 character limit', () => {
  render(<Harness />);
  const file = new File(['v'], 'clip.mp4');
  Object.defineProperty(file, 'size', { value: MAX_UPLOAD_BYTES + 1 });
  fill(file);
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'x'.repeat(256) } });
  send();
  expect(screen.getByText(/supera el máximo/)).toBeInTheDocument();
  expect(screen.getByText(/hasta 255/)).toBeInTheDocument();
  fill();
  expect(screen.getByLabelText('Título *')).toHaveAttribute('aria-invalid', 'false');
});

test('posts the real multipart fields with cookies and CSRF once, confirms and opens returned ID', async () => {
  let finish!: (value: Blob) => void;
  thumbnail.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'fresh', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce(JSON.stringify({ id: 42, title: 'Mi vídeo', description: 'Mi descripción' }), {
    status: 201,
  });
  render(<Harness />);
  fill();
  send();
  fireEvent.submit(screen.getByLabelText('Título *').closest('form')!);
  expect(screen.getByRole('button', { name: 'Subiendo vídeo…' })).toBeDisabled();
  expect(screen.getByLabelText('Archivo de vídeo *')).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('subiendo el vídeo');
  expect(thumbnail).toHaveBeenCalledTimes(1);
  await act(async () => finish(new Blob(['thumb'], { type: 'image/webp' })));
  const confirmation = await screen.findByRole('heading', { name: 'Vídeo publicado' });
  expect(confirmation).toHaveFocus();
  expect(screen.getByRole('status')).toHaveTextContent('Mi vídeo');
  const post = fetchMock.mock.calls.find(([url]) => url === 'other/videos')!;
  expect(post[1]).toMatchObject({ method: 'POST', credentials: 'include' });
  const body = post[1]!.body as FormData;
  expect([...body.keys()]).toEqual(['title', 'description', 'video', 'thumbnail']);
  expect(body.get('title')).toBe('Mi vídeo');
  expect(body.get('description')).toBe('Mi descripción');
  expect((body.get('video') as File).name).toBe('example.mp4');
  expect((body.get('thumbnail') as File).type).toBe('image/webp');
  expect(new Headers(post[1]!.headers).get('X-CSRF-TOKEN')).toBe('fresh');
  expect(new Headers(post[1]!.headers).has('Content-Type')).toBe(false);
  expect(screen.getByRole('link', { name: 'Ir al catálogo' })).toHaveAttribute('href', '#contenido');
  fireEvent.click(screen.getByRole('button', { name: 'Ver vídeo publicado' }));
  expect(open).toHaveBeenCalledWith(42);
});

test.each([
  [400, 'INVALID_VIDEO_UPLOAD', 'Titulo no valido', 'Titulo no valido'],
  [413, 'UNKNOWN', '', 'petición completa'],
  [403, 'INVALID_CSRF_TOKEN', '', 'sesión de seguridad'],
  [403, 'ACCESS_DENIED', '', 'No tienes permiso'],
  [500, 'UNKNOWN', '', 'almacenamiento'],
  [422, 'UNKNOWN', '', 'Revisa los datos'],
])('shows server error %s/%s and retains text and selected file for retry', async (status, code, message, expected) => {
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'fresh', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce(JSON.stringify({ code, message }), { status });
  if (code === 'INVALID_CSRF_TOKEN') fetchMock.mockResponseOnce(JSON.stringify({ id: 1 }));
  render(<Harness />);
  fill();
  send();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(expected));
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('Título *')).toHaveValue('Mi vídeo');
  expect(screen.getByLabelText('Descripción *')).toHaveValue('Mi descripción');
  expect((screen.getByLabelText('Archivo de vídeo *') as HTMLInputElement).files![0].name).toBe('example.mp4');
  expect(screen.getByRole('button', { name: 'Publicar vídeo' })).toBeEnabled();
  expect(screen.queryByText(/Debes volver a seleccionar/)).not.toBeInTheDocument();
});

test('connection error retains texts and file, then allows successful retry', async () => {
  // /me succeeds; fetching the next CSRF fails before upload.
  fetchMock.mockRejectOnce(new TypeError('offline'));
  render(<Harness />);
  fill();
  send();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Comprueba tu conexión'));
  expect(screen.getByLabelText('Título *')).toHaveValue('Mi vídeo');
  expect(screen.getByLabelText('Descripción *')).toHaveValue('Mi descripción');
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'fresh', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce(JSON.stringify({ id: 42, title: 'Mi vídeo' }), { status: 201 });
  send();
  expect(await screen.findByRole('heading', { name: 'Vídeo publicado' })).toBeInTheDocument();
});

test('informs when returning to preserved draft requires file reselection', () => {
  render(<Harness draft={{ title: 'Conservado', description: 'Descripción conservada', hadFile: true }} />);
  expect(screen.getByRole('status')).toHaveTextContent('Debes volver a seleccionar');
  expect(screen.getByLabelText('Título *')).toHaveValue('Conservado');
  fill();
  expect(screen.queryByText(/Debes volver a seleccionar/)).not.toBeInTheDocument();
});

test('thumbnail failure is actionable and does not send an upload', async () => {
  thumbnail.mockRejectedValue(new VideoPreviewError('No se ha podido generar la miniatura.'));
  render(<Harness />);
  fill();
  send();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('miniatura'));
  expect(fetchMock.mock.calls.some(([url]) => url === 'other/videos')).toBe(false);
});

test('combined payload limit includes generated thumbnail and text', async () => {
  const file = new File(['v'], 'example.mp4');
  Object.defineProperty(file, 'size', { value: MAX_UPLOAD_BYTES - 1 });
  render(<Harness />);
  fill(file);
  send();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('miniatura y los textos'));
  expect(fetchMock.mock.calls.some(([url]) => url === 'other/videos')).toBe(false);
});

test('does not claim success if backend fails to return an ID', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'fresh', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce('{}', { status: 201 });
  render(<Harness />);
  fill();
  send();
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('sin un identificador válido'));
  expect(screen.queryByRole('heading', { name: 'Vídeo publicado' })).not.toBeInTheDocument();
});

test('maps expired sessions and validation without detail', () => {
  expect(publicationError(new AuthError('AUTHENTICATION_REQUIRED', 401))).toContain('Inicia sesión');
  expect(publicationError(new AuthError('INVALID_VIDEO_UPLOAD', 400))).toContain('Revisa los campos');
});
