import './App.css';
import { useAllVideos } from './useAllVideos.ts';
import { useState } from 'react';
import { VideoDetail } from './components/VideoDetail.tsx';

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
  const { value: videos, message, loading } = useAllVideos();

  if (loading === 'loading') {
    return <p>Cargando vídeos...</p>;
  }

  if (loading === 'error') {
    return <p role="alert">{message}</p>;
  }

  if (videos.length === 0) {
    return <p>No hay vídeos disponibles.</p>;
  }

  return (
    <>
      <strong>Vídeos disponibles:</strong>
      <ul>
        {videos.map((video) => (
          <li key={video.id}>
            <button onClick={() => onSelectedVideo(video.id)}>{video.title}</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default App;
