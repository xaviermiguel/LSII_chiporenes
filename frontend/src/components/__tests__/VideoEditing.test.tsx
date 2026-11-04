import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { VideoEditing } from '../VideoEditing';
import { blankMetadata, editingError } from '../../videoEditing';
import type { EditingDraft } from '../VideoEditing';
import { AuthError } from '../../auth';

const mockRequest = jest.fn();
const back = jest.fn();
jest.mock('../../SessionContext', () => ({ useSession: () => ({ user: { id: 7 }, request: mockRequest }) }));
const video = {
  id: 42,
  ownerId: 7,
  title: 'Actual',
  description: 'Descripción actual',
  tags: ['a,b', 'música'],
  category: { id: 3, name: 'Music' },
};
const categories = [
  { id: 3, name: 'Music' },
  { id: 4, name: 'Travel' },
];
const response = (value: unknown) => ({ json: async () => value });
function Harness() {
  const [draft, setDraft] = useState<EditingDraft>();
  return <VideoEditing videoId="42" draft={draft} onDraft={setDraft} onBack={back} />;
}
function fill() {
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Nuevo título' } });
  fireEvent.change(screen.getByLabelText('Descripción *'), { target: { value: 'Nueva descripción' } });
  fireEvent.change(screen.getByLabelText('Etiquetas (opcional)'), { target: { value: 'a,b\n viaje \nviaje\n' } });
  fireEvent.change(screen.getByLabelText('Categoría (opcional)'), { target: { value: '4' } });
}
function send() {
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
}
async function loaded() {
  render(<Harness />);
  await screen.findByLabelText('Título *');
}
beforeEach(() => {
  jest.resetAllMocks();
  mockRequest.mockImplementation(async (path: string) => response(path === '/videos/categories' ? categories : video));
});

test('announces initial loading and loads all actual values including tags containing commas', async () => {
  let resolve!: (value: unknown) => void;
  mockRequest.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  render(<Harness />);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando datos');
  expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument();
  await act(async () => resolve(response(video)));
  expect(await screen.findByLabelText('Título *')).toHaveValue('Actual');
  expect(screen.getByLabelText('Descripción *')).toHaveValue('Descripción actual');
  expect(screen.getByLabelText('Etiquetas (opcional)')).toHaveValue('a,b\nmúsica');
  expect(screen.getByLabelText('Categoría (opcional)')).toHaveValue('3');
  expect(mockRequest).toHaveBeenCalledWith('/videos/42', expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

test('non-owner never sees an editable form or loads categories', async () => {
  mockRequest.mockResolvedValue(response({ ...video, ownerId: 8 }));
  render(<Harness />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Solo puedes editar vídeos propios');
  expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument();
  expect(mockRequest).toHaveBeenCalledTimes(1);
});

test.each([new AuthError('VIDEO_NOT_FOUND', 404), new AuthError('VIDEO_ACCESS_DENIED', 403)])(
  'initial resource error prevents empty valid form: %s',
  async (error) => {
    mockRequest.mockRejectedValue(error);
    render(<Harness />);
    expect(await screen.findByRole('alert')).toHaveTextContent(editingError(error));
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  }
);

test('initial connection error can be retried', async () => {
  mockRequest.mockRejectedValueOnce(new TypeError('offline'));
  render(<Harness />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByLabelText('Título *')).toHaveValue(video.title);
});

test.each(['', ' ', 'x'.repeat(256)])('validates title and focuses associated error (%s)', async (title) => {
  await loaded();
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: title } });
  send();
  expect(screen.getByLabelText('Título *')).toHaveFocus();
  expect(screen.getByLabelText('Título *')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Título *')).toHaveAccessibleDescription(expect.stringMatching(/título/i));
  expect(mockRequest).toHaveBeenCalledTimes(2);
});

test('requires nonblank description without imposing a length limit', async () => {
  await loaded();
  fireEvent.change(screen.getByLabelText('Descripción *'), { target: { value: ' ' } });
  send();
  expect(screen.getByLabelText('Descripción *')).toHaveFocus();
  expect(screen.getByLabelText('Descripción *')).toHaveAccessibleDescription('Introduce una descripción.');
});

test('saves real PATCH JSON, blocks repeated submits and shows authoritative saved values', async () => {
  await loaded();
  fill();
  let resolve!: (value: unknown) => void;
  mockRequest.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    })
  );
  send();
  expect(screen.getByRole('button', { name: 'Guardando cambios…' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('Guardando cambios');
  fireEvent.submit(screen.getByRole('button', { name: 'Guardando cambios…' }).closest('form')!);
  expect(mockRequest).toHaveBeenCalledTimes(3);
  expect(mockRequest).toHaveBeenLastCalledWith('/videos/42', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Nuevo título',
      description: 'Nueva descripción',
      tags: ['a,b', ' viaje ', 'viaje'],
      categoryId: 4,
    }),
  });
  await act(async () =>
    resolve(
      response({
        ...video,
        title: 'Título guardado',
        description: 'Descripción guardada',
        tags: ['normalizada'],
        category: categories[1],
      })
    )
  );
  expect(screen.getByRole('status')).toHaveTextContent('Cambios guardados correctamente');
  expect(screen.getByRole('status')).toHaveFocus();
  expect(screen.getByRole('heading', { name: 'Título guardado' })).toBeInTheDocument();
  expect(screen.getByText('Descripción guardada')).toBeInTheDocument();
  expect(screen.getByText('Categoría: Travel')).toBeInTheDocument();
  expect(screen.getByText('normalizada')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ver vídeo actualizado' }));
  expect(back).toHaveBeenCalledWith(42);
});

