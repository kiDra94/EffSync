import { apiClient } from '@/api/httpClient';

// a user's profile picture (T47, decision Q8c, M27): the path is the
// profile_picture of a user response; it needs the token (review M27)
export const fetchAvatar = async (path) => (await apiClient.get(path, { responseType: 'blob' })).data;
