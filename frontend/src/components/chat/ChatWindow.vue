<script setup>
import { ref, watch, nextTick, computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useSocket } from '@/stores/useSocket.js';  // ✅ DEINE useSocket
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';

const props = defineProps({
    roomId: { type: [String, Number], required: true },
    messages: { type: Array, default: () => [] },
    isLoading: { type: Boolean, default: false },
    isConnected: { type: Boolean, default: false },
});

const emit = defineEmits(['send']);

const authStore = useAuthStore();
const chatStore = useChatStore();
const { socket_emit } = useSocket();  // ✅ Nur socket_emit brauchen wir
const messagesContainer = ref(null);

const currentUserId = computed(() => authStore.userId);

const scrollToBottom = async () => {
    await nextTick();
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

watch(() => props.messages.length, scrollToBottom);
watch(() => props.roomId, scrollToBottom);

const handleSend = (content) => {
    const sent = socket_emit('message:send', { 
        roomId: props.roomId, 
        content 
    });
    // ✅ Deine socket_emit() gibt true/false zurück (connected?)
    return sent;
};

const handleEdit = async (messageId, newContent) => {
    await chatStore.editMessageAction(messageId, newContent);
};

const handleDelete = async (messageId) => {
    await chatStore.deleteMessageAction(messageId);
};
</script>

<template>
    <div class="chat-window">
        <div class="chat-window__header">
            <span class="chat-window__status" :class="{ 'chat-window__status--online': isConnected }">
                {{ isConnected ? '🟢 Verbunden' : '🔴 Getrennt' }}
            </span>
        </div>

        <div ref="messagesContainer" class="chat-window__messages">
            <div v-if="isLoading" class="chat-window__loading">Nachrichten laden...</div>

            <div v-else-if="messages.length === 0" class="chat-window__empty">
                Noch keine Nachrichten. Schreib die erste!
            </div>

            <ChatMessage
                v-for="msg in messages"
                :key="msg.message_id ?? msg.id"
                :message="msg"
                :is-own="(msg.sender_id ?? msg.senderId ?? msg.user_id) === currentUserId"
                @edit="handleEdit"
                @delete="handleDelete"
            />
        </div>

        <ChatInput :is-connected="isConnected" @send="handleSend" />
    </div>
</template>

<style scoped>
.chat-window {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

.chat-window__header {
    padding: 10px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: flex-end;
}

.chat-window__status {
    font-size: 0.8rem;
    color: #9ca3af;
}

.chat-window__status--online {
    color: #16a34a;
}

.chat-window__messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.chat-window__loading,
.chat-window__empty {
    text-align: center;
    color: #9ca3af;
    font-size: 0.9rem;
    margin: auto;
}

:global(body.dark-mode) .chat-window__header {
    border-bottom-color: #444;
}
</style>