test.each([
  new AuthError('INVALID_VIDEO_UPDATE', 400, 'La categoría seleccionada no existe.'),
  new TypeError('offline'),
  new AuthError('INTERNAL_ERROR', 500),
  new AuthError('INVALID_CSRF_TOKEN', 403),
])('save failure preserves every field and permits correcting/retrying: %s', async (error) => {
  await loaded();
  fill();
  mockRequest.mockRejectedValueOnce(error);
  send();
  expect(await screen.findByRole('alert')).toHaveTextContent(editingError(error));
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('Título *')).toHaveValue('Nuevo título');
  expect(screen.getByLabelText('Descripción *')).toHaveValue('Nueva descripción');
  expect(screen.getByLabelText('Etiquetas (opcional)')).toHaveValue('a,b\n viaje \nviaje\n');
  expect(screen.getByLabelText('Categoría (opcional)')).toHaveValue('4');
  expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  send();
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Cambios guardados'));
});

test.each([new AuthError('VIDEO_ACCESS_DENIED', 403), new AuthError('VIDEO_NOT_FOUND', 404)])(
  'permission loss/deletion disables save while retaining draft: %s',
  async (error) => {
    await loaded();
    fill();
    mockRequest.mockRejectedValueOnce(error);
    send();
    expect(await screen.findByRole('alert')).toHaveTextContent(editingError(error));
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(screen.getByLabelText('Título *')).toHaveValue('Nuevo título');
  }
);

test('cancel sends no update and returns to the video', async () => {
  await loaded();
  fill();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(back).toHaveBeenCalledWith(42);
  expect(mockRequest).toHaveBeenCalledTimes(2);
});

test('clear optional metadata sends [] and null', async () => {
  await loaded();
  fireEvent.change(screen.getByLabelText('Etiquetas (opcional)'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Categoría (opcional)'), { target: { value: '' } });
  send();
  await screen.findByText('Cambios guardados correctamente.');
  expect(JSON.parse(mockRequest.mock.calls[2][1].body)).toMatchObject({ tags: [], categoryId: null });
});

test('session-expiry and malformed-request messages are clear', () => {
  expect(editingError(new AuthError('AUTHENTICATION_REQUIRED', 401))).toMatch(/sesión ha caducado/);
  expect(editingError(new AuthError('INVALID_REQUEST', 400))).toMatch(/Revisa los campos/);
});

test('blank validation follows Java whitespace without rejecting nonbreaking spaces', () => {
  expect(blankMetadata('\t\n\u001c\u2003\u3000')).toBe(true);
  expect(blankMetadata('\u00a0')).toBe(false);
  expect(blankMetadata('\u2007\u202f\ufeff')).toBe(false);
});
