import './App.css';
import { useAllVideos } from './useAllVideos.ts';
import { useEffect, useRef, useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { currentUser, signOut } from './auth';
import type { AuthUser } from './auth';
import { VideoDetail } from './components/VideoDetail.tsx';
import { getEnv } from './utils/Env';

function App() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [page, setPage] = useState(window.location.hash);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionError, setSessionError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const version = useRef(0);
  const logoutLock = useRef(false);

  useEffect(() => {
    const navigate = () => {
      setPage(window.location.hash);
      setSelectedVideoId(null);
      document.getElementById('contenido')?.focus();
    };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      const revision = ++version.current;
      void currentUser(controller.signal)
        .then((value) => {
          if (!controller.signal.aborted && revision === version.current) setUser(value);
        })
        .catch(() => {
          /* A network failure does not prove that the session expired. */
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      controller.abort();
      window.removeEventListener('focus', refresh);
    };
  }, []);

  function authenticated(value: AuthUser) {
    ++version.current;
    setUser(value);
    setSessionError('');
    setSelectedVideoId(null);
    setPage('#contenido');
    window.location.hash = 'contenido';
    document.getElementById('contenido')?.focus();
  }

  async function logout() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLoggingOut(true);
    setSessionError('');
    try {
      await signOut();
      ++version.current;
      setUser(null);
      setPage('#contenido');
      setSelectedVideoId(null);
      window.location.hash = 'contenido';
    } catch {
      setSessionError('No se ha podido cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      logoutLock.current = false;
      setLoggingOut(false);
    }
  }

  return (
    <div className="App">
      <a
        className="skip-link"
        href="#contenido"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('contenido')?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <header className="site-header">
        <div className="app-container header-content">
          <a
            className="brand"
            href="#contenido"
            onClick={() => setSelectedVideoId(null)}
            aria-label="ProTube, ir al catálogo"
          >
            <img src="/protube-logo-removebg-preview.png" alt="logo" width="48" height="48" />
            <span>
              Pro<span className="brand-accent">Tube</span>
            </span>
          </a>
          <nav className="header-nav" aria-label="Navegación principal">
            {user ? (
              <span className="account-name">Hola, {user.displayName}</span>
            ) : (
              <span className="header-caption">Un espacio para descubrir.</span>
            )}
            <a className="nav-link" href="#contenido" onClick={() => setSelectedVideoId(null)}>
              Explorar
            </a>
            {user ? (
              <button className="button button-secondary" disabled={loggingOut} onClick={() => void logout()}>
                {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
              </button>
            ) : (
              <>
                <a className="nav-link" href="#login">
                  Iniciar sesión
                </a>
                <a className="button" href="#register">
                  Registrarse
                </a>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="contenido" className="app-container main-content" tabIndex={-1}>
        {sessionError && (
          <p className="status-message status-error" role="alert">
            {sessionError}
          </p>
        )}
        {page === '#login' || page === '#register' ? (
          <AuthForm key={page} mode={page === '#register' ? 'register' : 'login'} onSuccess={authenticated} />
        ) : selectedVideoId === null ? (
          <ContentApp onSelectedVideo={setSelectedVideoId} />
        ) : (
          <VideoDetail videoId={selectedVideoId} onBack={() => setSelectedVideoId(null)} />
        )}
      </main>
    </div>
  );
}
type ContentAppProps = {
  onSelectedVideo: (id: number) => void;
};

function ContentApp({ onSelectedVideo }: ContentAppProps) {
  const { value: videos, message, loading, hasNext, loadMore } = useAllVideos();

  return (
    <section aria-labelledby="catalog-title">
      <div className="catalog-intro">
        <p className="eyebrow">Catálogo público</p>
        <h1 id="catalog-title">Descubre algo nuevo.</h1>
        <p>Explora los vídeos de la comunidad y encuentra tu próxima inspiración.</p>
      </div>
      {loading === 'loading' && videos.length === 0 ? (
        <p className="status-message" role="status">
          Cargando vídeos...
        </p>
      ) : loading === 'error' && videos.length === 0 ? (
        <div className="state-panel">
          <p className="status-message status-error" role="alert">
            {message}
          </p>
          <button className="button" onClick={() => void loadMore()}>
            Reintentar
          </button>
        </div>
      ) : videos.length === 0 ? (
        <p className="status-message">No hay vídeos disponibles.</p>
      ) : (
        <>
          <div className="section-heading">
            <h2>Vídeos disponibles:</h2>
            <span className="catalog-count">{videos.length} en esta selección</span>
          </div>
          <ul className="video-catalog" aria-label="Vídeos disponibles">
            {videos.map((video) => (
              <li key={video.id}>
                <button className="video-card" aria-label={video.title} onClick={() => onSelectedVideo(video.id)}>
                  <span className="video-card-media">
                    <img
                      src={
                        new URL(video.thumbnailUrl, new URL(`${getEnv().MEDIA_BASE_URL}/`, window.location.href)).href
                      }
                      alt=""
                      loading="lazy"
                    />
                    <span className="video-card-play" aria-hidden="true">
                      ▶
                    </span>
                  </span>
                  <span className="video-card-body">
                    <span className="video-card-title">{video.title}</span>
                    <span className="video-card-author">{video.user}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="catalog-footer">
            {loading === 'error' && (
              <p className="status-message status-error" role="alert">
                {message}
              </p>
            )}
            {hasNext && (
              <button className="button" disabled={loading === 'loading'} onClick={() => void loadMore()}>
                {loading === 'loading' ? 'Cargando más vídeos...' : loading === 'error' ? 'Reintentar' : 'Cargar más'}
              </button>
            )}
            {!hasNext && (
              <p className="status-message" role="status">
                No hay más vídeos.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default App;
