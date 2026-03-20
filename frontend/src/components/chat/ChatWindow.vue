<script setup>
import { ref, watch, nextTick, computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useChat } from '@/composables/useChat';
import ChatMessage from './ChatMessage.vue';
import ChatInput from './ChatInput.vue';

const props = defineProps({
    roomId: { type: [String, Number], required: true },
    messages: { type: Array, default: () => [] },
    isLoading: { type: Boolean, default: false },
    typingUsers: { type: Array, default: () => [] },
});

const authStore = useAuthStore();
const { editMessage, deleteMessage, sendTyping, isConnected } = useChat();

const messagesContainer = ref(null);

onMounted(async () => {
    if (!authStore.userId) {
        await authStore.loadUser();
    }
});

const currentUserId = computed(() => Number(authStore.userId));

const othersTyping = computed(() =>
    props.typingUsers.filter(u => u.userId !== currentUserId.value)
);

const typingLabel = computed(() => {
    if (othersTyping.value.length === 0) return null;
    const names = othersTyping.value.map(u => u.username).join(', ');
    return `${names} tippt...`;
});

const scrollToBottom = async () => {
    await nextTick();
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
};

watch(() => props.messages.length, scrollToBottom);
watch(() => props.roomId, scrollToBottom);

const handleTyping = () => {
    sendTyping(props.roomId);
};

const handleEdit = (messageId, newText) => {
    editMessage(messageId, newText);
};

const handleDelete = (messageId) => {
    deleteMessage(messageId);
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
            <div v-if="isLoading" class="chat-window__state">
                Nachrichten laden...
            </div>

            <div v-else-if="messages.length === 0" class="chat-window__state">
                Noch keine Nachrichten. Schreib die erste!
            </div>

            <ChatMessage v-for="msg in messages" :key="msg.message_id ?? msg.id" :message="msg"
                :is-own="Number(msg.user_id ?? msg.senderId) === Number(authStore.userId)" @delete="handleDelete" />
        </div>

        <div v-if="typingLabel" class="chat-window__typing">
            <span class="typing-dots">
                <span></span><span></span><span></span>
            </span>
            {{ typingLabel }}
        </div>

        <ChatInput :is-connected="isConnected" :room-id="roomId" @typing="handleTyping" />
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

.chat-window__state {
    text-align: center;
    color: #9ca3af;
    font-size: 0.9rem;
    margin: auto;
}

/* Typing Indikator */
.chat-window__typing {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 20px 8px;
    font-size: 0.8rem;
    color: #6b7280;
    min-height: 28px;
}

.typing-dots {
    display: flex;
    gap: 3px;
    align-items: center;
}

.typing-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #9ca3af;
    animation: typing-bounce 1.2s infinite ease-in-out;
}

.typing-dots span:nth-child(1) {
    animation-delay: 0s;
}

.typing-dots span:nth-child(2) {
    animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
    animation-delay: 0.4s;
}

@keyframes typing-bounce {

    0%,
    80%,
    100% {
        transform: translateY(0);
        opacity: 0.4;
    }

    40% {
        transform: translateY(-5px);
        opacity: 1;
    }
}

:global(body.dark-mode) .chat-window__header {
    border-bottom-color: #444;
}

:global(body.dark-mode) .chat-window__typing {
    color: #9ca3af;
}

:global(body.dark-mode) .typing-dots span {
    background-color: #6b7280;
}
</style>
