import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSocket } from './useSocket';
import { fetchAllNotifications, markNotificationAsRead } from '@/api/notifications';

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);
    const STORAGE_KEY = 'effsync_notifications';
    const { socket_on, socket_off } = useSocket();

    async function fetchNotifications() {
        try {
            const response = await fetchAllNotifications();
            notifications.value = response.data || response;
        } catch (error) {
            console.error('Fehler beim Abrufen der Benachrichtigungen:', error);
            throw error;
        }
    }
    async function markAsRead(notification_id) {
        try {
            await markNotificationAsRead(notification_id);
            const notification = notifications.value.find(n => n.notification_id === notification_id);
            if (notification) {
                notification.read = true;
            }
        } catch (error) {
            console.error('Fehler beim Markieren der Benachrichtigung als gelesen:', error);
            throw error;
        }
    }

    function initSocketListeners() {
        socket_off('notification:new');
        socket_on('notification:new', (notification) => {
            const exists = notifications.value.some(n => n.notification_id === notification.notification_id);
            if (!exists) notifications.value.unshift(notification);
        });
    }

    function destroySocketListeners() {
        socket_off('notification:new');
    }

    // Initialisierung aus localStorage
    function initFromStorage() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                notifications.value = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Fehler beim Laden von Benachrichtigungen:', error);
            notifications.value = [];
        }
    }

    // In localStorage speichern
    function saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.value));
        } catch (error) {
            console.error('Fehler beim Speichern von Benachrichtigungen:', error);
        }
    }

    // Benachrichtigung hinzufügen
    function addNotification(notification) {
        const newNotification = {
            id: Date.now(), // Einfache ID basierend auf Timestamp
            type: notification.type || 'info', // 'change', 'comment', 'urgency', 'info'
            title: notification.title || 'Benachrichtigung',
            message: notification.message || '',
            read: false,
            timestamp: new Date().toISOString(),
            relatedId: notification.relatedId || null, // Task/Dokument ID
            relatedType: notification.relatedType || null, // 'task', 'document', etc.
            actionUrl: notification.actionUrl || null,
        };
        
        notifications.value.unshift(newNotification); // Am Anfang hinzufügen (neueste zuerst)
        saveToStorage();
        return newNotification;
    }


    // Alle Benachrichtigungen als gelesen markieren
    async function markAllAsRead() {
        const unread = notifications.value.filter(n => !n.is_read);
        await Promise.all(unread.map(n => markAsRead(n.notification_id)));
    }

    // Benachrichtigung löschen
    function removeNotification(notificationId) {
        notifications.value = notifications.value.filter(n => n.id !== notificationId);
        saveToStorage();
    }

    // Alle Benachrichtigungen löschen
    function clearAll() {
        notifications.value = [];
        saveToStorage();
    }

    // Benachrichtigungen nach Typ filtern
    function getByType(type) {
        return notifications.value.filter(n => n.type === type);
    }

    // Ungelesene Benachrichtigungen
    const unreadNotifications = computed(() => {
        return notifications.value.filter(n => !n.is_read);
    });

    // Anzahl ungelesener Benachrichtigungen
    const unreadCount = computed(() => {
        return unreadNotifications.value.length;
    });

    // Sortierte Benachrichtigungen (neueste zuerst)
    const sortedNotifications = computed(() => {
        return [...notifications.value].sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
    });

    return {
        fetchNotifications,
        notifications,
        unreadNotifications,
        unreadCount,
        sortedNotifications,
        initFromStorage,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
        getByType,
        initSocketListeners,
        destroySocketListeners,
    };
});
