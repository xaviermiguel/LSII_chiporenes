import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { VideoComment } from '../types/Video';
import { ReplyForm } from './ReplyForm';

type CommentListProps = {
  comments: VideoComment[];
  repliesByParent: Map<number, VideoComment[]>;
  parent?: VideoComment;
  renderAction?: (comment: VideoComment) => ReactNode;
};

function CommentList({ comments, repliesByParent, parent, renderAction }: CommentListProps) {
  return (
    <ul className={parent ? 'video-replies' : 'video-comments'} aria-label={parent && `Respuestas a ${parent.user}`}>
      {comments.map((comment) => {
        const replies = repliesByParent.get(comment.id);
        return (
          <li key={comment.id}>
            <strong>{comment.user}</strong>
            <p>{comment.text}</p>
            <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
            {comment.parentId === null && renderAction?.(comment)}
            {replies && <CommentList comments={replies} repliesByParent={repliesByParent} parent={comment} />}
          </li>
        );
      })}
    </ul>
  );
}

type VideoCommentsProps = {
  videoId: number;
  comments: VideoComment[];
  onReply: (reply: VideoComment) => void;
};

export function VideoComments({ videoId, comments, onReply }: VideoCommentsProps) {
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);

  function closeReply() {
    setReplyTo(null);
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
      {comments.length === 0 ? (
        <p className="status-message">Este vídeo todavía no tiene comentarios.</p>
      ) : (
        <CommentList
          comments={rootComments}
          repliesByParent={repliesByParent}
          renderAction={(comment) => (
            <div className="comment-actions">
              <button
                className="button button-secondary"
                type="button"
                aria-label={`Responder a ${comment.user}`}
                aria-expanded={replyTo === comment.id}
                disabled={replyTo !== null && replyTo !== comment.id}
                onClick={(event) => {
                  if (replyTo === comment.id) return;
                  trigger.current = event.currentTarget;
                  setAnnouncement('');
                  setReplyTo(comment.id);
                }}
              >
                Responder
              </button>
              {replyTo === comment.id && (
                <ReplyForm
                  videoId={videoId}
                  parent={comment}
                  onCancel={closeReply}
                  onPublished={(reply) => {
                    onReply(reply);
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
