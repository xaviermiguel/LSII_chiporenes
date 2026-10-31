import { getEnv } from './utils/Env';

export type AuthUser = { id: number; displayName: string; email: string };
export type Credentials = { email: string; password: string; displayName?: string; confirmPassword?: string };

const messages: Record<string, string> = {
  EMAIL_ALREADY_REGISTERED: 'El email ya está registrado.',
  INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
  INVALID_EMAIL: 'Introduce un email válido de hasta 254 caracteres.',
  INVALID_DISPLAY_NAME: 'El nombre debe tener entre 1 y 30 caracteres.',
  INVALID_PASSWORD:
    'La contraseña debe tener entre 8 y 72 caracteres ASCII imprimibles, sin espacios al principio ni al final.',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden.',
  INVALID_REQUEST: 'Revisa los campos obligatorios y su formato.',
  INVALID_CSRF_TOKEN: 'La sesión de seguridad ha caducado. Vuelve a enviar el formulario.',
  ACCESS_DENIED: 'No tienes permiso para realizar esta operación.',
};

export class AuthError extends Error {
  constructor(
    public code: string,
    public status: number
  ) {
    super(messages[code] || 'No se ha podido completar la solicitud. Inténtalo de nuevo.');
  }
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(`${getEnv().API_BASE_URL}/auth/${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AuthError(body.code || 'UNKNOWN', response.status);
  }
  return response.status === 204 ? null : response.json();
}

export async function currentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    return await request('me', { signal });
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) return null;
    throw error;
  }
}

export async function authenticate(mode: 'login' | 'register', credentials: Credentials): Promise<AuthUser> {
  // Obtain a fresh token for each mutation: Spring rotates it after signing in/out.
  const csrf = await request('csrf');
  return request(mode, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
    body: JSON.stringify(credentials),
  });
}

export async function signOut(): Promise<void> {
  const csrf = await request('csrf');
  await request('logout', { method: 'POST', headers: { [csrf.headerName]: csrf.token } });
}
