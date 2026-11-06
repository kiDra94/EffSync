<script setup>
import { ref } from 'vue';
import { useChat } from '@/composables/useChat';

const props = defineProps({
    roomId: { type: [String, Number], required: true },
    isConnected: { type: Boolean, default: false },
});

const emit = defineEmits(['typing']);

const { sendMessage } = useChat();

const text = ref('');

const handleSend = () => {
    const trimmed = text.value.trim();
    if (!trimmed) return;
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
        <textarea v-model="text"
            :placeholder="isConnected ? 'Nachricht schreiben...' : 'Verbindung wird hergestellt...'" rows="1"
            class="chat-input__textarea" @keydown="handleKeydown" @input="handleInput" />
        <button @click="handleSend" :disabled="!text.trim()" class="chat-input__btn">
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
    position: relative;
    z-index: 1;
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
    pointer-events: all;
}

.chat-input__textarea:focus {
    outline: none;
    border-color: #4f46e5;
}

.chat-input__textarea:disabled {
    background: #f3f4f6;
    color: #9ca3af;
}

.chat-input__btn {
    padding: 10px 20px;
    flex-shrink: 0;
    width: auto;
    white-space: nowrap;
    background-color: #4f46e5;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
}

.chat-input__btn:hover:not(:disabled) {
    background-color: #4338ca;
}

.chat-input__btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>

<style>
body.dark-mode .chat-input,
.app-container.dark-mode .chat-input {
    background: #25283a !important;
    border-top: 1px solid #434963 !important;
}

body.dark-mode .chat-input__textarea,
.app-container.dark-mode .chat-input__textarea {
    background: #31364d !important;
    border: 1px solid #59607d !important;
    color: #f5f7ff !important;
}

body.dark-mode .chat-input__textarea::placeholder,
.app-container.dark-mode .chat-input__textarea::placeholder {
    color: #b2b9cb !important;
}
</style>