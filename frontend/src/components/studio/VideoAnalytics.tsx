import { useEffect, useState } from 'react';
import { authenticatedRequest } from '../../auth.ts';
import { getEnv } from '../../utils/Env';
import './VideoAnalytics.css';

type Metrics = { views: number; comments: number };
type Analytics = Metrics & { videos: (Metrics & { id: number; title: string; thumbnailUrl: string })[] };

const labels = { views: 'Reproducciones', comments: 'Comentarios' };
const metrics = ['views', 'comments'] as const;
const number = new Intl.NumberFormat('es-ES', { useGrouping: true });
const periods = [
  ['DAY', 'Últimas 24 horas'],
  ['WEEK', 'Últimos 7 días'],
  ['MONTH', 'Últimos 30 días'],
  ['ALL', 'Todo el periodo'],
] as const;
type Period = (typeof periods)[number][0];

function VideoComparison({
  analytics,
  metric,
  onMetric,
}: {
  analytics: Analytics;
  metric: keyof Metrics;
  onMetric: (metric: keyof Metrics) => void;
}) {
  const videos = [...analytics.videos].sort((a, b) => b[metric] - a[metric]);
  const maximum = videos[0][metric] || 1;

  return (
    <>
      <div className="analytics-totals" role="group" aria-label="Seleccionar métrica del gráfico">
        {metrics.map((key) => (
          <button key={key} type="button" aria-pressed={metric === key} onClick={() => onMetric(key)}>
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
                {metric === 'views' ? (
                  <a className="analytics-video-link" href={`#videos/${video.id}`}>
                    {video.thumbnailUrl && (
                      <img
                        src={
                          new URL(video.thumbnailUrl, new URL(`${getEnv().MEDIA_BASE_URL}/`, window.location.href)).href
                        }
                        alt=""
                        width="64"
                        height="36"
                        loading="lazy"
                      />
                    )}
                    <span>{video.title}</span>
                  </a>
                ) : (
                  <span>{video.title}</span>
                )}
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
  const [period, setPeriod] = useState<Period>('ALL');
  const [selectedMetric, setMetric] = useState<keyof Metrics>();
  const [result, setResult] = useState<{ period: Period; data?: Analytics }>();
  const analytics = result?.period === period ? result.data : undefined;

  useEffect(() => {
    const controller = new AbortController();
    void authenticatedRequest(`/videos/me/analytics?period=${period}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((data: Analytics) => {
        if (!controller.signal.aborted) setResult({ period, data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ period });
      });
    return () => controller.abort();
  }, [period]);

  return (
    <section>
      <h1>Estadísticas</h1>
      <div className="analytics-period" role="group" aria-label="Periodo de las estadísticas">
        {periods.map(([value, label]) => (
          <button key={value} type="button" aria-pressed={period === value} onClick={() => setPeriod(value)}>
            {label}
          </button>
        ))}
      </div>
      {result?.period === period && !analytics ? (
        <p role="alert">No se pudieron cargar tus estadísticas.</p>
      ) : !analytics ? (
        <p role="status">Cargando estadísticas…</p>
      ) : analytics.videos.length === 0 ? (
        <p>Todavía no tienes vídeos publicados.</p>
      ) : (
        <VideoComparison
          analytics={analytics}
          metric={selectedMetric ?? (analytics.views || !analytics.comments ? 'views' : 'comments')}
          onMetric={setMetric}
        />
      )}
    </section>
  );
}
