import fetchMock from 'jest-fetch-mock';
import { authenticate, currentUser, signOut, AuthError, authenticatedRequest } from '../../auth';

const user = { id: 1, displayName: 'Anna', email: 'anna@example.com' };
beforeEach(() => fetchMock.resetMocks());

test.each(['register', 'login'] as const)('%s sends CSRF and cookies to the real contract endpoints', async (mode) => {
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'csrf-value', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce(JSON.stringify(user));
  const credentials = { email: user.email, password: 'Password1!', displayName: 'Anna', confirmPassword: 'Password1!' };
  expect(await authenticate(mode, credentials)).toEqual(user);
  expect(fetchMock).toHaveBeenNthCalledWith(1, 'other/auth/csrf', { credentials: 'include', cache: 'no-store' });
  expect(fetchMock).toHaveBeenNthCalledWith(2, `other/auth/${mode}`, {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': 'csrf-value' },
    body: JSON.stringify(credentials),
  });
});

test('restores session and treats 401 as anonymous', async () => {
  fetchMock.mockResponseOnce(JSON.stringify(user));
  expect(await currentUser()).toEqual(user);
  fetchMock.mockResponseOnce('{}', { status: 401 });
  expect(await currentUser()).toBeNull();
});

test('logout gets a fresh token and accepts empty 204 response', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'fresh', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce('', { status: 204 });
  await signOut();
  expect(fetchMock).toHaveBeenLastCalledWith(
    'other/auth/logout',
    expect.objectContaining({ method: 'POST', headers: { 'X-CSRF-TOKEN': 'fresh' } })
  );
});

test('preserves safe API errors and handles malformed server errors', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ code: 'EMAIL_ALREADY_REGISTERED' }), { status: 409 });
  await expect(currentUser()).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED', status: 409 });
  fetchMock.mockResponseOnce('not json', { status: 500 });
  await expect(currentUser()).rejects.toThrow('No se ha podido completar');
  expect(new AuthError('INVALID_EMAIL', 400).message).toContain('email válido');
});

test('authenticated upload preserves multipart headers and includes fresh CSRF', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'fresh', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce('', { status: 204 });
  const body = new FormData();
  body.append('file', new Blob(['video']), 'video.mp4');
  await authenticatedRequest('/videos', { method: 'POST', body });
  const init = fetchMock.mock.calls[1][1]!;
  expect(init.credentials).toBe('include');
  expect(init.body).toBe(body);
  expect(new Headers(init.headers).get('X-CSRF-TOKEN')).toBe('fresh');
  expect(new Headers(init.headers).has('Content-Type')).toBe(false);
});

test.each([401, 403])('authenticated request propagates status %s', async (status) => {
  fetchMock.mockResponseOnce(JSON.stringify({ code: 'ACCESS_DENIED' }), { status });
  await expect(authenticatedRequest('/videos/1')).rejects.toMatchObject({ status });
});

test('expired CSRF checks the session without replaying the mutation', async () => {
  fetchMock.mockResponseOnce(JSON.stringify({ token: 'fresh', headerName: 'X-CSRF-TOKEN' }));
  fetchMock.mockResponseOnce(JSON.stringify({ code: 'INVALID_CSRF_TOKEN' }), { status: 403 });
  fetchMock.mockResponseOnce('{}', { status: 401 });
  await expect(authenticatedRequest('/videos/1', { method: 'PATCH' })).rejects.toMatchObject({ status: 401 });
  expect(fetchMock).toHaveBeenCalledTimes(3);
});

test.each(['https://other.example/videos', '//other.example', '/videos/../auth/login'])(
  'rejects unsafe API path %s',
  async (path) => {
    await expect(authenticatedRequest(path)).rejects.toThrow('relative API path');
    expect(fetchMock).not.toHaveBeenCalled();
  }
);
