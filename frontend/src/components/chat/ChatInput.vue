<script setup>
import { ref } from 'vue';
import { useChat } from '@/composables/useChat';
import { useChatStore } from '@/stores/chatStore';

const props = defineProps({
    roomId:      { type: [String, Number], required: true  },
    isConnected: { type: Boolean,          default: false  },
});

const emit = defineEmits(['typing']);

const chatStore = useChatStore();
const { sendMessage } = useChat();

const text = ref('');

const handleSend = () => {
    const trimmed = text.value.trim();
    if (!trimmed || !props.isConnected) return;
    sendMessage(props.roomId, trimmed);
    text.value = '';
};

const handleKeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
};

const handleInput = () => {
    emit('typing');
};
</script>

<template>
    <div class="chat-input">
        <textarea
            v-model="text"
            :disabled="!isConnected"
            :placeholder="isConnected ? 'Nachricht schreiben… (Enter zum Senden)' : 'Verbindung wird hergestellt…'"
            rows="1"
            class="chat-input__textarea"
            @keydown="handleKeydown"
            @input="handleInput"
        />
        <button
            @click="handleSend"
            :disabled="!isConnected || !text.trim()"
            class="btn-primary chat-input__btn"
        >
            Senden
        </button>
    </div>
</template>

<style scoped>
.chat-input {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 16px 20px;
    border-top: 1px solid #e5e7eb;
    background: white;
}

.chat-input__textarea {
    flex: 1;
    padding: 10px 14px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.9rem;
    resize: none;
    font-family: inherit;
    max-height: 120px;
    overflow-y: auto;
    transition: border 0.2s;
}

.chat-input__textarea:focus {
    outline: none;
    border-color: #4f46e5;
}

.chat-input__textarea:disabled {
    background: #f3f4f6;
    color: #9ca3af;
}

.chat-input__btn { padding: 10px 20px; flex-shrink: 0; }

:global(body.dark-mode) .chat-input {
    background: #2c2c3e;
    border-top-color: #444;
}

:global(body.dark-mode) .chat-input__textarea {
    background: #1e1e2f;
    border-color: #444;
    color: #ddd;
}
</style>
