import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AuthForm } from '../AuthForm';
import { authenticate, AuthError } from '../../auth';
import type { AuthUser } from '../../auth';

jest.mock('../../auth', () => ({ ...jest.requireActual('../../auth'), authenticate: jest.fn() }));
const submit = jest.mocked(authenticate);
const user = { id: 1, displayName: 'Anna', email: 'anna@example.com' };

function fill(register = true) {
  if (register) fireEvent.change(screen.getByLabelText('Nombre de usuario *'), { target: { value: 'Anna' } });
  fireEvent.change(screen.getByLabelText('Email *'), { target: { value: 'anna@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña *'), { target: { value: 'Password1!' } });
  if (register) fireEvent.change(screen.getByLabelText('Confirmar contraseña *'), { target: { value: 'Password1!' } });
}

beforeEach(() => jest.resetAllMocks());

test.each(['login', 'register'] as const)('%s marks required fields and focuses the first invalid field', (mode) => {
  render(<AuthForm mode={mode} onSuccess={jest.fn()} />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getAllByText('Este campo es obligatorio.')).toHaveLength(mode === 'register' ? 4 : 2);
  expect(screen.getByLabelText(mode === 'register' ? 'Nombre de usuario *' : 'Email *')).toHaveFocus();
  expect(submit).not.toHaveBeenCalled();
  const first = screen.getByLabelText(mode === 'register' ? 'Nombre de usuario *' : 'Email *');
  fireEvent.change(first, { target: { value: mode === 'register' ? 'Anna' : 'anna@example.com' } });
  expect(first).toHaveAttribute('aria-invalid', 'false');
});

test.each([
  ['Email *', 'invalid..email@example.com', 'Introduce un email válido'],
  ['Nombre de usuario *', 'n'.repeat(31), 'El nombre debe tener'],
  ['Contraseña *', 'short', 'Usa entre 8 y 72'],
  ['Contraseña *', 'contraseña1', 'Usa entre 8 y 72'],
  ['Contraseña *', ' Password1!', 'Usa entre 8 y 72'],
  ['Confirmar contraseña *', 'different', 'Las contraseñas no coinciden.'],
])('validates %s locally (%s)', (label, value, error) => {
  render(<AuthForm mode="register" onSuccess={jest.fn()} />);
  fill();
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByText(new RegExp(error))).toBeInTheDocument();
  expect(submit).not.toHaveBeenCalled();
});

test.each(['login', 'register'] as const)(
  '%s sends once while pending and publishes authenticated user',
  async (mode) => {
    let finish!: (value: AuthUser) => void;
    submit.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    const success = jest.fn();
    render(<AuthForm mode={mode} onSuccess={success} />);
    fill(mode === 'register');
    fireEvent.change(screen.getByLabelText('Email *'), { target: { value: '  ANNA@example.com  ' } });
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.submit(button.closest('form')!);
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Procesando');
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(
      mode,
      expect.objectContaining({ email: 'anna@example.com', password: 'Password1!' })
    );
    await act(async () => finish(user));
    expect(success).toHaveBeenCalledWith(user);
    expect(screen.getByLabelText('Contraseña *')).toHaveValue('');
  }
);

test.each([
  ['EMAIL_ALREADY_REGISTERED', 409, 'El email ya está registrado.', 'Email *'],
  ['INVALID_CREDENTIALS', 401, 'Email o contraseña incorrectos.', null],
  ['INVALID_CSRF_TOKEN', 403, 'La sesión de seguridad ha caducado.', null],
  ['INVALID_PASSWORD', 400, 'La contraseña debe tener', 'Contraseña *'],
])('shows API error %s and clears credentials for retry', async (code, status, text, field) => {
  submit.mockRejectedValue(new AuthError(String(code), Number(status)));
  render(<AuthForm mode="register" onSuccess={jest.fn()} />);
  fill();
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(String(text)));
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('Contraseña *')).toHaveValue('');
  expect(screen.getByLabelText('Confirmar contraseña *')).toHaveValue('');
  expect(screen.getByRole('button')).toBeEnabled();
  if (field) expect(screen.getByLabelText(String(field))).toHaveAttribute('aria-invalid', 'true');
});

test('shows connection errors and allows another attempt', async () => {
  submit.mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce(user);
  const success = jest.fn();
  render(<AuthForm mode="login" onSuccess={success} />);
  fill(false);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Comprueba tu conexión'));
  fill(false);
  fireEvent.click(screen.getByRole('button'));
  await waitFor(() => expect(success).toHaveBeenCalledWith(user));
});
