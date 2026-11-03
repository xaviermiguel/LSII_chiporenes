import './App.css';
import { useAllVideos } from './useAllVideos.ts';
import { useEffect, useState } from 'react';
import { AuthForm } from './components/AuthForm';
import { SessionProvider, useSession } from './SessionContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AccountProfile } from './components/AccountProfile';
import { MyVideos, EditVideo } from './components/MyVideos';
import { VideoPublication } from './components/VideoPublication';
import type { PublicationDraft } from './videoPublication';
import type { AuthUser } from './auth';
import { VideoDetail } from './components/VideoDetail.tsx';
import { getEnv } from './utils/Env';

function AppContent() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [accountNotice, setAccountNotice] = useState('');
  const [page, setPage] = useState(window.location.hash);
  const [publicationDraft, setPublicationDraft] = useState<PublicationDraft>({
    title: '',
    description: '',
    hadFile: false,
  });
  const { user, loading, sessionError, loggingOut, authenticated: setAuthenticated, logout } = useSession();

  useEffect(() => {
    const navigate = () => {
      setPage(window.location.hash);
      setSelectedVideoId(null);
      document.getElementById('contenido')?.focus();
    };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, []);

  function authenticated(value: AuthUser) {
    setAuthenticated(value);
    setAccountNotice('');
    setSelectedVideoId(null);
    setPage('#contenido');
    window.location.hash = 'contenido';
    document.getElementById('contenido')?.focus();
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
              <>
                <a className="nav-link" href="#upload">
                  Publicar vídeo
                </a>
                <a className="nav-link" href="#my-videos">
                  Mis vídeos
                </a>
                <a className="nav-link" href="#profile">
                  Mi cuenta
                </a>
                <button
                  className="button button-secondary"
                  disabled={loggingOut || loading}
                  onClick={() => void logout()}
                >
                  {loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
                </button>
              </>
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
        {accountNotice && (
          <p className="status-message" role="status">
            {accountNotice}
          </p>
        )}
        {sessionError && (
          <p className="status-message status-error" role="alert">
            {sessionError}
          </p>
        )}
        {page === '#profile' || page === '#my-videos' || page === '#upload' || /^#videos\/[^/]+\/edit$/.test(page) ? (
          <ProtectedRoute>
            {page === '#upload' ? (
              <VideoPublication
                draft={publicationDraft}
                onDraft={setPublicationDraft}
                onOpen={(id) => {
                  window.history.replaceState(null, '', '#contenido');
                  setPage('#contenido');
                  setSelectedVideoId(id);
                  document.getElementById('contenido')?.focus();
                }}
              />
            ) : page === '#profile' ? (
              <AccountProfile
                onPasswordChanged={() => {
                  setAuthenticated(null);
                  setAccountNotice('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
                  setPage('#login');
                  window.location.hash = 'login';
                }}
              />
            ) : page === '#my-videos' ? (
              <MyVideos
                onOpen={(id) => {
                  window.history.replaceState(null, '', '#contenido');
                  setPage('#contenido');
                  setSelectedVideoId(id);
                }}
              />
            ) : (
              <EditVideo key={page} videoId={Number(page.split('/')[1])} />
            )}
          </ProtectedRoute>
        ) : page === '#login' || page === '#register' ? (
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

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
