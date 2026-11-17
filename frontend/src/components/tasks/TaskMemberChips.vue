<script setup>
// the members chosen for a new task, as chips that can be removed
// (Definition of done: out of TaskForm)
defineProps({
  members: { type: Array, required: true },
});
const emit = defineEmits(['remove']);

const initials = (firstname, lastname) => `${(firstname || 'U')[0]}${(lastname || 'S')[0]}`.toUpperCase();
</script>

<template>
  <div class="selected-members-chips">
    <div
      v-for="member in members"
      :key="member.user_id"
      class="member-chip"
      :title="`${member.firstname} ${member.lastname} (${member.email})`"
    >
      <span class="chip-avatar">{{ initials(member.firstname, member.lastname) }}</span>
      <span class="chip-name">{{ member.firstname }} {{ member.lastname }}</span>
      <button type="button" class="chip-remove" @click="emit('remove', member.user_id)" aria-label="Member entfernen">
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.selected-members-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
  padding: 12px;
  background-color: #f0f9ff;
  border: 1px dashed #0ea5e9;
  border-radius: 6px;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: white;
  border: 1px solid #0ea5e9;
  border-radius: 20px;
  padding: 6px 12px;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.member-chip:hover {
  background-color: #e0f2fe;
  box-shadow: 0 2px 4px rgba(6, 182, 212, 0.2);
}

.chip-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #0ea5e9, #06b6d4);
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.chip-name {
  color: #0c4a6e;
  font-weight: 500;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: none;
  border: none;
  color: #ef4444;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0;
  transition: all 0.2s;
  flex-shrink: 0;
}

.chip-remove:hover {
  color: #dc2626;
  transform: scale(1.2);
}
</style>
