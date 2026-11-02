import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useSession } from '../SessionContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, sessionError } = useSession();
  useEffect(() => {
    if (!loading && !user && !sessionError) window.location.replace('#login');
  }, [user, loading, sessionError]);
  if (loading) return <p>Comprobando sesión…</p>;
  if (!user) return null;
  return children;
}
