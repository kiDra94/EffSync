import { apiClient as httpClient } from './httpClient';

export const fetchMetrics = async (metricType, params) => {
  try {
    const response = await httpClient.get(`/metrics/${metricType}`, params ? { params } : undefined);
    return response.data;
  } catch (error) {
    console.error(`Fehler beim Abrufen der Metrik ${metricType}:`, error);
    throw error;
  }
};
