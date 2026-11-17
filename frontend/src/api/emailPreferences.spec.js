import { describe, it, expect, vi, beforeEach } from 'vitest';
import { emailPreferencesService } from './emailPreferences';
import { apiClient } from './httpClient';

// The service must use the shared client (401 → logout, 429 handling, /api base URL),
// not the old api/index.js client.
vi.mock('./httpClient');

describe('emailPreferencesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getPreferences reads /email-preferences through httpClient', async () => {
    apiClient.get = vi.fn().mockResolvedValue({ data: { data: { daily_digest: true } } });

    const result = await emailPreferencesService.getPreferences();

    expect(apiClient.get).toHaveBeenCalledWith('/email-preferences');
    expect(result).toEqual({ daily_digest: true });
  });

  it('updatePreferences puts /email-preferences through httpClient', async () => {
    apiClient.put = vi.fn().mockResolvedValue({ data: { data: { daily_digest: false } } });

    const result = await emailPreferencesService.updatePreferences({ daily_digest: false });

    expect(apiClient.put).toHaveBeenCalledWith('/email-preferences', { daily_digest: false });
    expect(result).toEqual({ daily_digest: false });
  });
});
