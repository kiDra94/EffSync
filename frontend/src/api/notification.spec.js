import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchNotificationPage,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from './notification';
import { apiClient } from './httpClient';

vi.mock('./httpClient');

// M37: GET /notifications is paged; the routes are the backend's
describe('notification api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads one page with its meta', async () => {
    apiClient.get = vi.fn().mockResolvedValue({
      data: { data: [{ id: 5, text: 'x' }], meta: { page: 2, totalPages: 3 } },
    });

    await expect(fetchNotificationPage(2)).resolves.toEqual({
      notifications: [{ id: 5, notification_id: 5, text: 'x' }],
      meta: { page: 2, totalPages: 3 },
    });
    expect(apiClient.get).toHaveBeenCalledWith('/notifications', { params: { page: 2 } });
  });

  it('reads the unread count of all pages', async () => {
    apiClient.get = vi.fn().mockResolvedValue({ data: { unread_count: 7 } });

    await expect(fetchUnreadCount()).resolves.toBe(7);
    expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
  });

  // review M37: PATCH /notifications/:id doesn't exist, it was a 404
  it('marks one notification as read on its read route', async () => {
    apiClient.patch = vi.fn().mockResolvedValue({ data: { notification_id: 5, is_read: true } });

    await markNotificationAsRead(5);

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/5/read');
  });

  it('marks all as read in one call', async () => {
    apiClient.patch = vi.fn().mockResolvedValue({ data: {} });

    await markAllNotificationsAsRead();

    expect(apiClient.patch).toHaveBeenCalledWith('/notifications/mark-all-read');
  });
});
