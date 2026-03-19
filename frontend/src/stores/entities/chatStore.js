import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
    fetchRooms,
    fetchMessages,
    editMessage,
    deleteMessage,
} from '@/api/chat';

export const useChatStore = defineStore('chat', () => {
    const rooms = ref([]);
    const activeRoomId = ref(null);
    const messagesByRoom = ref({});
    const isLoadingRooms = ref(false);
    const isLoadingMessages = ref(false);
    const typingUsers = ref({});

    const getRooms = async () => {
        isLoadingRooms.value = true;
        try {
            rooms.value = await fetchRooms();
        } finally {
            isLoadingRooms.value = false;
        }
    };

    const selectRoom = async (roomId) => {
        activeRoomId.value = roomId;
        if (!messagesByRoom.value[roomId]) {
            await loadMessages(roomId);
        }
    };

    const loadMessages = async (roomId) => {
        isLoadingMessages.value = true;
        try {
            messagesByRoom.value[roomId] = await fetchMessages(roomId);
        } finally {
            isLoadingMessages.value = false;
        }
    };

    const addIncomingMessage = (message) => {
        const roomId = message.room_id ?? message.roomId;
        if (!messagesByRoom.value[roomId]) {
            messagesByRoom.value[roomId] = [];
        }
        messagesByRoom.value[roomId].push(message);
    };

    const updateMessageInStore = (updatedMessage) => {
        const roomId = updatedMessage.room_id ?? updatedMessage.roomId;
        const messages = messagesByRoom.value[roomId];
        if (!messages) return;
        const idx = messages.findIndex(
            (m) => (m.message_id ?? m.id) === (updatedMessage.message_id ?? updatedMessage.id)
        );
        if (idx !== -1) messages[idx] = updatedMessage;
    };

    const removeMessageFromStore = (messageId) => {
        for (const roomId in messagesByRoom.value) {
            const messages = messagesByRoom.value[roomId];
            const idx = messages.findIndex((m) => (m.message_id ?? m.id) === messageId);
            if (idx !== -1) {
                messages.splice(idx, 1);
                break;
            }
        }
    };

    const editMessageAction = async (messageId, content) => {
        await editMessage(messageId, content);
    };

    const deleteMessageAction = async (messageId) => {
        await deleteMessage(messageId);
        removeMessageFromStore(messageId);
    };

    const setUserTyping = (roomId, userId, username) => {
        if (!typingUsers.value[roomId]) {
            typingUsers.value[roomId] = {};
        }
        if (typingUsers.value[roomId][userId]?.timeout) {
            clearTimeout(typingUsers.value[roomId][userId].timeout);
        }
        typingUsers.value[roomId][userId] = {
            username,
            timeout: setTimeout(() => {
                delete typingUsers.value[roomId][userId];
            }, 3000),
        };
    };

    return {
        rooms,
        activeRoomId,
        messagesByRoom,
        isLoadingRooms,
        isLoadingMessages,
        typingUsers,
        getRooms,
        selectRoom,
        loadMessages,
        addIncomingMessage,
        updateMessageInStore,
        removeMessageFromStore,
        editMessageAction,
        deleteMessageAction,
        setUserTyping,
    };
});
