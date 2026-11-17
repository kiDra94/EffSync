import { defineStore } from 'pinia';
import { WS_URL } from '@/config/urls';
import { ref, computed } from 'vue';
import { io } from 'socket.io-client';
import { socketAuth, reconnectWithFreshToken } from '@/api/socketAuth';
import { fetchNotificationPage, fetchUnreadCount, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification as apiDeleteNotification } from '@/api/notification';

let notificationSocket = null;

// Stores toast notifications (for the DeadlineToast component)
const activeToasts = ref([]);

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);
    const isLoading = ref(false);
    // M37: unread notifications on the pages that aren't loaded
    const unreadOnOlderPages = ref(0);
    const loadedPage = ref(0);
    const totalPages = ref(0);
    const hasMore = computed(() => loadedPage.value < totalPages.value);
    const isUnread = (n) => !n.is_read && !n.read;
    const idOf = (n) => n.notification_id || n.id;

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
        return unreadNotifications.value.length + unreadOnOlderPages.value;
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
            const [response, unreadTotal] = await Promise.all([
                fetchNotificationPage(1),
                fetchUnreadCount().catch((error) => {
                    console.error('Fehler beim Abrufen der ungelesenen Benachrichtigungen:', error);
                    return null;
                }),
            ]);
            notifications.value = response.notifications;
            loadedPage.value = 1;
            totalPages.value = response.meta?.totalPages ?? 1;
            const unreadHere = notifications.value.filter(isUnread).length;
            unreadOnOlderPages.value = unreadTotal === null ? 0 : Math.max(0, unreadTotal - unreadHere);
        } catch (error) {
            console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
        } finally {
            isLoading.value = false;
        }
    }

    // review M37: the next older page, so all notifications stay reachable
    async function loadMore() {
        if (!hasMore.value || isLoading.value) return;
        isLoading.value = true;
        try {
            const response = await fetchNotificationPage(loadedPage.value + 1);
            const known = new Set(notifications.value.map(idOf));
            const added = response.notifications.filter(n => !known.has(idOf(n)));
            notifications.value = [...notifications.value, ...added];
            unreadOnOlderPages.value = Math.max(0, unreadOnOlderPages.value - added.filter(isUnread).length);
            loadedPage.value += 1;
            totalPages.value = response.meta?.totalPages ?? loadedPage.value;
        } catch (error) {
            console.error('Fehler beim Nachladen der Benachrichtigungen:', error);
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

    // Feature #27: Mark all as read; M37: on the server, so the older pages too
    async function markAllAsRead() {
        // Mark as read locally right away, so the counter drops to 0 immediately
        notifications.value = notifications.value.map((notification) => ({
            ...notification,
            is_read: true,
            read: true,
        }));
        unreadOnOlderPages.value = 0;

        try {
            await markAllNotificationsAsRead();
        } catch (error) {
            console.error('Fehler beim Markieren aller Benachrichtigungen als gelesen:', error);
            // On error, reload so the local state matches the DB again
            await fetchNotifications();
        }
    }

    // Remove single notification locally (mark as read)
    async function removeNotification(notificationId) {
        await markAsRead(notificationId);
        notifications.value = notifications.value.filter(
            n => (n.notification_id || n.id) !== notificationId
        );
    }

    // Permanently delete a notification via API
    async function deleteNotification(notificationId) {
        try {
            await apiDeleteNotification(notificationId);
            notifications.value = notifications.value.filter(
                n => (n.notification_id || n.id) !== notificationId
            );
        } catch (error) {
            console.error('Fehler beim Löschen der Benachrichtigung:', error);
        }
    }

    // Delete multiple notifications at once
    async function deleteNotifications(ids) {
        await Promise.all(ids.map(id => deleteNotification(id)));
    }

    // Clear all notifications (mark all as read + remove from local list)
    async function clearAll() {
        await markAllAsRead();
        notifications.value = [];
    }

    // Init from storage (kept for backwards compat, real data loads via fetchNotifications)
    function initFromStorage() {
        // No-op: data is fetched from API via fetchNotifications()
    }

    // Get notifications by type
    function getByType(type) {
        return notifications.value.filter(n => n.type === type);
    }

    // Feature #27: toast notifications for deadlines/overdue
    function addToast(notification) {
        const toastId = Date.now();
        const toast = { ...notification, toastId };
        activeToasts.value.push(toast);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            activeToasts.value = activeToasts.value.filter(t => t.toastId !== toastId);
        }, 5000);
    }

    function removeToast(toastId) {
        activeToasts.value = activeToasts.value.filter(t => t.toastId !== toastId);
    }

    function initSocketListeners() {
        if (!notificationSocket) {
            notificationSocket = io(WS_URL, {
                auth: socketAuth(),
                transports: ['websocket'],
            });
            reconnectWithFreshToken(notificationSocket);
        }

        // Feature #27: Handle deadline notifications
        notificationSocket.off('notification:new').on('notification:new', (newNotification) => {
            const exists = notifications.value.some(
                n => (n.notification_id || n.id) === (newNotification.notification_id || newNotification.id)
            );
            
            if (!exists) {
                notifications.value.unshift(newNotification);
                
                // Show a toast for critical notifications
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
        loadMore,                     // M37
        hasMore,                      // M37
        markAsRead,
        markAllAsRead,                // Feature #27
        removeNotification,
        clearAll,
        deleteNotification,
        deleteNotifications,
        initFromStorage,
        getByType,
        addToast,                     // Feature #27
        removeToast,                  // Feature #27
        initSocketListeners,
        destroySocketListeners,
    };
});