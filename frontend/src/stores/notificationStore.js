import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useSocket } from './useSocket';

export const useNotificationStore = defineStore('notification', () => {
    const notifications = ref([]);
    const STORAGE_KEY = 'effsync_notifications';
    const { socket_on, socket_off } = useSocket;

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

    // Benachrichtigung als gelesen markieren
    function markAsRead(notificationId) {
        const notification = notifications.value.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            saveToStorage();
        }
    }

    // Alle Benachrichtigungen als gelesen markieren
    function markAllAsRead() {
        notifications.value.forEach(n => {
            n.read = true;
        });
        saveToStorage();
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
        return notifications.value.filter(n => !n.read);
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
    };
});
