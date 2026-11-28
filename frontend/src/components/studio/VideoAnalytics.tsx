import { useEffect, useState } from 'react';
import { authenticatedRequest } from '../../auth.ts';
import './VideoAnalytics.css';

type Metrics = { views: number; comments: number };
type Analytics = Metrics & { videos: (Metrics & { id: number; title: string })[] };

const labels = { views: 'Reproducciones', comments: 'Comentarios' };
const metrics = ['views', 'comments'] as const;
const number = new Intl.NumberFormat('es-ES', { useGrouping: true });

function VideoComparison({ analytics }: { analytics: Analytics }) {
  const [metric, setMetric] = useState<keyof Metrics>(analytics.views || !analytics.comments ? 'views' : 'comments');
  const videos = [...analytics.videos].sort((a, b) => b[metric] - a[metric]);
  const maximum = videos[0][metric] || 1;

  return (
    <>
      <div className="analytics-totals" role="group" aria-label="Seleccionar métrica del gráfico">
        {metrics.map((key) => (
          <button key={key} type="button" aria-pressed={metric === key} onClick={() => setMetric(key)}>
            <span>{labels[key]}</span>
            <strong>{number.format(analytics[key])}</strong>
          </button>
        ))}
      </div>
      <section className="analytics-chart" aria-labelledby="comparison-title">
        <h2 id="comparison-title">{labels[metric]} por vídeo</h2>
        <ol>
          {videos.map((video) => (
            <li key={video.id}>
              <div className="analytics-label">
                <span>{video.title}</span>
                <strong>{number.format(video[metric])}</strong>
              </div>
              <div className="analytics-track" aria-hidden="true">
                <div style={{ width: `${(video[metric] / maximum) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

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
        <VideoComparison analytics={analytics} />
      )}
    </section>
  );
}
