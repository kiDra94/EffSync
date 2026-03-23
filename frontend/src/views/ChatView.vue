<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/stores/entities/chatStore';
import { useChat } from '@/composables/useChat';
import ChatRoomList from '@/components/chat/ChatRoomList.vue';
import ChatWindow from '@/components/chat/ChatWindow.vue';
import { useAuthStore } from '../stores/authStore';

const chatStore = useChatStore();
const { connect, joinRoom, leaveRoom } = useChat();
const authStore = useAuthStore();

onMounted(async () => {
    connect();
    await chatStore.getRooms();
});

onUnmounted(() => {
    if (chatStore.activeRoomId) {
        leaveRoom(chatStore.activeRoomId);
    }
});

const handleRoomSelect = async (roomId) => {
    if (chatStore.activeRoomId && chatStore.activeRoomId !== roomId) {
        leaveRoom(chatStore.activeRoomId);
    }
    await chatStore.selectRoom(roomId);
    await joinRoom(roomId);
};

const handleRoomCreated = async (room) => {
    const roomId = room.room_id ?? room.id;
    await chatStore.selectRoom(roomId);
    await joinRoom(roomId);
    await chatStore.loadMessages(roomId);
};

const getTypingUsers = (roomId) => {
    const typingObj = chatStore.typingUsers[roomId];
    if (!typingObj) return [];
    
    return Object.entries(typingObj).map(([userId, data]) => ({
        userId: Number(userId),
        username: data.username
    }));
};
</script>

<template>
    <div class="chat-view">
        <div class="chat-sidebar">
            <ChatRoomList :rooms="chatStore.rooms" :active-room-id="chatStore.activeRoomId"
                :is-loading="chatStore.isLoadingRooms" @select="handleRoomSelect" @created="handleRoomCreated" />
        </div>

        <div class="chat-main">
            <ChatWindow v-if="chatStore.activeRoomId" :room-id="chatStore.activeRoomId"
                :messages="chatStore.messagesByRoom[chatStore.activeRoomId] || []"
                :is-loading="chatStore.isLoadingMessages" 
                :typing-users="getTypingUsers(chatStore.activeRoomId)" />

            <div v-else class="chat-placeholder">
                <span>💬</span>
                <p>Wähle einen Chatraum aus der Liste</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.chat-view {
    display: flex;
    height: 100%;
    overflow: hidden;
}

.chat-sidebar {
    width: 280px;
    flex-shrink: 0;
    border-right: 1px solid #e5e7eb;
    overflow-y: auto;
    background: white;
}

.chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: white;
}

.chat-placeholder {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    gap: 12px;
}

.chat-placeholder span {
    font-size: 3rem;
}

.chat-placeholder p {
    font-size: 1rem;
    margin: 0;
}

:global(body.dark-mode) .chat-sidebar {
    background: #2c2c3e;
    border-right-color: #444;
}

:global(body.dark-mode) .chat-main {
    background: #1e1e2f;
}
</style>
