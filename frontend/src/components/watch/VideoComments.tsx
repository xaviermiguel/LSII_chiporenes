import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { VideoComment } from '../../types/Video.ts';
import { CommentForm } from './CommentForm.tsx';
import { CommentLikes } from './CommentLikes.tsx';
import { useSession } from '../../SessionContext';
import type { CommentDraft } from '../../videoLogin';
import type { Dispatch, SetStateAction } from 'react';

type CommentListProps = {
  comments: VideoComment[];
  renderAuthor?: (comment: VideoComment) => ReactNode;
  repliesByParent: Map<number, VideoComment[]>;
  parent?: VideoComment;
  renderAction?: (comment: VideoComment) => ReactNode;
};

function CommentList({ comments, repliesByParent, parent, renderAction, renderAuthor }: CommentListProps) {
  return (
    <ul className={parent ? 'video-replies' : 'video-comments'} aria-label={parent && `Respuestas a ${parent.user}`}>
      {comments.map((comment) => {
        const replies = repliesByParent.get(comment.id);
        return (
          <li key={comment.id}>
            {renderAuthor ? renderAuthor(comment) : <strong>{comment.user}</strong>}
            <p>{comment.text}</p>
            <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
            {comment.parentId === null && renderAction?.(comment)}
            {replies && (
              <CommentList
                comments={replies}
                repliesByParent={repliesByParent}
                parent={comment}
                renderAuthor={renderAuthor}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

type VideoCommentsProps = {
  videoId: number;
  comments: VideoComment[];
  renderAuthor?: (comment: VideoComment) => ReactNode;
  onPublished: (comment: VideoComment) => void;
  draft: CommentDraft;
  onDraft: Dispatch<SetStateAction<CommentDraft>>;
  onLogin: (expired?: boolean, replyTo?: number) => void;
};

export function VideoComments({
  videoId,
  comments,
  onPublished,
  renderAuthor,
  draft,
  onDraft,
  onLogin,
}: VideoCommentsProps) {
  const { user, loading } = useSession();
  const replyTo = comments.some((comment) => comment.id === draft.replyTo) ? draft.replyTo : null;
  const [announcement, setAnnouncement] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);

  function closeReply() {
    onDraft((previous) => ({ ...previous, replyTo: null, reply: '' }));
    trigger.current?.focus();
  }

  const ids = new Set(comments.map((comment) => comment.id));
  const rootComments: VideoComment[] = [];
  const repliesByParent = new Map<number, VideoComment[]>();

  for (const comment of comments) {
    const { parentId } = comment;
    if (parentId === null || !ids.has(parentId)) {
      rootComments.push(comment);
      continue;
    }
    const replies = repliesByParent.get(parentId) ?? [];
    replies.push(comment);
    repliesByParent.set(parentId, replies);
  }

  return (
    <section className="detail-section" aria-label="Comentarios">
      <h2>Comentarios ({comments.length})</h2>
      <CommentForm
        text={draft.comment}
        onText={(comment) => onDraft((previous) => ({ ...previous, comment }))}
        onLogin={onLogin}
        videoId={videoId}
        onPublished={(comment) => {
          onPublished(comment);
          setAnnouncement(`Comentario publicado por ${comment.user}.`);
        }}
      />
      {comments.length === 0 ? (
        <p className="status-message">Este vídeo todavía no tiene comentarios.</p>
      ) : (
        <CommentList
          comments={rootComments}
          renderAuthor={renderAuthor}
          repliesByParent={repliesByParent}
          renderAction={(comment) => (
            <div className="comment-actions">
              <CommentLikes videoId={videoId} commentId={comment.id} author={comment.user} onLogin={onLogin} />
              <button
                className="button button-secondary"
                type="button"
                ref={replyTo === comment.id ? trigger : undefined}
                aria-label={`Responder a ${comment.user}`}
                aria-expanded={!!user && replyTo === comment.id}
                disabled={loading || ((!!user || !!draft.reply) && replyTo !== null && replyTo !== comment.id)}
                onClick={() => {
                  if (!user) {
                    onLogin(false, comment.id);
                    return;
                  }
                  if (replyTo === comment.id) return;
                  setAnnouncement('');
                  onDraft((previous) => ({ ...previous, replyTo: comment.id, reply: '' }));
                }}
              >
                Responder
              </button>
              {user && replyTo === comment.id && (
                <CommentForm
                  text={draft.reply}
                  onText={(reply) => onDraft((previous) => ({ ...previous, reply }))}
                  onLogin={onLogin}
                  videoId={videoId}
                  parent={comment}
                  onCancel={closeReply}
                  onPublished={(reply) => {
                    onPublished(reply);
                    setAnnouncement('Respuesta publicada.');
                    closeReply();
                  }}
                />
              )}
            </div>
          )}
        />
      )}
      <span className="visually-hidden" role="status">
        {announcement}
      </span>
    </section>
  );
}
