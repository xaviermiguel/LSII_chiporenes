import { videoDetailsFixture } from '../fixtures/videos.ts';
import { getEnv } from '../utils/Env';

type VideoDetailProps = {
  videoId: number;
  onBack: () => void;
};

export function VideoDetail({ videoId, onBack }: VideoDetailProps) {
  const video = videoDetailsFixture.find((item) => item.id === videoId);

  if (!video) {
    return (
      <section>
        <h1>Vídeo not found </h1>
        <button onClick={onBack}>Return to catalog</button>
      </section>
    );
  }
  const videoSrc = new URL(video.videoUrl, `${getEnv().MEDIA_BASE_URL}/`).href;

  return (
    <section>
      <h1>{video.title}</h1>
      <video key={video.id} src={videoSrc} controls preload="metadata" style={{ width: '100%', maxWidth: '800px' }}>
        Tu navegador no permite reproducir este vídeo.
      </video>
      <p>{video.description}</p>
      <button onClick={onBack}>Return to catalog</button>
    </section>
  );
}
