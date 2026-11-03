import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountProfile } from '../AccountProfile';
import { MyVideos, EditVideo } from '../MyVideos';
import { AuthError } from '../../auth';

const mockRequest = jest.fn();
const mockAuthenticated = jest.fn();
jest.mock('../../SessionContext', () => ({
  useSession: () => ({ request: mockRequest, authenticated: mockAuthenticated }),
}));
const profile = { id: 1, displayName: 'Anna', email: 'anna@example.com', description: 'Hola' };
const response = (value: unknown) => ({ json: async () => value });
beforeEach(() => {
  jest.resetAllMocks();
  mockRequest.mockResolvedValue(response(profile));
});

test('loads and saves profile and updates the shared mockAuthenticated user', async () => {
  const updated = { ...profile, displayName: 'Anna nueva' };
  mockRequest.mockResolvedValueOnce(response(profile)).mockResolvedValueOnce(response(updated));
  render(<AccountProfile onPasswordChanged={jest.fn()} />);
  fireEvent.change(await screen.findByLabelText('Nombre de usuario *'), { target: { value: updated.displayName } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Perfil actualizado.');
  expect(mockAuthenticated).toHaveBeenCalledWith(updated);
  expect(mockRequest).toHaveBeenLastCalledWith(
    '/auth/profile',
    expect.objectContaining({ method: 'PATCH', body: JSON.stringify(updated, ['displayName', 'email', 'description']) })
  );
});

test('retries profile recovery and reports duplicate email without losing entered fields', async () => {
  mockRequest
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(response(profile))
    .mockRejectedValueOnce(new AuthError('EMAIL_ALREADY_REGISTERED', 409));
  render(<AccountProfile onPasswordChanged={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('cargar tu perfil');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  fireEvent.change(await screen.findByLabelText('Email *'), { target: { value: 'taken@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('ya está registrado');
  expect(screen.getByLabelText('Email *')).toHaveValue('taken@example.com');
  expect(mockAuthenticated).not.toHaveBeenCalled();
});

function fillPassword(confirm = 'New-password1!') {
  fireEvent.change(screen.getByLabelText('Contraseña actual *'), { target: { value: 'Old-password1!' } });
  fireEvent.change(screen.getByLabelText('Nueva contraseña *'), { target: { value: 'New-password1!' } });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña *'), { target: { value: confirm } });
}

test('checks password confirmation before requesting and clears password inputs after a server rejection', async () => {
  const changed = jest.fn();
  mockRequest
    .mockResolvedValueOnce(response(profile))
    .mockRejectedValueOnce(new AuthError('CURRENT_PASSWORD_INVALID', 400));
  render(<AccountProfile onPasswordChanged={changed} />);
  await screen.findByLabelText('Email *');
  fillPassword('Different1!');
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('no coinciden');
  expect(mockRequest).toHaveBeenCalledTimes(1);
  fillPassword();
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('actual no es correcta'));
  expect(screen.getByLabelText('Contraseña actual *')).toHaveValue('');
  expect(changed).not.toHaveBeenCalled();
});

test('password success asks the application to clear the session and blocks duplicate submissions', async () => {
  let finish!: (value: unknown) => void;
  mockRequest.mockResolvedValueOnce(response(profile)).mockReturnValueOnce(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const changed = jest.fn();
  render(<AccountProfile onPasswordChanged={changed} />);
  await screen.findByLabelText('Email *');
  fillPassword();
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  const pending = screen.getByRole('button', { name: 'Cambiando…' });
  expect(pending).toBeDisabled();
  fireEvent.click(pending);
  expect(mockRequest).toHaveBeenCalledTimes(2);
  finish(response(null));
  await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText('Nueva contraseña *')).toHaveValue('');
});

const video = { id: 12, title: 'Mi clip', user: 'Anna', thumbnailUrl: '/media/12.webp' };
const page = { items: [video], page: 0, size: 12, hasNext: true };
test('own catalog paginates and opens playback and edit links', async () => {
  mockRequest
    .mockResolvedValueOnce(response(page))
    .mockResolvedValueOnce(response({ ...page, items: [], page: 1, hasNext: false }));
  const open = jest.fn();
  render(<MyVideos onOpen={open} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Ver Mi clip' }));
  expect(open).toHaveBeenCalledWith(12);
  expect(screen.getByRole('link', { name: 'Editar Mi clip' })).toHaveAttribute('href', '#videos/12/edit');
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(await screen.findByText('No hay vídeos en esta página.')).toBeInTheDocument();
  expect(mockRequest).toHaveBeenLastCalledWith(
    '/videos/me?page=1&size=12',
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  );
});

test('own catalog retries network errors and displays the empty state', async () => {
  mockRequest
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(response({ ...page, items: [], hasNext: false }));
  render(<MyVideos onOpen={jest.fn()} />);
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByText('Todavía no has publicado ningún vídeo.')).toBeInTheDocument();
});

test('edits metadata and handles backend permission denial', async () => {
  mockRequest
    .mockResolvedValueOnce(response({ ...video, description: 'Original' }))
    .mockRejectedValueOnce(new AuthError('VIDEO_ACCESS_DENIED', 403))
    .mockResolvedValueOnce(response({ ...video, title: 'Nuevo', description: 'Original' }));
  render(<EditVideo videoId={12} />);
  fireEvent.change(await screen.findByLabelText('Título *'), { target: { value: 'Nuevo' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar vídeo' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Solo puedes editar'));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar vídeo' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Vídeo actualizado.');
  expect(mockRequest).toHaveBeenLastCalledWith(
    '/videos/12',
    expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ title: 'Nuevo', description: 'Original' }) })
  );
});

test('does not display an edit form for another owner or an unavailable video', async () => {
  mockRequest
    .mockRejectedValueOnce(new AuthError('VIDEO_ACCESS_DENIED', 403))
    .mockRejectedValueOnce(new AuthError('VIDEO_NOT_FOUND', 404));
  render(<EditVideo videoId={12} />);
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Solo puedes editar'));
  expect(screen.queryByRole('button', { name: 'Guardar vídeo' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('ya no está disponible'));
});
