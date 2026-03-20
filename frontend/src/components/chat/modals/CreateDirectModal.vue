<script setup>
import { ref, computed, onMounted } from 'vue';
import { useChatStore } from '@/stores/entities/chatStore';
import { useChat } from '@/composables/useChat';

const emit = defineEmits(['close', 'created']);
const chatStore = useChatStore();
const { inviteToRoom } = useChat();

const searchQuery = ref('');
const isLoading = ref(false);
const error = ref('');

const allUsers = ref([]);

onMounted(async () => {
    allUsers.value = await chatStore.getUsers();
});

const filteredUsers = computed(() => {
    if (!searchQuery.value.trim()) return allUsers.value;
    const q = searchQuery.value.toLowerCase();
    return allUsers.value.filter(u =>
        u.username.toLowerCase().includes(q) ||
        u.firstname.toLowerCase().includes(q) ||
        u.lastname.toLowerCase().includes(q)
    );
});

const handleSelect = async (user) => {
    isLoading.value = true;
    error.value = '';
    try {
        const room = await chatStore.createRoom(
            { name: null, is_private: true },
            [user.user_id],
            inviteToRoom
        );
        emit('created', room);
    } catch (e) {
        error.value = 'Fehler beim Erstellen der Direktnachricht.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="modal-overlay" @click.self="emit('close')">
        <div class="modal">
            <div class="modal__header">
                <h3>Direktnachricht</h3>
                <button class="modal__close" @click="emit('close')">✕</button>
            </div>

            <div class="modal__body">
                <input v-model="searchQuery" class="modal__input" placeholder="Person suchen..." autofocus />

                <div class="modal__user-list">
                    <div v-for="u in filteredUsers" :key="u.user_id" class="modal__user-item" @click="handleSelect(u)">
                        <span class="modal__user-name">{{ u.firstname }} {{ u.lastname }}</span>
                        <span class="modal__user-username">@{{ u.username }}</span>
                    </div>
                </div>

                <p v-if="error" class="modal__error">{{ error }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal {
    background: white;
    border-radius: 12px;
    width: 380px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.modal__header {
    padding: 16px 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal__header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.modal__close {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: #9ca3af;
}

.modal__body {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    overflow-y: auto;
}

.modal__input {
    padding: 9px 12px;
    border: 1px solid #ccc;
    border-radius: 8px;
    font-size: 0.9rem;
    outline: none;
    transition: border 0.2s;
}

.modal__input:focus {
    border-color: #4f46e5;
}

.modal__user-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 300px;
    overflow-y: auto;
}

.modal__user-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
}

.modal__user-item:hover {
    background: #f3f4f6;
}

.modal__user-name {
    font-size: 0.9rem;
    font-weight: 500;
    color: #1f2937;
}

.modal__user-username {
    font-size: 0.8rem;
    color: #9ca3af;
}

.modal__error {
    color: #ef4444;
    font-size: 0.85rem;
    margin: 0;
}
</style>
