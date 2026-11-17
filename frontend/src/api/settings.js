import { apiClient } from '@/api/httpClient';

// the signed-in user's settings: the theme (T68, decision Q8f, M25)
export const settingsApi = {
  getSettings() {
    return apiClient.get('/users/me/settings');
  },

  updateSettings(changes) {
    return apiClient.patch('/users/me/settings', changes);
  },
};
