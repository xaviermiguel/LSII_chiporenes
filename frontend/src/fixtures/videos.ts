import type { VideoDetail, VideoListResponse } from '../types/Video.ts';

export const videoListFixture: VideoListResponse = {
  items: [
    {
      id: 15,
      title: 'First video',
      user: 'Author',
      duration: 79,
      thumbnailUrl: '/media/0.webp',
    },
    {
      id: 28,
      title: 'Second video',
      user: 'Author 2',
      duration: 120,
      thumbnailUrl: '/media/1.webp',
    },
  ],
  page: 0,
  size: 12,
  hasNext: false,
};
export const videoDetailsFixture: VideoDetail[] = [
  {
    ...videoListFixture.items[0],
    description: 'Description first video',
    videoUrl: '/media/0.mp4',
    tags: [],
    comments: [],
  },
  {
    ...videoListFixture.items[1],
    description: 'Description second video',
    videoUrl: '/media/1.mp4',
    tags: [],
    comments: [],
  },
];
