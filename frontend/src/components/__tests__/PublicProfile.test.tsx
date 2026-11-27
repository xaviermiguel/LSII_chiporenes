import { AxiosError } from 'axios';
import App from '../../App';
import { act, fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';

import { authenticatedRequest, currentUser } from '../../auth';

jest.mock('../../auth', () => ({
  ...jest.requireActual('../../auth'),
  currentUser: jest.fn(),
  authenticatedRequest: jest.fn(),
}));
jest.mock('../../utils/Env', () => ({
  getEnv: () => ({ API_BASE_URL: 'http://api.example/api', MEDIA_BASE_URL: 'http://media.example/media' }),
}));

const get = jest.spyOn(axios, 'get');
const profile = { id: 5, displayName: 'XaviB', description: 'Prueba de perfil B' };

beforeEach(() => {
  window.history.replaceState(null, '', '#users/5');
  get.mockReset();
  localStorage.clear();
  jest.mocked(currentUser).mockResolvedValue(null);
  jest.mocked(authenticatedRequest).mockReset();
});

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

test.each([
  ['/media/avatars/custom.png', 'http://media.example/media/avatars/custom.png'],
  ['/assets/avatar-default.png', 'http://api.example/assets/avatar-default.png'],
])('opens a public profile without signing in and resolves %s', async (avatarURL, expectedURL) => {
  get.mockResolvedValue({ data: { ...profile, avatarURL } });
  render(<App />);

  expect(screen.getByRole('status')).toHaveTextContent('Cargando perfil');
  expect(await screen.findByRole('heading', { name: 'XaviB' })).toBeInTheDocument();
  expect(screen.getByText(profile.description)).toBeInTheDocument();
  expect(screen.getByAltText('')).toHaveAttribute('src', expectedURL);
  expect(screen.queryByRole('link', { name: 'Editar mi perfil' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
  expect(get).toHaveBeenCalledWith('http://api.example/api/users/5', { signal: expect.any(AbortSignal) });
});

test('shows a missing profile for an HTTP 404', async () => {
  get.mockRejectedValue(Object.assign(new AxiosError(), { response: { status: 404 } }));
  render(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Perfil no encontrado.');
  expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
});

test('allows retrying a network failure', async () => {
  get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({
    data: { ...profile, avatarURL: '/assets/avatar-default.png' },
  });
  render(<App />);

  expect(await screen.findByRole('alert')).toHaveTextContent('No se ha podido cargar el perfil.');
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

  expect(await screen.findByRole('heading', { name: 'XaviB' })).toBeInTheDocument();
  expect(get.mock.calls.filter(([url]) => url.endsWith('/users/5'))).toHaveLength(2);
});

test('links the owner to the protected editor and loads the current values', async () => {
  const owner = { ...profile, email: 'owner@example.com' };
  jest.mocked(currentUser).mockResolvedValue(owner);
  jest.mocked(authenticatedRequest).mockResolvedValue({ json: async () => owner } as Response);
  get.mockResolvedValue({ data: { ...profile, avatarURL: '/assets/avatar-default.png' } });
  render(<App />);

  const edit = await screen.findByRole('link', { name: 'Editar mi perfil' });
  expect(edit).toHaveAttribute('href', '#profile');
  expect(screen.queryByRole('button', { name: 'Seguir' })).not.toBeInTheDocument();
  fireEvent.click(edit);
  expect(await screen.findByLabelText('Nombre de usuario *')).toHaveValue(profile.displayName);
  expect(screen.getByRole('link', { name: 'Ver mi perfil público' })).toHaveAttribute('href', '#users/5');
  expect(authenticatedRequest).toHaveBeenCalledWith('/auth/profile', expect.any(Object));
});

test('hides the edit control from another signed-in user', async () => {
  jest.mocked(currentUser).mockResolvedValue({ id: 8, displayName: 'Ana', email: 'ana@example.com' });
  get.mockResolvedValue({ data: { ...profile, avatarURL: '/assets/avatar-default.png' } });
  render(<App />);

  await screen.findByRole('link', { name: 'Mi cuenta' });
  await screen.findByRole('heading', { name: 'XaviB' });
  expect(screen.queryByRole('link', { name: 'Editar mi perfil' })).not.toBeInTheDocument();
  expect(authenticatedRequest).not.toHaveBeenCalled();
});

test('keeps follow counts independent for each public profile', async () => {
  jest.mocked(currentUser).mockResolvedValue({ id: 8, displayName: 'Ana', email: 'ana@example.com' });
  const first = { ...profile, avatarURL: '/assets/avatar-default.png' };
  const second = { ...first, id: 6, displayName: 'Otro autor' };
  get.mockImplementation(async (url) => ({ data: url.endsWith('/6') ? second : first }));
  render(<App />);

  fireEvent.click(await screen.findByRole('button', { name: 'Seguir' }));
  expect(screen.getByText('1 seguidor')).toBeInTheDocument();

  async function openProfile(id: number) {
    await act(async () => {
      window.history.replaceState(null, '', `#users/${id}`);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  await openProfile(6);
  expect(await screen.findByRole('heading', { name: second.displayName })).toBeInTheDocument();
  expect(screen.getByText('0 seguidores')).toBeInTheDocument();
  await openProfile(5);
  fireEvent.click(await screen.findByRole('button', { name: 'Dejar de seguir' }));
  expect(screen.getByText('0 seguidores')).toBeInTheDocument();
});
