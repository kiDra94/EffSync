<script setup>
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { useSocket } from '@/stores/useSocket'

const props = defineProps({
    room: { type: Object, required: true },
    isActive: { type: Boolean, default: false },
});

const emit = defineEmits(['click']);

const authStore = useAuthStore();

onMounted(async () => {
    if (!authStore.userId) {
        await authStore.loadUser();
    }
});

const { socket_emit } = useSocket();

const isOwner = computed(() => {
    return Number(props.room.created_by) === Number(authStore.userId);
})

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

const handleDeleteRoom = (event) => {
    event.stopPropagation();
    if (!isOwner.value) return;
    if (confirm("Chatroom wirklich löschen?")) {
        socket_emit("delete:room", { roomId: props.room.room_id ?? props.room.id });
    }
}
</script>

<template>
    <div class="room-item" :class="{ 'room-item--active': isActive }">
        <span class="room-item__icon">{{ roomIcon }}</span>
        <div class="room-item__info">
            <span class="room-item__name">{{ roomName }}</span>
            <span class="room-item__type">{{ roomType }}</span>
        </div>
        <button class="room-item__add-btn" :class="{ 'room-item__add-btn--disabled': !isOwner }"
            :title="isOwner ? 'Raum löschen' : 'Nur der Ersteller kann löschen'" @click="handleDeleteRoom">
            🗑️
        </button>
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

.room-item__add-btn {
    margin-left: auto;
    flex-shrink: 0;
    width: 24px;
    height: 16px;
    border: none;
    border-radius: 50%;
    background-color: transparent;
    color: #6b7280;
    font-size: 1.5rem;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: end;
    justify-content: center;
    align-self: center;
    transition: background 0.15s, color 0.15s;
}

.room-item__add-btn:hover {
    background-color: #e5e7eb;
    color: #4f46e5;
}

.room-item__add-btn--disabled {
    opacity: 0.2;
    cursor: not-allowed;
    pointer-events: none;
}

:global(body.dark-mode) .room-item__add-btn:hover {
    background-color: #4b4b6b;
    color: #818cf8;
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
