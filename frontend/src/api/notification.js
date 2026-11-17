import { apiClient } from '@/api/httpClient';
import { normalizeEntity, normalizeEntities } from '@/config/api.config';

const ENDPOINT = '/notifications';
const ID_KEY = 'notification_id';

// one page, newest first (M37: the API pages the list, 50 by default)
export const fetchNotificationPage = async (page = 1) => {
    const response = await apiClient.get(ENDPOINT, { params: { page } });
    const notifications = response.data?.data ?? response.data;
    return {
        notifications: normalizeEntities(notifications, ID_KEY),
        meta: response.data?.meta ?? null,
    };
};

// all of the user's unread notifications, also those beyond the loaded page
export const fetchUnreadCount = async () => {
    const response = await apiClient.get(`${ENDPOINT}/unread-count`);
    return response.data?.unread_count ?? 0;
};

export const markAllNotificationsAsRead = async () => {
    await apiClient.patch(`${ENDPOINT}/mark-all-read`);
};

// review M37: the backend's route is :id/read (PATCH :id was a 404)
export const markNotificationAsRead = async (notification_id) => {
    const response = await apiClient.patch(`${ENDPOINT}/${notification_id}/read`);
    return normalizeEntity(response.data, ID_KEY);
}

export const deleteNotification = async (notification_id) => {
    await apiClient.delete(`${ENDPOINT}/${notification_id}`);
}

