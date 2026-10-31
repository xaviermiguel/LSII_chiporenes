import fetchMock from 'jest-fetch-mock';
import { authenticate, currentUser, signOut, AuthError } from '../../auth';

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
