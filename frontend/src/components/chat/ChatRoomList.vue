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
}

.room-list__header h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: #1f2937;
}

.room-list__state {
    padding: 24px 20px;
    text-align: center;
    color: #9ca3af;
    font-size: 0.9rem;
}

:global(body.dark-mode) .room-list__header {
    border-bottom-color: #444;
}

:global(body.dark-mode) .room-list__header h2 {
    color: #ddd;
}
</style>
