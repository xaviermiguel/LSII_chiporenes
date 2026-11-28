import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from '../../SessionContext.tsx';
import { FollowControls } from './FollowControls.tsx';
import { CatalogBack } from '../CatalogBack';
import { ProfileVideos } from './ProfileVideos.tsx';
import { defaultAvatarPath, getPublicProfile, resolveAvatarURL } from '../../userProfile.ts';

type ProfileState =
  | { status: 'loading' | 'missing' | 'error' }
  | { status: 'ready'; profile: Awaited<ReturnType<typeof getPublicProfile>> };

export function PublicProfile({ userId, onOpen }: { userId: string; onOpen: (id: number) => void }) {
  const { user } = useSession();
  const [state, setState] = useState<ProfileState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getPublicProfile(userId, controller.signal)
      .then((profile) => {
        if (!controller.signal.aborted) setState({ status: 'ready', profile });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: axios.isAxiosError(error) && error.response?.status === 404 ? 'missing' : 'error' });
        }
      });
    return () => controller.abort();
  }, [userId, attempt]);

  return (
    <section className="account-panel" aria-label="Perfil público">
      <CatalogBack />
      {state.status === 'loading' && (
        <p className="status-message" role="status">
          Cargando perfil…
        </p>
      )}
      {state.status === 'missing' && (
        <p className="status-message status-error" role="alert">
          Perfil no encontrado.
        </p>
      )}
      {state.status === 'error' && (
        <>
          <p className="status-message status-error" role="alert">
            No se ha podido cargar el perfil.
          </p>
          <button
            className="button"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((previous) => previous + 1);
            }}
          >
            Reintentar
          </button>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <img
            className="profile-avatar"
            src={resolveAvatarURL(state.profile.avatarURL || defaultAvatarPath)}
            alt=""
            width={96}
            height={96}
          />
          <h1>{state.profile.displayName}</h1>
          <p className="profile-description">
            {state.profile.description?.trim() ? state.profile.description : 'Miembro de la comunidad de ProTube.'}
          </p>
          <FollowControls
            storageKey={`protube:profiles/${state.profile.id}:followers`}
            profileOwnerId={state.profile.id}
          />
          {user?.id === state.profile.id && (
            <a className="button" href="#profile">
              Editar mi perfil
            </a>
          )}
          <ProfileVideos authorName={state.profile.displayName} authorId={state.profile.id} onOpen={onOpen} />
        </>
      )}
    </section>
  );
}
