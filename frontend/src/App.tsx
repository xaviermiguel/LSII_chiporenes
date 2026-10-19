import './App.css';
import { videoListFixture } from './fixtures/videos.ts';
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
  return (
    <>
      <strong> Avaible videos: </strong>
      <ul>
        {videoListFixture.items.map((video) => (
          <li key={video.id}>
            <button onClick={() => onSelectedVideo(video.id)}>{video.title}</button>
          </li>
        ))}
      </ul>
    </>
  );
}

export default App;
