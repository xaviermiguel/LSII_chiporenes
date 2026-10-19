export type VideoSummary = {
  id: number;
  title: string;
  user: string;
  duration: number;
  thumbnailUrl: string;
};
export type VideoListResponse = {
  items: VideoSummary[];
  page: number;
  size: number;
  hasNext: boolean;
};
export type VideoDetail = VideoSummary & {
  description: string;
  videoUrl: string;
};
