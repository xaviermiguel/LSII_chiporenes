import { useEffect, useRef } from 'react';

type Props = {
  loading: 'loading' | 'success' | 'error';
  hasNext: boolean;
  loadMore: () => void;
  message: string;
  empty: boolean;
  loadingMessage: string;
  emptyMessage: string;
};

export function VideoListFooter({ loading, hasNext, loadMore, message, empty, loadingMessage, emptyMessage }: Props) {
  const marker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = marker.current;
    if (!target || loading !== 'success' || !hasNext) return;
    let active = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (active && entry.isIntersecting) {
          active = false;
          observer.disconnect();
          loadMore();
        }
      },
      { rootMargin: '0px 0px 160px' }
    );
    observer.observe(target);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [loading, hasNext, loadMore]);

  return (
    <div className={empty ? 'state-panel' : 'catalog-footer'} ref={marker}>
      {loading === 'error' ? (
        <>
          <p className="status-message status-error" role="alert">
            {message}
          </p>
          <button className="button" onClick={loadMore}>
            Reintentar
          </button>
        </>
      ) : loading === 'loading' ? (
        <p className="status-message" role="status">
          {empty ? loadingMessage : 'Cargando más vídeos...'}
        </p>
      ) : (
        !hasNext && (
          <p className="status-message" role="status">
            {empty ? emptyMessage : 'No hay más vídeos.'}
          </p>
        )
      )}
    </div>
  );
}
