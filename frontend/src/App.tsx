import './App.css';
import { useAllVideos } from './useAllVideos.ts';
import { useState } from 'react';
import { VideoDetail } from './components/VideoDetail.tsx';
import { getEnv } from './utils/Env';

function App() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  return (
    <div className="App">
      <a className="skip-link" href="#contenido">
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
            <span className="header-caption">Un espacio para descubrir.</span>
            <a className="nav-link" href="#contenido" onClick={() => setSelectedVideoId(null)}>
              Explorar
            </a>
          </nav>
        </div>
      </header>
      <main id="contenido" className="app-container main-content" tabIndex={-1}>
        {selectedVideoId === null ? (
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
