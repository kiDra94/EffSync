import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';
import { fetchAllNotifications, markNotificationAsRead } from '@/api/notification';

let notificationSocket = null;

// Toast-Benachrichtigungen speichern (für DeadlineToast Component)
const activeToasts = ref([]);

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

    // Feature #27: Deadline & Overdue Notifications
    const deadlineNotifications = computed(() => {
        return notifications.value.filter(n => n.type === 'task_deadline');
    });

    const overdueNotifications = computed(() => {
        return notifications.value.filter(n => n.type === 'task_overdue');
    });

    const taskLockedNotifications = computed(() => {
        return notifications.value.filter(n => n.type === 'task_locked');
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

    // Feature #27: Mark all as read
    async function markAllAsRead() {
        const unread = unreadNotifications.value;
        await Promise.all(unread.map(n => markAsRead(n.notification_id || n.id)));
    }

    // Feature #27: Toast Notifications für Deadlines/Overdue
    function addToast(notification) {
        const toastId = Date.now();
        const toast = { ...notification, toastId };
        activeToasts.value.push(toast);
        
        // Auto-remove nach 5 Sekunden
        setTimeout(() => {
            activeToasts.value = activeToasts.value.filter(t => t.toastId !== toastId);
        }, 5000);
    }

    function removeToast(toastId) {
        activeToasts.value = activeToasts.value.filter(t => t.toastId !== toastId);
    }

    function initSocketListeners() {
        if (!notificationSocket) {
            const token = localStorage.getItem('authToken');
            notificationSocket = io(import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || '', {
                auth: { token },
                transports: ['websocket'],
            });
        }

        // Feature #27: Handle deadline notifications
        notificationSocket.off('notification:new').on('notification:new', (newNotification) => {
            const exists = notifications.value.some(
                n => (n.notification_id || n.id) === (newNotification.notification_id || newNotification.id)
            );
            
            if (!exists) {
                notifications.value.unshift(newNotification);
                
                // Zeige Toast für kritische Notifications
                if (newNotification.type === 'task_deadline' || newNotification.type === 'task_overdue') {
                    addToast(newNotification);
                }
            }
        });

        // Feature #27: Handle task locked events
        notificationSocket.off('task:locked').on('task:locked', (data) => {
            const notification = {
                type: 'task_locked',
                text: `🔒 Aufgabe "${data.taskTitle}" wurde automatisch gesperrt!`,
                is_read: false,
                notification_id: Date.now(),
                created_at: new Date().toISOString(),
            };
            
            notifications.value.unshift(notification);
            addToast(notification);
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
        deadlineNotifications,        // Feature #27
        overdueNotifications,         // Feature #27
        taskLockedNotifications,      // Feature #27
        activeToasts,                 // Feature #27
        fetchNotifications,
        markAsRead,
        markAllAsRead,                // Feature #27
        addToast,                     // Feature #27
        removeToast,                  // Feature #27
        initSocketListeners,
        destroySocketListeners,
    };
});