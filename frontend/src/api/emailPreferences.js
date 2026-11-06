// Email Preferences API Service
import { apiClient } from './httpClient';

export const emailPreferencesService = {
  /**
   * Hole Email-Preferences des aktuellen Benutzers
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
   * Aktualisiere Email-Preferences
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
