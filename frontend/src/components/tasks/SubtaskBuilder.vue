<template>
    <div class="subtask-builder">
        <div class="builder-header">
            <h4>Subtasks</h4>
            <button type="button" @click="addSubtask" class="btn-add-subtask">
                + Subtask hinzufügen
            </button>
        </div>
        <div v-if="localSubtasks.length === 0" class="empty-state">
            <p>Keine Subtasks definiert</p>
        </div>
        <div v-else class="subtasks-list">
            <div v-for="(subtask, idx) in localSubtasks" :key="idx" class="subtask-item">
                <div class="subtask-input-group">
                    <input v-model="subtask.title" type="text" placeholder="Subtask-Titel" class="subtask-input"
                        @input="emitUpdate" />
                    <select v-model.number="subtask.priority_id" class="subtask-priority" @change="emitUpdate">
                        <option :value="1">Niedrig</option>
                        <option :value="2">Mittel</option>
                        <option :value="3">Hoch</option>
                        <option :value="4">Dringend</option>
                    </select>
                    <button type="button" @click="removeSubtask(idx)" class="btn-remove" title="Entfernen">
                        ×
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['update:modelValue']);

const localSubtasks = ref([...props.modelValue]);
</script>