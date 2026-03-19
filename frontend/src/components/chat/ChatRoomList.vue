<script setup>
import ChatRoomItem from './ChatRoomItem.vue';

defineProps({
    rooms:        { type: Array,            default: () => [] },
    activeRoomId: { type: [String, Number], default: null     },
    isLoading:    { type: Boolean,          default: false    },
});

const emit = defineEmits(['select']);
</script>

<template>
    <div class="room-list">
        <div class="room-list__header">
            <h2>Chats</h2>
        </div>

        <div v-if="isLoading" class="room-list__state">
            Laden...
        </div>

        <div v-else-if="rooms.length === 0" class="room-list__state">
            Keine Chaträume vorhanden
        </div>

        <ChatRoomItem
            v-for="room in rooms"
            :key="room.room_id ?? room.id"
            :room="room"
            :is-active="(room.room_id ?? room.id) === activeRoomId"
            @click="emit('select', room.room_id ?? room.id)"
        />
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
