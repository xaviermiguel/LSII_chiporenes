import { fireEvent, render, screen } from '@testing-library/react';
import { SessionProvider, useSession } from '../../SessionContext';
import { AuthError, authenticatedRequest, currentUser } from '../../auth';

jest.mock('../../auth', () => ({
  ...jest.requireActual('../../auth'),
  currentUser: jest.fn(),
  authenticatedRequest: jest.fn(),
}));
const user = { id: 1, displayName: 'Anna', email: 'anna@example.com' };
function Consumer() {
  const session = useSession();
  return (
    <>
      <p>{session.user?.displayName || 'Visitante'}</p>
      <button onClick={() => void session.request('/videos/1', { method: 'PATCH' }).catch(() => {})}>Editar</button>
    </>
  );
}
beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(currentUser).mockResolvedValue(user);
});
test.each([401, 403])('API status %s updates only invalid sessions', async (status) => {
  jest.mocked(authenticatedRequest).mockRejectedValue(new AuthError('ACCESS_DENIED', status));
  render(
    <SessionProvider>
      <Consumer />
    </SessionProvider>
  );
  await screen.findByText('Anna');
  fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
  if (status === 401) expect(await screen.findByText('Visitante')).toBeInTheDocument();
  else expect(screen.getByText('Anna')).toBeInTheDocument();
});
