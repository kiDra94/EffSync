<script setup>
// a member's rights on the task (T99, decision I4, M38): R lists the members,
// W adds and removes them, X changes their flags; editable for an X holder
const FLAGS = [
  { bit: 4, label: 'R', title: 'Lesen' },
  { bit: 2, label: 'W', title: 'Schreiben' },
  { bit: 1, label: 'X', title: 'Ausführen' },
];

defineProps({
  member: { type: Object, required: true },
  editable: { type: Boolean, default: false },
  // a change is on its way: the next one waits
  busy: { type: Boolean, default: false },
});
// the flag's bit and the checkbox, which goes back if the change fails
const emit = defineEmits(['change']);
</script>

<template>
  <div class="member-flags">
    <span v-for="flag in FLAGS" :key="flag.bit" class="flag" :class="{ on: (member.flags & flag.bit) !== 0 }"
      :title="flag.title">{{ flag.label }}</span>
  </div>
  <div v-if="editable" class="flag-editor">
    <label v-for="flag in FLAGS" :key="flag.bit">
      <input type="checkbox" :checked="(member.flags & flag.bit) !== 0" :disabled="busy"
        :aria-label="`${member.firstname} ${member.lastname}: ${flag.title}`"
        @change="emit('change', flag.bit, $event.target)" />
      {{ flag.label }}
    </label>
  </div>
</template>

<style scoped>
.member-flags {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.flag {
  font-size: 11px;
  font-weight: 700;
  width: 18px;
  text-align: center;
  border-radius: 3px;
  background: #f3f4f6;
  color: #d1d5db;
}

.flag.on {
  background: #eef2ff;
  color: #4338ca;
}

.flag-editor {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
}
</style>
