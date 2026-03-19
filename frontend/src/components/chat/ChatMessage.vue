<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
    message: { type: Object,  required: true  },
    isOwn:   { type: Boolean, default: false  },
});

const emit = defineEmits(['edit', 'delete']);

const isEditing  = ref(false);
const editText   = ref('');

const messageId  = computed(() => props.message.message_id ?? props.message.id);
const senderName = computed(() => props.message.sender?.username ?? props.message.username ?? 'Unbekannt');
const timestamp  = computed(() => {
    const d = new Date(props.message.created_at ?? props.message.createdAt);
    return d.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
});

const startEdit = () => {
    editText.value = props.message.content ?? props.message.message ?? '';
    isEditing.value = true;
};

const cancelEdit = () => {
    isEditing.value = false;
    editText.value = '';
};

const submitEdit = () => {
    const trimmed = editText.value.trim();
    if (!trimmed) return;
    emit('edit', messageId.value, trimmed);
    isEditing.value = false;
};
</script>

<template>
    <div class="chat-msg" :class="{ 'chat-msg--own': isOwn }">
        <div class="chat-msg__bubble">
            <span v-if="!isOwn" class="chat-msg__sender">{{ senderName }}</span>

            <div v-if="isEditing" class="chat-msg__edit">
                <input
                    v-model="editText"
                    class="chat-msg__edit-input"
                    @keydown.enter.prevent="submitEdit"
                    @keydown.esc="cancelEdit"
                    autofocus
                />
                <div class="chat-msg__edit-actions">
                    <button @click="submitEdit" class="btn-primary">Speichern</button>
                    <button @click="cancelEdit" class="btn-secondary">Abbrechen</button>
                </div>
            </div>

            <p v-else class="chat-msg__text">
                {{ message.message ?? message.content }}
            </p>

            <span class="chat-msg__time">{{ timestamp }}</span>
        </div>

        <div v-if="isOwn && !isEditing" class="chat-msg__actions">
            <button @click="startEdit"                         class="chat-msg__action-btn" title="Bearbeiten">✏️</button>
            <button @click="emit('delete', messageId)"        class="chat-msg__action-btn" title="Löschen">🗑️</button>
        </div>
    </div>
</template>

<style scoped>
.chat-msg {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
}

.chat-msg--own { align-items: flex-end; }

.chat-msg__bubble {
    max-width: 70%;
    background: #f3f4f6;
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.chat-msg--own .chat-msg__bubble {
    background: #4f46e5;
    color: white;
}

.chat-msg__sender {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
}

.chat-msg__text {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
    word-break: break-word;
}

.chat-msg--own .chat-msg__text  { color: white; }
.chat-msg--own .chat-msg__time  { color: rgba(255,255,255,0.6); }

.chat-msg__time {
    font-size: 0.7rem;
    color: #9ca3af;
    align-self: flex-end;
}

.chat-msg__actions {
    display: flex;
    gap: 4px;
}

.chat-msg__action-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    padding: 2px 4px;
    border-radius: 4px;
    transition: background 0.15s;
}

.chat-msg__action-btn:hover { background: #e5e7eb; }

.chat-msg__edit-input {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-size: 0.9rem;
}

.chat-msg__edit-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
}

:global(body.dark-mode) .chat-msg__bubble         { background: #3b3b54; color: #ddd; }
:global(body.dark-mode) .chat-msg--own .chat-msg__bubble { background: #4f46e5; }
:global(body.dark-mode) .chat-msg__action-btn:hover { background: #444; }
</style>
