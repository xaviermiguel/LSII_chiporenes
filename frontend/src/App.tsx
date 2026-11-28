import './App.css';
import { VideoListFooter } from './components/VideoListFooter';
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
import type { VideoReturn } from './videoLogin';

const searchRoute = '#buscar?';

function queryFromHash(hash: string) {
  return hash.startsWith(searchRoute)
    ? (new URLSearchParams(hash.slice(searchRoute.length)).get('q') ?? '').trim()
    : '';
}

function AppContent() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(() => window.history.state?.videoId ?? null);
  const [videoReturn, setVideoReturn] = useState<VideoReturn | undefined>(() => window.history.state?.videoReturn);
  const [accountNotice, setAccountNotice] = useState('');
  const [page, setPage] = useState(window.location.hash);
  const searchQuery = queryFromHash(page);
  const [searchInput, setSearchInput] = useState(searchQuery);
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

  function closeVideo() {
    window.history.replaceState(null, '');
    setSelectedVideoId(null);
    setVideoReturn(undefined);
    document.getElementById('contenido')?.focus();
  }

  function search(query: string) {
    const trimmed = query.trim();
    const hash = trimmed ? `${searchRoute}${new URLSearchParams({ q: trimmed })}` : '#contenido';
    setSearchInput(trimmed);
    if (window.location.hash !== hash) {
      window.location.hash = hash;
    } else {
      closeVideo();
    }
  }

  function openVideo(id: number) {
    window.history.replaceState(null, '', '#contenido');
    setPage('#contenido');
    setSelectedVideoId(Number.isSafeInteger(id) && id > 0 ? id : null);
    document.getElementById('contenido')?.focus();
  }

  useEffect(() => {
    const navigate = () => {
      const hash = window.location.hash;
      const state = window.history.state;
      const authPage = hash === '#login' || hash === '#register';
      const previousAuthPage = page === '#login' || page === '#register';
      const journey = state?.videoReturn ?? (previousAuthPage ? videoReturn : undefined);
      if (authPage && journey) window.history.replaceState({ videoReturn: journey }, '');
      const returning = previousAuthPage && journey && state?.videoId === journey.videoId;
      setVideoReturn(authPage || returning ? journey : undefined);
      setPage(hash);
      setSearchInput(queryFromHash(hash));
      setSelectedVideoId(state?.videoId ?? null);
      document.getElementById('contenido')?.focus();
    };
    window.addEventListener('hashchange', navigate);
    return () => window.removeEventListener('hashchange', navigate);
  }, [page, videoReturn]);

  function returnToVideo(journey: VideoReturn) {
    const hash = journey.origin || '#contenido';
    window.history.replaceState(null, '', hash);
    setPage(hash);
    setSearchInput(queryFromHash(hash));
    setSelectedVideoId(journey.videoId);
    document.getElementById('contenido')?.focus();
  }

  function authenticated(value: AuthUser) {
    setAuthenticated(value);
    setAccountNotice('');
    if (videoReturn) {
      returnToVideo(videoReturn);
      return;
    }
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
            onClick={() => {
              closeVideo();
              setSearchInput('');
            }}
            aria-label="ProTube, ir al catálogo"
          >
            <img src="/protube-logo-removebg-preview.png" alt="logo" width="48" height="48" />
            <span>
              Pro<span className="brand-accent">Tube</span>
            </span>
          </a>
          <form
            className="video-search"
            role="search"
            aria-label="Buscar vídeos"
            onSubmit={(event) => {
              event.preventDefault();
              search(searchInput);
            }}
          >
            <div className="form-field">
              <label className="visually-hidden" htmlFor="video-query">
                Título o descripción
              </label>
              <input
                id="video-query"
                type="search"
                placeholder="Título o descripción"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
            <button className="button" type="submit">
              Buscar
            </button>
          </form>
          <nav className="header-nav" aria-label="Navegación principal">
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
              <MyVideos key={user?.id} onOpen={openVideo} />
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
          <AuthForm
            key={page}
            mode={page === '#register' ? 'register' : 'login'}
            onSuccess={authenticated}
            videoNotice={
              videoReturn &&
              (videoReturn.expired
                ? 'Tu sesión ha caducado. Inicia sesión para continuar en el vídeo.'
                : 'Inicia sesión para comentar o dar Me gusta. Después volverás al vídeo.')
            }
            onCancel={videoReturn && (() => returnToVideo(videoReturn))}
          />
        ) : selectedVideoId === null ? (
          <section aria-labelledby="catalog-title">
            {searchQuery ? (
              <div className="section-heading">
                <h1 id="catalog-title">Resultados para «{searchQuery}»</h1>
                <button className="button button-secondary" onClick={() => search('')}>
                  Limpiar búsqueda
                </button>
              </div>
            ) : (
              <div className="catalog-intro">
                <p className="eyebrow">Catálogo público</p>
                <h1 id="catalog-title">Descubre algo nuevo.</h1>
                <p>Explora los vídeos de la comunidad y encuentra tu próxima inspiración.</p>
              </div>
            )}
            <VideoResults key={searchQuery} query={searchQuery || undefined} onSelectedVideo={setSelectedVideoId} />
          </section>
        ) : (
          <VideoDetail
            key={selectedVideoId}
            initialDraft={videoReturn?.videoId === selectedVideoId ? videoReturn.draft : undefined}
            videoId={selectedVideoId}
            userId={user?.id}
            backLabel={searchQuery ? 'Volver a los resultados' : undefined}
            onBack={closeVideo}
          />
        )}
      </main>
    </div>
  );
}
type VideoResultsProps = {
  onSelectedVideo: (id: number) => void;
  query?: string;
};

function VideoResults({ onSelectedVideo, query }: VideoResultsProps) {
  const { value: videos, message, loading, hasNext, loadMore } = useAllVideos(query);
  const resultsLabel = query === undefined ? 'Vídeos disponibles' : `Resultados para «${query}»`;
  return (
    <>
      {videos.length > 0 && (
        <>
          <div className="section-heading">
            {query === undefined && <h2>{resultsLabel}:</h2>}
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
        </>
      )}
      <VideoListFooter
        loading={loading}
        hasNext={hasNext}
        loadMore={loadMore}
        message={message}
        empty={videos.length === 0}
        loadingMessage={query === undefined ? 'Cargando vídeos...' : 'Buscando vídeos...'}
        emptyMessage={query === undefined ? 'No hay vídeos disponibles.' : `No se encontraron vídeos para «${query}».`}
      />
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
