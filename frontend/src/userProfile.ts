import axios from 'axios';
import { getEnv } from './utils/Env';

export const defaultAvatarPath = '/assets/avatar-default.png';

type PublicUserProfile = {
  id: number;
  displayName: string;
  description: string;
  avatarURL: string;
};

export async function getPublicProfile(id: string | number, signal?: AbortSignal) {
  const response = await axios.get<PublicUserProfile>(`${getEnv().API_BASE_URL}/users/${id}`, { signal });
  return response.data;
}

export function resolveAvatarURL(path: string) {
  const { API_BASE_URL, MEDIA_BASE_URL } = getEnv();
  const base = path.startsWith('/media/') ? MEDIA_BASE_URL : API_BASE_URL;
  return new URL(path, new URL(base, window.location.href)).href;
}
