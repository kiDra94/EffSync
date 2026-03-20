<script setup>
import { computed } from 'vue';
import { useAuthStore } from '@/stores/authStore';

const props = defineProps({
    room: { type: Object, required: true },
    isActive: { type: Boolean, default: false },
});

const authStore = useAuthStore();

const roomName = computed(() => {
    if (props.room.name) return props.room.name;
    const other = props.room.chat_room_users?.find(
        u => u.user_id !== Number(authStore.userId)
    );
    if (other?.users) return `${other.users.firstname} ${other.users.lastname}`;
    return 'Direktnachricht';
});

const roomType = computed(() => {
    const memberCount = props.room.chat_room_users?.length ?? 0;
    return memberCount <= 2 ? 'Direkt' : 'Gruppe';
});

const roomIcon = computed(() => {
    const memberCount = props.room.chat_room_users?.length ?? 0;
    return memberCount <= 2 ? '💬' : '👥';
});
</script>

<template>
    <div class="room-item" :class="{ 'room-item--active': isActive }">
        <span class="room-item__icon">{{ roomIcon }}</span>
        <div class="room-item__info">
            <span class="room-item__name">{{ roomName }}</span>
            <span class="room-item__type">{{ roomType}}</span>
        </div>
    </div>
</template>

<style scoped>
.room-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    cursor: pointer;
    transition: background 0.15s;
    border-left: 3px solid transparent;
}

.room-item:hover {
    background-color: #f3f4f6;
}

.room-item--active {
    background-color: #ede9ff;
    border-left-color: #4f46e5;
}

.room-item__icon {
    font-size: 1.3rem;
    flex-shrink: 0;
}

.room-item__info {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.room-item__name {
    font-size: 0.9rem;
    font-weight: 600;
    color: #1f2937;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.room-item__type {
    font-size: 0.75rem;
    color: #9ca3af;
}

:global(body.dark-mode) .room-item:hover {
    background-color: #3b3b54;
}

:global(body.dark-mode) .room-item--active {
    background-color: #312e81;
    border-left-color: #818cf8;
}

:global(body.dark-mode) .room-item__name {
    color: #ddd;
}
</style>
