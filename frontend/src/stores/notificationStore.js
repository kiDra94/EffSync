import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';
import { fetchAllNotifications, markNotificationAsRead } from '@/api/notification';

let notificationSocket = null;

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);
    const isLoading = ref(false);

    const sortedNotifications = computed(() => {
        return [...notifications.value].sort((a, b) => {
            const dateA = new Date(a.created_at || a.timestamp);
            const dateB = new Date(b.created_at || b.timestamp);
            return dateB - dateA;
        });
    });

    const unreadNotifications = computed(() => {
        return notifications.value.filter(n => !n.is_read && !n.read);
    });

    const unreadCount = computed(() => {
        return unreadNotifications.value.length;
    });


    async function fetchNotifications() {
        isLoading.value = true;
        try {
            const response = await fetchAllNotifications();
            notifications.value = response.data || response || [];
        } catch (error) {
            console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
        } finally {
            isLoading.value = false;
        }
    }

    async function markAsRead(notificationId) {
        try {
            await markNotificationAsRead(notificationId);
            const notification = notifications.value.find(
                n => n.notification_id === notificationId || n.id === notificationId
            );
            if (notification) {
                notification.is_read = true;
                notification.read = true;
            }
        } catch (error) {
            console.error('Fehler beim Markieren der Benachrichtigung als gelesen:', error);
        }
    }

    async function markAllAsRead() {
        const unread = unreadNotifications.value;
        await Promise.all(unread.map(n => markAsRead(n.notification_id || n.id)));
    }

    function initSocketListeners() {
        if (!notificationSocket) {
            const token = localStorage.getItem('authToken');
            notificationSocket = io(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || '', {
                auth: { token },
                transports: ['websocket'],
            });
        }

        notificationSocket.off('notification:new').on('notification:new', (newNotification) => {
            const exists = notifications.value.some(
                n => (n.notification_id || n.id) === (newNotification.notification_id || newNotification.id)
            );
            
            if (!exists) {
                notifications.value.unshift(newNotification);
            }
        });
    }

    function destroySocketListeners() {
        if (notificationSocket) {
            notificationSocket.off('notification:new');
        }
    }

    return {
        notifications,
        isLoading,
        sortedNotifications,
        unreadNotifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        initSocketListeners,
        destroySocketListeners,
    };
});