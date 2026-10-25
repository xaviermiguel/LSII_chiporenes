import './App.css';
import { useAllVideos } from './useAllVideos.ts';
import { useState } from 'react';
import { VideoDetail } from './components/VideoDetail.tsx';
import { getEnv } from './utils/Env';

function App() {
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);

  return (
    <div className="App">
      <header className="App-header">
        <img src="/protube-logo-removebg-preview.png" className="App-logo" alt="logo" />
        {selectedVideoId === null ? (
          <ContentApp onSelectedVideo={setSelectedVideoId} />
        ) : (
          <VideoDetail videoId={selectedVideoId} onBack={() => setSelectedVideoId(null)} />
        )}
      </header>
    </div>
  );
}
type ContentAppProps = {
  onSelectedVideo: (id: number) => void;
};

function ContentApp({ onSelectedVideo }: ContentAppProps) {
  const { value: videos, message, loading, hasNext, loadMore } = useAllVideos();

  if (loading === 'loading' && videos.length === 0) {
    return <p role="status">Cargando vídeos...</p>;
  }

  if (loading === 'error' && videos.length === 0) {
    return (
      <section>
        <p role="alert">{message}</p>
        <button onClick={() => void loadMore()}>Reintentar</button>
      </section>
    );
  }

  if (videos.length === 0) {
    return <p>No hay vídeos disponibles.</p>;
  }

  return (
    <>
      <strong>Vídeos disponibles:</strong>
      <ul className="video-catalog">
        {videos.map((video) => (
          <li key={video.id}>
            <button onClick={() => onSelectedVideo(video.id)}>
              <img
                src={new URL(video.thumbnailUrl, new URL(`${getEnv().MEDIA_BASE_URL}/`, window.location.href)).href}
                alt=""
                loading="lazy"
              />
              <span>{video.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {loading === 'error' && <p role="alert">{message}</p>}
      {hasNext && (
        <button disabled={loading === 'loading'} onClick={() => void loadMore()}>
          {loading === 'loading' ? 'Cargando más vídeos...' : loading === 'error' ? 'Reintentar' : 'Cargar más'}
        </button>
      )}
      {!hasNext && <p role="status">No hay más vídeos.</p>}
    </>
  );
}

export default App;
