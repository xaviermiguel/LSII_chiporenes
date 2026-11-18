import { fireEvent, render, screen } from '@testing-library/react';
import axios from 'axios';
import { ImportedChannel } from '../ImportedChannel';
import { useSession } from '../../SessionContext';

jest.mock('axios');
jest.mock('../../SessionContext');

const session = jest.mocked(useSession);
const signedIn = { id: 7, displayName: 'Ana', email: 'ana@example.com' };
const baseCount = new Intl.NumberFormat('es-ES').format(7_240_000);
const incrementedCount = new Intl.NumberFormat('es-ES').format(7_240_001);

function setUser(user: ReturnType<typeof useSession>['user']) {
  session.mockReturnValue({
    user,
    loading: false,
    loggingOut: false,
    sessionError: '',
    authenticated: jest.fn(),
    logout: jest.fn(),
    request: jest.fn(),
  });
}

beforeEach(() => {
  localStorage.clear();
  const video = {
    id: 44,
    title: 'Uptown Funk',
    user: 'Mark Ronson',
    authorId: null,
    channel: 'Mark Ronson',
    channelFollowerCount: 7_240_000,
    thumbnailUrl: '/media/0.webp',
  };
  const secondVideo = { ...video, id: 45, title: 'Otro vídeo' };
  jest.mocked(axios.get).mockImplementation(async (url) => {
    if (url.endsWith('/44')) return { data: video };
    if (url.endsWith('/45')) return { data: secondVideo };
    return { data: { items: [video, secondVideo], page: 0, hasNext: false } };
  });
});

test('anonymous visitors see the count and a sign-in link', async () => {
  setUser(null);
  render(<ImportedChannel name="Mark Ronson" onOpen={jest.fn()} />);
  await screen.findByRole('button', { name: 'Uptown Funk' });
  expect(screen.getByText(baseCount + ' seguidores')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Iniciar sesión para seguir' })).toHaveAttribute('href', '#login');
  expect(screen.queryByRole('button', { name: 'Seguir canal' })).not.toBeInTheDocument();
});

test('follows once, keeps the selection after reopening and unfollows', async () => {
  setUser(signedIn);
  const { unmount } = render(<ImportedChannel name="Mark Ronson" onOpen={jest.fn()} />);
  await screen.findByRole('button', { name: 'Uptown Funk' });
  fireEvent.click(screen.getByRole('button', { name: 'Seguir canal' }));
  expect(screen.getByText(incrementedCount + ' seguidores')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dejar de seguir' })).toBeInTheDocument();
  unmount();

  render(<ImportedChannel name="Mark Ronson" onOpen={jest.fn()} />);
  await screen.findByRole('button', { name: 'Uptown Funk' });
  fireEvent.click(screen.getByRole('button', { name: 'Dejar de seguir' }));
  expect(screen.getByText(baseCount + ' seguidores')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Seguir canal' })).toBeInTheDocument();
});
