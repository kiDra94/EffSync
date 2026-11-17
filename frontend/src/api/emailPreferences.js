// Email Preferences API Service
import { apiClient } from './httpClient';

export const emailPreferencesService = {
  /**
   * Returns the current user's e-mail preferences
   */
  async getPreferences() {
    try {
      const response = await apiClient.get('/email-preferences');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching email preferences:', error);
      throw error;
    }
  },

  /**
   * Updates the e-mail preferences
   */
  async updatePreferences(preferences) {
    try {
      const response = await apiClient.put('/email-preferences', preferences);
      return response.data.data;
    } catch (error) {
      console.error('Error updating email preferences:', error);
      throw error;
    }
  },
};
