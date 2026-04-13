<script setup>
import ChatRoomItem from './ChatRoomItem.vue';
import CreateGroupModal from './modals/CreateGroupModal.vue';
import CreateDirectModal from './modals/CreateDirectModal.vue';
import { ref } from 'vue';

defineProps({
    rooms: { type: Array, default: () => [] },
    activeRoomId: { type: [String, Number], default: null },
    isLoading: { type: Boolean, default: false },
});

const emit = defineEmits(['select', 'created']);

const showDropdown = ref(false);
const showGroupModal = ref(false);
const showDirectModal = ref(false);

const openGroup = () => {
    showDropdown.value = false;
    showGroupModal.value = true;
};

const openDirect = () => {
    showDropdown.value = false;
    showDirectModal.value = true;
};

const onCreated = (room) => {
    showGroupModal.value = false;
    showDirectModal.value = false;
    emit('created', room);
};
</script>

<template>
    <div class="room-list">
        <div class="room-list__header">
            <h2>Chats</h2>
            <div class="room-list__actions">
                <button class="room-list__add-btn" @click="showDropdown = !showDropdown">＋</button>
                <div v-if="showDropdown" class="room-list__dropdown">
                    <button @click="openGroup">👥 Gruppe erstellen</button>
                    <button @click="openDirect">💬 Direktnachricht</button>
                </div>
            </div>
        </div>

        <div v-if="isLoading" class="room-list__state">
            Laden...
        </div>

        <div v-else-if="rooms.length === 0" class="room-list__state">
            Keine Chaträume vorhanden
        </div>

        <ChatRoomItem v-for="room in rooms" :key="room.room_id ?? room.id" :room="room"
            :is-active="(room.room_id ?? room.id) === activeRoomId" @click="emit('select', room.room_id ?? room.id)" />
        <CreateGroupModal v-if="showGroupModal" @close="showGroupModal = false" @created="onCreated" />

        <CreateDirectModal v-if="showDirectModal" @close="showDirectModal = false" @created="onCreated" />
    </div>
</template>

<style scoped>
.room-list {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.room-list__header {
    padding: 16px 20px 12px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: space-between;
    line-height: 1;
}

.room-list__header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
    line-height: 1;
}

.room-list__actions {
    position: relative;
    display: flex;
    align-items: center;
}

.room-list__add-btn {
    background: none;
    border: none;
    font-size: 1.3rem;
    cursor: pointer;
    color: #4f46e5;
    line-height: 1;
    padding: 0;
    border-radius: 6px;
    transition: background 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
}

.room-list__add-btn:hover {
    background: #ede9ff;
}

.room-list__dropdown {
    position: absolute;
    right: 0;
    left: auto;
    top: 110%;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 100;
    min-width: 190px;
    overflow: hidden;
}

.room-list__dropdown button {
    display: block;
    width: 100%;
    padding: 10px 16px;
    text-align: left;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: #1f2937;
    transition: background 0.15s;
}

.room-list__dropdown button:hover {
    background: #f3f4f6;
}

.room-list__state {
    padding: 24px 20px;
    text-align: center;
    color: #9ca3af;
    font-size: 0.9rem;
}

:global(body.dark-mode) .room-list__header     { border-bottom-color: #444; }
:global(body.dark-mode) .room-list__header h2  { color: #ddd; }
:global(body.dark-mode) .room-list__dropdown   { background: #2c2c3e; border-color: #444; }
:global(body.dark-mode) .room-list__dropdown button { color: #ddd; }
:global(body.dark-mode) .room-list__dropdown button:hover { background: #3b3b54; }
</style>

<style>
body.dark-mode .room-list,
.app-container.dark-mode .room-list {
    background: #25283a !important;
}

body.dark-mode .room-list__header,
.app-container.dark-mode .room-list__header {
    border-bottom: 1px solid #434963 !important;
}

body.dark-mode .room-list__header h2,
.app-container.dark-mode .room-list__header h2,
body.dark-mode .room-list__state,
.app-container.dark-mode .room-list__state {
    color: #dfe4f1 !important;
}

body.dark-mode .room-list__add-btn,
.app-container.dark-mode .room-list__add-btn {
    color: #9aa8ff !important;
}

body.dark-mode .room-list__add-btn:hover,
.app-container.dark-mode .room-list__add-btn:hover {
    background: #3b4060 !important;
}
</style>
