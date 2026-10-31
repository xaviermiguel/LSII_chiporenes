import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../../App';
import { authenticate, currentUser, signOut } from '../../auth';
import type { AuthUser } from '../../auth';

jest.mock('../../auth', () => ({ authenticate: jest.fn(), currentUser: jest.fn(), signOut: jest.fn() }));
jest.mock('../../useAllVideos', () => ({ useAllVideos: () => ({ value: [], loading: 'loaded', hasNext: false }) }));
const user = { id: 1, displayName: 'Anna', email: 'anna@example.com' };

beforeEach(() => {
  jest.resetAllMocks();
  window.history.replaceState(null, '', '/');
  jest.mocked(currentUser).mockResolvedValue(null);
});

test.each(['login', 'register'])('%s navigates home and updates header after access', async (mode) => {
  window.history.replaceState(null, '', `/#${mode}`);
  jest.mocked(authenticate).mockResolvedValue(user);
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
  jest.mocked(authenticate).mockResolvedValue(user);
  window.history.replaceState(null, '', '/#login');
  render(<App />);
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Password1!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Hola, Anna');
  await act(async () => finish(null));
  expect(screen.getByText('Hola, Anna')).toBeInTheDocument();
});
