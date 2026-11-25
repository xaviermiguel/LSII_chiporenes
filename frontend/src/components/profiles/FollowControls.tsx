import { useSession } from '../../SessionContext.tsx';
import { useLocalAccountReactions } from '../../useLocalAccountReactions.ts';

const followerCountFormat = new Intl.NumberFormat('es-ES');

type FollowControlsProps = {
  storageKey: string;
  profileOwnerId?: number;
  initialCount?: number | null;
};

export function FollowControls({ storageKey, profileOwnerId, initialCount = 0 }: FollowControlsProps) {
  const { user } = useSession();
  const { accounts: followers, saveError, toggle } = useLocalAccountReactions(storageKey);
  const isOwnProfile = user !== null && user.id === profileOwnerId;
  const following = user !== null && followers.includes(user.id);

  const count = (initialCount ?? 0) + followers.length;

  return (
    <div>
      <p aria-live="polite">
        {followerCountFormat.format(count)} {count === 1 ? 'seguidor' : 'seguidores'}
        {initialCount === null && ' en este navegador'}
      </p>
      {isOwnProfile ? null : user ? (
        <button
          className={following ? 'button button-secondary' : 'button'}
          type="button"
          onClick={() => toggle(user.id)}
        >
          {following ? 'Dejar de seguir' : profileOwnerId === undefined ? 'Seguir canal' : 'Seguir'}
        </button>
      ) : (
        <a className="button button-secondary" href="#login">
          Iniciar sesión para seguir
        </a>
      )}
      {saveError && (
        <p role="alert" className="status-message status-error">
          No se ha podido guardar el seguimiento en este navegador.
        </p>
      )}
    </div>
  );
}
