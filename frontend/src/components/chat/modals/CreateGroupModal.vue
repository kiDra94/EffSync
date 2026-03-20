<script setup>
import { ref, onMounted, computed } from 'vue';
import { useChatStore } from '@/stores/entities/chatStore';

const emit = defineEmits(['close', 'created']);
const chatStore = useChatStore();

const name = ref('');
const searchQuery = ref('');
const selectedUsers = ref([]);
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

const toggleUser = (user) => {
    const idx = selectedUsers.value.findIndex(u => u.user_id === user.user_id);
    if (idx >= 0) selectedUsers.value.splice(idx, 1);
    else selectedUsers.value.push(user);
};

const isSelected = (user) => selectedUsers.value.some(u => u.user_id === user.user_id);

const handleCreate = async () => {
    if (!name.value.trim()) {
        error.value = 'Bitte einen Namen eingeben.';
        return;
    }
    isLoading.value = true;
    error.value = '';
    try {
        const room = await chatStore.createRoom({
            name: name.value.trim(),
            is_private: false,
        }, selectedUsers.value.map(u => u.user_id));
        emit('created', room);
    } catch (e) {
        console.error('createRoom Fehler:', e.response?.data ?? e.message);
        error.value = 'Fehler beim Erstellen des Raums.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
    <div class="modal-overlay" @click.self="emit('close')">
        <div class="modal">
            <div class="modal__header">
                <h3>Gruppe erstellen</h3>
                <button class="modal__close" @click="emit('close')">✕</button>
            </div>

            <div class="modal__body">
                <input v-model="name" class="modal__input" placeholder="Gruppenname..." maxlength="50" />

                <input v-model="searchQuery" class="modal__input" placeholder="Mitglieder suchen..." />

                <div v-if="selectedUsers.length" class="modal__selected">
                    <span v-for="u in selectedUsers" :key="u.user_id" class="modal__tag" @click="toggleUser(u)">
                        {{ u.username }} ✕
                    </span>
                </div>

                <div class="modal__user-list">
                    <div v-for="u in filteredUsers" :key="u.user_id" class="modal__user-item"
                        :class="{ 'modal__user-item--selected': isSelected(u) }" @click="toggleUser(u)">
                        <span class="modal__user-name">{{ u.firstname }} {{ u.lastname }}</span>
                        <span class="modal__user-username">@{{ u.username }}</span>
                    </div>
                </div>

                <p v-if="error" class="modal__error">{{ error }}</p>
            </div>

            <div class="modal__footer">
                <button class="btn-secondary" @click="emit('close')">Abbrechen</button>
                <button class="btn-primary" :disabled="isLoading" @click="handleCreate">
                    {{ isLoading ? 'Erstellen...' : 'Erstellen' }}
                </button>
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
    width: 420px;
    max-height: 80vh;
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

.modal__selected {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.modal__tag {
    background: #ede9ff;
    color: #4f46e5;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    cursor: pointer;
}

.modal__user-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
}

.modal__user-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
}

.modal__user-item:hover {
    background: #f3f4f6;
}

.modal__user-item--selected {
    background: #ede9ff;
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

.modal__footer {
    padding: 14px 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>
