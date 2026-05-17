import { apiClient } from '@/api/httpClient';
import { normalizeEntity, normalizeEntities } from '@/config/api.config';

const ENDPOINT = '/notifications';
const ID_KEY = 'notification_id';

export const fetchAllNotifications = async () => {
    const response = await apiClient.get(ENDPOINT);
    const notification = response.data?.data ?? response.data;
    return normalizeEntities(notification, ID_KEY);
};

export const markNotificationAsRead = async (notification_id) => {
    const response = await apiClient.patch(`${ENDPOINT}/${notification_id}`, {is_read: true});
    return normalizeEntity(response.data, ID_KEY);
}

export const deleteNotification = async (notification_id) => {
    await apiClient.delete(`${ENDPOINT}/${notification_id}`);
}

