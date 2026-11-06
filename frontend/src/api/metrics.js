import { apiClient as httpClient } from './httpClient';

export const fetchMetrics = async (metricType) => {
  try {
    const response = await httpClient.get(`/metrics/${metricType}`);
    return response.data;
  } catch (error) {
    console.error(`Fehler beim Abrufen der Metrik ${metricType}:`, error);
    throw error;
  }
};
