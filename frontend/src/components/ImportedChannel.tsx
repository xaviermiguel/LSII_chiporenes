import { useState } from 'react';
import { FollowControls } from './FollowControls';
import { ProfileVideos } from './ProfileVideos';

export function ImportedChannel({ name, onOpen }: { name: string; onOpen: (id: number) => void }) {
  const [importedFollowers, setImportedFollowers] = useState<number | null>(null);
  const isMarkRonson = name === 'Mark Ronson';
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join('')
    .toUpperCase();
  const storageKey = isMarkRonson
    ? 'protube:channels:mark-ronson:followers'
    : `protube:channels/name/${encodeURIComponent(name)}:followers`;

  return (
    <section className="account-panel" aria-labelledby="channel-title">
      <span className="profile-avatar channel-avatar" role="img" aria-label={`Avatar de ${name}`}>
        {initials}
      </span>
      <h1 id="channel-title">{name}</h1>
      <p>
        {isMarkRonson
          ? 'DJ y productor musical británico. Produjo «Back to Black» de Amy Winehouse y lanzó «Uptown Funk» con Bruno Mars.'
          : `Canal de origen de los vídeos importados de ${name} en ProTube.`}
      </p>
      <FollowControls storageKey={storageKey} initialCount={importedFollowers} />
      <ProfileVideos authorName={name} authorId={null} onOpen={onOpen} onImportedFollowers={setImportedFollowers} />
      <a className="button button-secondary" href="#contenido">
        Volver al catálogo
      </a>
    </section>
  );
}
