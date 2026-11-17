export type VideoSummary = {
  id: number;
  title: string;
  user: string;
  duration: number | null;
  thumbnailUrl: string;
};
export type VideoListResponse = {
  items: VideoSummary[];
  page: number;
  size: number;
  hasNext: boolean;
};
export type VideoDetail = VideoSummary & {
  ownerId: number;
  category: Category | null;
  description: string;
  videoUrl: string;
  tags: string[];
  comments: VideoComment[];
};

export type Category = { id: number; name: string };

export type VideoComment = {
  id: number;
  user: string;
  text: string;
  createdAt: string;
  parentId: number | null;
};
