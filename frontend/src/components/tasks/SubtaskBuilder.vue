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
watch(() => props.modelValue, (newValue) => {
    localSubtasks.value = [...newValue];
}, { deep: true });

const addSubtask = () => {
    localSubtasks.value.push({
        title: '',
        priority_id: 2,
        status: 'TODO',
        progress: 0
    });
    emitUpdate();
};

const removeSubtask = (idx) => {
    localSubtasks.value.splice(idx, 1);
    emitUpdate();
};

const emitUpdate = () => {
    emit('update:modelValue', localSubtasks.value);
};
</script>
<style scoped>
.subtask-builder {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
}

.builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.builder-header h4 {
    margin: 0;
    color: #374151;
    font-size: 1rem;
}

.btn-add-subtask {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-add-subtask:hover {
    background: #2563eb;
}

.empty-state {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    font-style: italic;
}

.subtasks-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.subtask-item {
    background: white;
    border-radius: 6px;
    padding: 0.75rem;
}

.subtask-input-group {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.5rem;
    align-items: center;
}

.subtask-input {
    padding: 0.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.9rem;
}

.subtask-input:focus {
    outline: none;
    border-color: #3b82f6;
}

.subtask-priority {
    padding: 0.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
}

.subtask-priority:focus {
    outline: none;
    border-color: #3b82f6;
}

.btn-remove {
    padding: 0.5rem 0.75rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-remove:hover {
    background: #dc2626;
}
</style>