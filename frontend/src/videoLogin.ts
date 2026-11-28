export type CommentDraft = { comment: string; replyTo: number | null; reply: string };
export const emptyCommentDraft: CommentDraft = { comment: '', replyTo: null, reply: '' };

export type VideoReturn = { videoId: number; origin: string; draft: CommentDraft; expired: boolean };

export function requestVideoLogin(videoId: number, draft: CommentDraft, expired = false) {
  const origin = window.location.hash;
  if (origin === '#login' || origin === '#register') return;
  window.history.replaceState({ videoId }, '');
  window.location.hash = '#login';
  window.history.replaceState({ videoReturn: { videoId, origin, draft, expired } }, '');
}
