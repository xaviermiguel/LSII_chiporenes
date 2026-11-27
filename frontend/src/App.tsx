import './App.css';
import { useAllVideos } from './useAllVideos.ts';
import { useEffect, useState } from 'react';
import { AuthForm } from './components/auth/AuthForm.tsx';
import { ThemeSelector } from './components/ThemeSelector';
import { SessionProvider, useSession } from './SessionContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute.tsx';
import { AccountProfile } from './components/profiles/AccountProfile.tsx';
import { PublicProfile } from './components/profiles/PublicProfile.tsx';
import { ImportedChannel } from './components/profiles/ImportedChannel.tsx';
import { ImportedCommentProfile } from './components/profiles/ImportedCommentProfile.tsx';
import { MyVideos } from './components/studio/MyVideos.tsx';
import { VideoPublication } from './components/studio/VideoPublication.tsx';
import { VideoEditing } from './components/studio/VideoEditing.tsx';
import type { EditingDraft } from './components/studio/VideoEditing.tsx';
import type { PublicationDraft } from './videoPublication';
import type { AuthUser } from './auth';
import { VideoDetail } from './components/watch/VideoDetail.tsx';
import { getEnv } from './utils/Env';

function AppContent() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [accountNotice, setAccountNotice] = useState('');
  const [page, setPage] = useState(window.location.hash);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDrafts, setEditingDrafts] = useState<Record<string, EditingDraft | undefined>>({});
  const [publicationDraft, setPublicationDraft] = useState<PublicationDraft>({
    title: '',
    description: '',
    hadFile: false,
  });
  const { user, loading, sessionError, loggingOut, authenticated: setAuthenticated, logout } = useSession();
  const editingId = /^#videos\/([^/]+)\/edit$/.exec(page)?.[1];
  const publicProfileId = /^#users\/([0-9]+)$/.exec(page)?.[1];
  const commentProfile = /^#videos\/([0-9]+)\/comments\/([0-9]+)\/author$/.exec(page);
  const importedChannel = /^#channels\/name\/([^/]+)$/.exec(page)?.[1];
  let channelName = page === '#channels/mark-ronson' ? 'Mark Ronson' : '';
  if (importedChannel) {
    try {
      channelName = decodeURIComponent(importedChannel).trim();
    } catch {
      channelName = '';
    }
  }
  const draftKey = `${user?.id}:${editingId}`;

  function openVideo(id: number) {
    window.history.replaceState(null, '', '#contenido');
    setPage('#contenido');
    setSelectedVideoId(Number.isSafeInteger(id) && id > 0 ? id : null);
    document.getElementById('contenido')?.focus();
  }

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
            <a className="nav-link" href="#buscar" onClick={() => setSelectedVideoId(null)}>
              Buscar
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
            <ThemeSelector />
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
            ) : editingId ? (
              <VideoEditing
                key={draftKey}
                videoId={editingId}
                draft={editingDrafts[draftKey]}
                onDraft={(value) => setEditingDrafts((previous) => ({ ...previous, [draftKey]: value }))}
                onBack={openVideo}
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
            ) : (
              <MyVideos onOpen={openVideo} />
            )}
          </ProtectedRoute>
        ) : commentProfile ? (
          <ImportedCommentProfile
            key={page}
            videoId={commentProfile[1]}
            commentId={commentProfile[2]}
            onBack={() => openVideo(Number(commentProfile[1]))}
          />
        ) : channelName ? (
          <ImportedChannel key={channelName} name={channelName} onOpen={openVideo} />
        ) : publicProfileId ? (
          <PublicProfile key={publicProfileId} userId={publicProfileId} onOpen={openVideo} />
        ) : page === '#login' || page === '#register' ? (
          <AuthForm key={page} mode={page === '#register' ? 'register' : 'login'} onSuccess={authenticated} />
        ) : selectedVideoId === null ? (
          page === '#buscar' ? (
            <SearchPage query={searchQuery} onSearch={setSearchQuery} onSelectedVideo={setSelectedVideoId} />
          ) : (
            <ContentApp onSelectedVideo={setSelectedVideoId} />
          )
        ) : (
          <VideoDetail videoId={selectedVideoId} userId={user?.id} onBack={() => setSelectedVideoId(null)} />
        )}
      </main>
    </div>
  );
}
type ContentAppProps = {
  onSelectedVideo: (id: number) => void;
};

function SearchPage({
  query,
  onSearch,
  onSelectedVideo,
}: ContentAppProps & { query: string; onSearch: (query: string) => void }) {
  const [input, setInput] = useState(query);

  return (
    <section aria-labelledby="search-title">
      <div className="catalog-intro">
        <h1 id="search-title">Buscar vídeos</h1>
      </div>
      <form
        className="video-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const nextQuery = input.trim();
          if (nextQuery) onSearch(nextQuery);
        }}
      >
        <div className="form-field">
          <label htmlFor="video-query">Título o descripción</label>
          <input id="video-query" type="search" value={input} onChange={(event) => setInput(event.target.value)} />
        </div>
        <button className="button" type="submit">
          Buscar
        </button>
      </form>
      {query && <VideoResults key={query} query={query} onSelectedVideo={onSelectedVideo} />}
    </section>
  );
}

function ContentApp({ onSelectedVideo }: ContentAppProps) {
  return (
    <section aria-labelledby="catalog-title">
      <div className="catalog-intro">
        <p className="eyebrow">Catálogo público</p>
        <h1 id="catalog-title">Descubre algo nuevo.</h1>
        <p>Explora los vídeos de la comunidad y encuentra tu próxima inspiración.</p>
      </div>
      <VideoResults onSelectedVideo={onSelectedVideo} />
    </section>
  );
}

function VideoResults({ onSelectedVideo, query }: ContentAppProps & { query?: string }) {
  const { value: videos, message, loading, hasNext, loadMore } = useAllVideos(query);
  const resultsLabel = query === undefined ? 'Vídeos disponibles' : `Resultados para «${query}»`;

  return (
    <>
      {loading === 'loading' && videos.length === 0 ? (
        <p className="status-message" role="status">
          {query === undefined ? 'Cargando vídeos...' : 'Buscando vídeos...'}
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
        <p className="status-message" role={query === undefined ? undefined : 'status'}>
          {query === undefined ? 'No hay vídeos disponibles.' : `No se encontraron vídeos para «${query}».`}
        </p>
      ) : (
        <>
          <div className="section-heading">
            <h2>{resultsLabel}:</h2>
            <span className="catalog-count">{videos.length} en esta selección</span>
          </div>
          <ul className="video-catalog" aria-label={resultsLabel}>
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
    </>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <AppContent />
    </SessionProvider>
  );
}
