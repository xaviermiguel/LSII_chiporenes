import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import { authenticate, currentUser, signOut, authenticatedRequest, AuthError } from '../../auth';
import { createThumbnail } from '../../videoPublication';
import type { AuthUser } from '../../auth';

jest.mock('../../auth', () => ({
  ...jest.requireActual('../../auth'),
  authenticate: jest.fn(),
  currentUser: jest.fn(),
  signOut: jest.fn(),
  authenticatedRequest: jest.fn(),
}));
jest.mock('../../videoPublication', () => ({
  ...jest.requireActual('../../videoPublication'),
  createThumbnail: jest.fn(),
}));
jest.mock('../../useAllVideos', () => ({ useAllVideos: () => ({ value: [], loading: 'loaded', hasNext: false }) }));
const user = { id: 1, displayName: 'Anna', email: 'anna@example.com' };

test('edit route loads owner form and preserves draft through expiry and login', async () => {
  const video = { id: 15, ownerId: 1, title: 'Original', description: 'Description', tags: ['tag'], category: null };
  jest.mocked(currentUser).mockResolvedValue(user);
  jest.mocked(authenticatedRequest).mockImplementation(async (path, init) => {
    if (init?.method === 'PATCH') {
      jest.mocked(currentUser).mockResolvedValue(null);
      throw new AuthError('AUTHENTICATION_REQUIRED', 401);
    }
    return { json: async () => (path === '/videos/categories' ? [] : video) } as Response;
  });
  window.history.replaceState(null, '', '/#videos/15/edit');
  render(<App />);
  expect(await screen.findByLabelText('Título *')).toHaveValue('Original');
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Draft after expiry' } });
  fireEvent.change(screen.getByLabelText('Descripción *'), { target: { value: 'Draft description' } });
  fireEvent.change(screen.getByLabelText('Etiquetas (opcional)'), { target: { value: 'draft tag' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByRole('heading', { name: 'Inicia sesión' });
  jest.mocked(authenticate).mockImplementation(async () => {
    jest.mocked(currentUser).mockResolvedValue(user);
    return user;
  });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Password1!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Hola, Anna');
  await act(async () => {
    window.location.hash = 'videos/15/edit';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(await screen.findByLabelText('Título *')).toHaveValue('Draft after expiry');
  expect(screen.getByLabelText('Descripción *')).toHaveValue('Draft description');
  expect(screen.getByLabelText('Etiquetas (opcional)')).toHaveValue('draft tag');
});

beforeEach(() => {
  jest.resetAllMocks();
  window.history.replaceState(null, '', '/');
  jest.mocked(currentUser).mockResolvedValue(null);
  jest.mocked(authenticatedRequest).mockResolvedValue({ json: async () => ({ ...user, description: '' }) } as Response);
});

test.each(['login', 'register'])('%s navigates home and updates header after access', async (mode) => {
  window.history.replaceState(null, '', `/#${mode}`);
  jest.mocked(authenticate).mockImplementation(async () => {
    jest.mocked(currentUser).mockResolvedValue(user);
    return user;
  });
  render(<App />);
  if (mode === 'register')
    fireEvent.change(screen.getByLabelText('Nombre de usuario *'), { target: { value: 'Anna' } });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Password1!' } });
  if (mode === 'register')
    fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'Password1!' } });
  fireEvent.click(screen.getByRole('button', { name: mode === 'register' ? 'Crear cuenta' : 'Entrar' }));
  expect(await screen.findByText('Hola, Anna')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Descubre algo nuevo.' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#contenido');
  expect(screen.getByRole('main')).toHaveFocus();
  expect(screen.queryByLabelText('Contraseña *')).not.toBeInTheDocument();
});

test('hash navigation and back/forward events switch forms and clear passwords', async () => {
  render(<App />);
  await act(async () => {
    window.location.hash = 'login';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'secret' } });
  await act(async () => {
    window.location.hash = 'register';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByLabelText('Contraseña *')).toHaveValue('');
  expect(screen.getByRole('heading', { name: 'Crea tu cuenta' })).toBeInTheDocument();
});

test('restores session, handles logout error and retries', async () => {
  jest.mocked(currentUser).mockResolvedValue(user);
  jest.mocked(signOut).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  render(<App />);
  expect(await screen.findByText('Hola, Anna')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cerrar');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
});

test('focus detects expired sessions', async () => {
  jest.mocked(currentUser).mockResolvedValueOnce(user).mockResolvedValueOnce(null);
  render(<App />);
  await screen.findByText('Hola, Anna');
  fireEvent(window, new Event('focus'));
  await waitFor(() => expect(screen.queryByText('Hola, Anna')).not.toBeInTheDocument());
});

test('a late anonymous session response cannot overwrite successful login', async () => {
  let finish!: (value: AuthUser | null) => void;
  jest.mocked(currentUser).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  jest.mocked(authenticate).mockImplementation(async () => {
    jest.mocked(currentUser).mockResolvedValue(user);
    return user;
  });
  window.history.replaceState(null, '', '/#login');
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Password1!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Hola, Anna');
  await act(async () => finish(null));
  expect(screen.getByText('Hola, Anna')).toBeInTheDocument();
});

test.each(['profile', 'upload', 'videos/15/edit'])('redirects anonymous visitors from %s', async (path) => {
  window.history.replaceState(null, '', `/#${path}`);
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#login');
});

test('waits for recovery before showing a protected screen and preserves session on navigation', async () => {
  let finish!: (value: AuthUser | null) => void;
  jest.mocked(currentUser).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  window.history.replaceState(null, '', '/#profile');
  render(<App />);
  expect(screen.getByText('Comprobando sesión…')).toBeInTheDocument();
  expect(screen.queryByDisplayValue(user.email)).not.toBeInTheDocument();
  await act(async () => finish(user));
  expect(await screen.findByDisplayValue(user.email)).toBeInTheDocument();
  await act(async () => {
    window.location.hash = 'contenido';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByText('Hola, Anna')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Descubre algo nuevo.' })).toBeInTheDocument();
});

test('expiry removes protected content and redirects to login', async () => {
  jest.mocked(currentUser).mockResolvedValue(user);
  window.history.replaceState(null, '', '/#profile');
  render(<App />);
  await screen.findByDisplayValue(user.email);
  jest.mocked(currentUser).mockResolvedValue(null);
  fireEvent(window, new Event('focus'));
  expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  expect(screen.queryByDisplayValue(user.email)).not.toBeInTheDocument();
});

test('recovery failure keeps public catalog accessible and retries on focus', async () => {
  jest.mocked(currentUser).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(user);
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('comprobar la sesión');
  expect(screen.getByRole('heading', { name: 'Descubre algo nuevo.' })).toBeInTheDocument();
  fireEvent(window, new Event('focus'));
  expect(await screen.findByText('Hola, Anna')).toBeInTheDocument();
});

test('expired upload redirects to login and preserves draft when returning after authentication', async () => {
  jest.mocked(currentUser).mockResolvedValue(user);
  jest.mocked(createThumbnail).mockResolvedValue(new Blob(['thumb'], { type: 'image/webp' }));
  jest.mocked(authenticatedRequest).mockImplementation(async () => {
    jest.mocked(currentUser).mockResolvedValue(null);
    throw new AuthError('AUTHENTICATION_REQUIRED', 401);
  });
  window.history.replaceState(null, '', '/#upload');
  render(<App />);
  await screen.findByRole('heading', { name: 'Publicar vídeo' });
  fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'Borrador conservado' } });
  fireEvent.change(screen.getByLabelText('Descripción *'), { target: { value: 'Descripción conservada' } });
  fireEvent.change(screen.getByLabelText('Archivo de vídeo *'), { target: { files: [new File(['v'], 'clip.mp4')] } });
  fireEvent.click(screen.getByRole('button', { name: 'Publicar vídeo' }));
  expect(await screen.findByRole('heading', { name: 'Inicia sesión' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#login');
  jest.mocked(authenticate).mockImplementation(async () => {
    jest.mocked(currentUser).mockResolvedValue(user);
    return user;
  });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Password1!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Hola, Anna');
  await act(async () => {
    window.location.hash = 'upload';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  expect(screen.getByLabelText('Título *')).toHaveValue('Borrador conservado');
  expect(screen.getByLabelText('Descripción *')).toHaveValue('Descripción conservada');
  expect(screen.getByRole('status')).toHaveTextContent('Debes volver a seleccionar el archivo');
});
