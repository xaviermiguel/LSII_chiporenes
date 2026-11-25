import { useLocalAccountReactions } from '../../useLocalAccountReactions.ts';

const countFormat = new Intl.NumberFormat('es-ES');

type VideoEngagementProps = {
  videoId: number;
  userId?: number;
  viewCount?: number | null;
  likeCount?: number | null;
};

export function VideoEngagement({ videoId, userId, viewCount, likeCount }: VideoEngagementProps) {
  const { accounts, saveError, toggle } = useLocalAccountReactions(`protube:videos/${videoId}:likes`);
  const liked = userId !== undefined && accounts.includes(userId);

  return (
    <div>
      <div className="video-engagement">
        {viewCount != null && (
          <span className="video-view-count">
            <img src="/video-views.png" alt="" width={24} height={24} />
            {countFormat.format(viewCount)} visualizaciones importadas
          </span>
        )}
        {userId === undefined ? (
          <a className="button button-secondary" href="#login">
            Iniciar sesión para dar Me gusta
          </a>
        ) : (
          <button
            className={liked ? 'button' : 'button button-secondary'}
            type="button"
            aria-pressed={liked}
            onClick={() => toggle(userId)}
          >
            Me gusta
          </button>
        )}
        <span aria-live="polite">
          {countFormat.format((likeCount ?? 0) + accounts.length)} Me gusta
          {likeCount == null && ' en este navegador'}
        </span>
      </div>
      {saveError && (
        <p role="alert" className="status-message status-error">
          No se ha podido guardar el Me gusta en este navegador.
        </p>
      )}
    </div>
  );
}
