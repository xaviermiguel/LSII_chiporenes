import { act, fireEvent, render, screen } from '@testing-library/react';
import fetchMock from 'jest-fetch-mock';
import { SessionProvider } from '../../SessionContext';
import { VideoComments } from '../watch/VideoComments.tsx';

const url = 'other/videos/12/comments/5/likes';
const account = { id: 8, displayName: 'Pau', email: 'pau@example.com' };
const comment = { id: 5, user: 'Ana', text: 'Buen vídeo', parentId: null, createdAt: '2026-11-17T10:00:00Z' };
const csrf = { token: 'fresh', headerName: 'X-CSRF-TOKEN' };

function showComments() {
  return render(
    <SessionProvider>
      <VideoComments
        videoId={12}
        comments={[comment, { ...comment, id: 6, user: 'Pau', text: 'Gracias', parentId: 5 }]}
        onReply={jest.fn()}
      />
    </SessionProvider>
  );
}

function likesRequests() {
  return fetchMock.mock.calls.filter(([path]) => path === url);
}

function button() {
  return screen.getByRole('button', { name: 'Me gusta el comentario de Ana' });
}

function queueLikes(likeCount: number, likedByMe: boolean) {
  fetchMock.mockResponseOnce(JSON.stringify({ likeCount, likedByMe }));
}

beforeEach(() => fetchMock.resetMocks());

test('loads zero, adds and removes the like using the confirmed responses and prevents duplicate writes', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(account));
  queueLikes(0, false);
  showComments();
  await screen.findByText('0 Me gusta');
  expect(button()).toHaveAttribute('aria-pressed', 'false');
  expect(screen.queryByRole('button', { name: 'Me gusta el comentario de Pau' })).not.toBeInTheDocument();
  expect(likesRequests()).toHaveLength(1);
  expect(likesRequests()[0][1]).toMatchObject({ credentials: 'include', cache: 'no-store' });

  fetchMock.mockResponseOnce(JSON.stringify(csrf));
  let confirm: (body: string) => void = () => {};
  fetchMock.mockResponseOnce(
    () =>
      new Promise((resolve) => {
        confirm = resolve;
      })
  );
  fireEvent.click(button());
  fireEvent.click(button());
  expect(button()).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByText('0 Me gusta')).toBeVisible();
  expect(button()).toHaveAttribute('aria-pressed', 'false');
  await act(async () => {});
  const [, put] = likesRequests()[1];
  expect(put).toMatchObject({ method: 'PUT', credentials: 'include' });
  expect(new Headers(put?.headers).get('X-CSRF-TOKEN')).toBe('fresh');
  expect(likesRequests()).toHaveLength(2);
  await act(async () => confirm(JSON.stringify({ likeCount: 3, likedByMe: true })));
  expect(screen.getByText('3 Me gusta')).toBeVisible();
  expect(button()).toHaveAttribute('aria-pressed', 'true');
  expect(button()).toHaveTextContent('✓');

  fetchMock.mockResponseOnce(JSON.stringify(csrf));
  queueLikes(2, false);
  fireEvent.click(button());
  await screen.findByText('2 Me gusta');
  expect(likesRequests()[2][1]?.method).toBe('DELETE');
  expect(button()).toHaveAttribute('aria-pressed', 'false');
});

test('loads the persisted reaction on a fresh mount', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(account));
  queueLikes(7, true);
  showComments();
  await screen.findByText('7 Me gusta');
  expect(button()).toHaveAttribute('aria-pressed', 'true');
});

test('invites visitors to sign in and makes no write', async () => {
  fetchMock.mockResponseOnce('{}', { status: 401 });
  queueLikes(2, false);
  showComments();
  await screen.findByText('2 Me gusta');
  fireEvent.click(button());
  expect(screen.getByRole('alert')).toHaveTextContent('Inicia sesión para dar me gusta');
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '#login');
  expect(likesRequests()).toHaveLength(1);
});

test('keeps the last confirmed count and active state when removing a like fails', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(account));
  queueLikes(4, true);
  showComments();
  await screen.findByText('4 Me gusta');
  fetchMock.mockResponseOnce(JSON.stringify(csrf));
  fetchMock.mockRejectOnce(new TypeError('offline'));
  fireEvent.click(button());
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo actualizar el me gusta');
  expect(screen.getByText('4 Me gusta')).toBeVisible();
  expect(button()).toHaveAttribute('aria-pressed', 'true');
  expect(button()).toHaveAttribute('aria-disabled', 'false');
});

test('explains an expired session and clears the signed-in reaction', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(account));
  queueLikes(4, true);
  showComments();
  await screen.findByText('4 Me gusta');
  fetchMock.mockResponseOnce(JSON.stringify(csrf));
  fetchMock.mockResponseOnce('{}', { status: 401 });
  queueLikes(4, false);
  fireEvent.click(button());
  expect(await screen.findByRole('alert')).toHaveTextContent('Tu sesión ha caducado');
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  expect(screen.getByText('4 Me gusta')).toBeVisible();
  expect(button()).toHaveAttribute('aria-pressed', 'false');
});

test('allows retrying an initial read without presenting an invented count', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(account));
  fetchMock.mockResponseOnce('{}', { status: 503 });
  showComments();
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar los me gusta');
  expect(screen.queryByText('0 Me gusta')).not.toBeInTheDocument();
  expect(button()).toHaveAttribute('aria-disabled', 'true');
  queueLikes(0, false);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }));
  await screen.findByText('0 Me gusta');
  expect(button()).toHaveAttribute('aria-disabled', 'false');
});
