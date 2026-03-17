<script setup>
import { onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { useSocket } from '@/stores/useSocket.js';  // ✅ DEINE useSocket
import ChatRoomList from '@/components/chat/ChatRoomList.vue';
import ChatWindow from '@/components/chat/ChatWindow.vue';

const chatStore = useChatStore();
const token = localStorage.getItem('authToken');
const { socket, connect, isConnected, disconnect, socket_on, socket_off, socket_emit } = useSocket();

onMounted(async () => {
    connect(token);
    await chatStore.getRooms();

    // ✅ Event-Listener mit deiner socket_on() registrieren
    socket_on('message:new', chatStore.addIncomingMessage);
    socket_on('message:updated', chatStore.updateMessageInStore);
    socket_on('message:deleted', ({ messageId }) => chatStore.removeMessageFromStore(messageId));
});

onUnmounted(() => {
    if (chatStore.activeRoomId) {
        socket_emit('room:leave', { roomId: chatStore.activeRoomId });
    }
    
    // ✅ Listener entfernen mit socket_off()
    socket_off('message:new');
    socket_off('message:updated');
    socket_off('message:deleted');
    
    disconnect();
});

const handleRoomSelect = async (roomId) => {
    if (chatStore.activeRoomId && chatStore.activeRoomId !== roomId) {
        socket_emit('room:leave', { roomId: chatStore.activeRoomId });
    }
    await chatStore.selectRoom(roomId);
    socket_emit('room:join', { roomId });
};
</script>

<template>
    <div class="chat-view">
        <div class="chat-sidebar">
            <ChatRoomList
                :rooms="chatStore.rooms"
                :active-room-id="chatStore.activeRoomId"
                :is-loading="chatStore.isLoadingRooms"
                @select="handleRoomSelect"
            />
        </div>

        <div class="chat-main">
            <ChatWindow
                v-if="chatStore.activeRoomId"
                :room-id="chatStore.activeRoomId"
                :messages="chatStore.messagesByRoom[chatStore.activeRoomId] || []"
                :is-loading="chatStore.isLoadingMessages"
                :is-connected="isConnected"
                @send="handleSend"
            />

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
    gap: 0;
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
