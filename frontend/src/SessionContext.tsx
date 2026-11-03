import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AuthError, currentUser, signOut, authenticatedRequest } from './auth';
import type { AuthUser } from './auth';

type Session = {
  user: AuthUser | null;
  loading: boolean;
  loggingOut: boolean;
  sessionError: string;
  authenticated: (user: AuthUser) => void;
  logout: () => Promise<void>;
  request: (path: string, init?: RequestInit) => Promise<Response>;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionError, setSessionError] = useState('');
  const version = useRef(0);
  const logoutLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (logoutLock.current) return;
      const revision = ++version.current;
      void currentUser(controller.signal)
        .then((value) => {
          if (!controller.signal.aborted && revision === version.current) {
            setUser(value);
            setSessionError('');
          }
        })
        .catch(() => {
          if (!controller.signal.aborted && revision === version.current)
            setSessionError('No se ha podido comprobar la sesión. Recupera el foco para reintentar.');
        })
        .finally(() => {
          if (!controller.signal.aborted && revision === version.current) setLoading(false);
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('hashchange', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('hashchange', refresh);
    };
  }, []);

  function authenticated(value: AuthUser) {
    ++version.current;
    setUser(value);
    setLoading(false);
    setSessionError('');
  }

  async function logout() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    ++version.current;
    setLoggingOut(true);
    setSessionError('');
    try {
      await signOut();
      setUser(null);
      window.location.hash = 'contenido';
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) setUser(null);
      else setSessionError('No se ha podido cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      logoutLock.current = false;
      setLoggingOut(false);
      setLoading(false);
    }
  }

  async function request(path: string, init?: RequestInit) {
    const revision = version.current;
    try {
      return await authenticatedRequest(path, init);
    } catch (error) {
      if (revision === version.current && error instanceof AuthError && error.status === 401) {
        ++version.current;
        setUser(null);
        setLoading(false);
      }
      throw error;
    }
  }

  return (
    <SessionContext.Provider value={{ user, loading, loggingOut, sessionError, authenticated, logout, request }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession requires SessionProvider');
  return session;
}
