import { useEffect, useState } from 'react';
import { authenticatedRequest } from '../../auth.ts';

type Metrics = { views: number; comments: number };
type Analytics = Metrics & { videos: (Metrics & { id: number; title: string })[] };

export function VideoAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void authenticatedRequest('/videos/me/analytics', { signal: controller.signal })
      .then((response) => response.json())
      .then((data: Analytics) => {
        if (!controller.signal.aborted) setAnalytics(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <section>
      <h1>Estadísticas</h1>
      {failed ? (
        <p role="alert">No se pudieron cargar tus estadísticas.</p>
      ) : !analytics ? (
        <p role="status">Cargando estadísticas…</p>
      ) : analytics.videos.length === 0 ? (
        <p>Todavía no tienes vídeos publicados.</p>
      ) : (
        <>
          <p>
            Total: {analytics.views} reproducciones y {analytics.comments} comentarios.
          </p>
          <table>
            <thead>
              <tr>
                <th scope="col">Vídeo</th>
                <th scope="col">Reproducciones</th>
                <th scope="col">Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {analytics.videos.map((video) => (
                <tr key={video.id}>
                  <th scope="row">{video.title}</th>
                  <td>{video.views}</td>
                  <td>{video.comments}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
