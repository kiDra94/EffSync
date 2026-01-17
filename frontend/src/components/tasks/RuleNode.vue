<template>
    <div class="rule-node" :class="`type-${node.type}`">
        <div v-if="node.type === 'operator'" class="operator-node">
            <div class="operator-header">
                <select v-model="localNode.operator" @change="emitUpdate" class="operator-select">
                    <option value="AND">UND (alle müssen)</option>
                    <option value="OR">ODER (mindestens eine)</option>
                    <option value="XOR">ENTWEDER-ODER (genau eine)</option>
                    <option value="NOT">NICHT (Negation)</option>
                </select>
                <button @click="addOperand('task')" class="btn-small btn-add" title="Task hinzufügen">
                    + Task
                </button>
                <button @click="addOperand('operator')" class="btn-small btn-add" title="Gruppe hinzufügen">
                    + Gruppe
                </button>
                <button @click="$emit('remove')" class="btn-small btn-danger" title="Node löschen">
                    ×
                </button>
            </div>
            <div v-if="localNode.operands && localNode.operands.length > 0" class="operands">
                <RuleNode v-for="(operand, idx) in localNode.operands" :key="idx" :node="operand" :subtasks="subtasks"
                    @update="updateOperand(idx, $event)" @remove="removeOperand(idx)" />
            </div>
            <div v-else class="empty-operands">
                <em>Klicke auf "+ Task" oder "+ Gruppe", um Bedingungen hinzuzufügen</em>
            </div>
        </div>
        <div v-else-if="node.type === 'task'" class="task-node">
            <select v-model="localNode.task_id" @change="emitUpdate" class="task-select">
                <option :value="null">-- Task wählen --</option>
                <option v-for="task in subtasks" :key="task.task_id" :value="task.task_id">
                    {{ task.title }}
                </option>
            </select>
            <button @click="$emit('remove')" class="btn-small btn-danger" title="Task entfernen">
                ×
            </button>
        </div>
    </div>
</template>
<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
    node: { type: Object, required: true },
    subtasks: { type: Array, required: true }
});

const emit = defineEmits(['update', 'remove']);

const localNode = ref({ ...props.node });

watch(() => props.node, (newNode) => {
    localNode.value = { ...newNode };
}, { deep: true });

const addOperand = (type) => {
    if (!localNode.value.operands) {
        localNode.value.operands = [];
    }
    const newOperand = type === 'task'
        ? { type: 'task', task_id: null }
        : { type: 'operator', operator: 'AND', operands: [] };
    localNode.value.operands.push(newOperand);
    emitUpdate();
};

const updateOperand = (idx, newValue) => {
    localNode.value.operands[idx] = newValue;
    emitUpdate();
};

const removeOperand = (idx) => {
    localNode.value.operands.splice(idx, 1);
    emitUpdate();
};

const emitUpdate = () => {
    emit('update', localNode.value);
};
</script>
<style scoped>
.rule-node {
    border: 2px solid #e5e7eb;
    padding: 1rem;
    margin: 0.5rem 0;
    border-radius: 8px;
    background: white;
    transition: all 0.2s;
}

.rule-node:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.type-operator {
    background: #f9fafb;
    border-color: #3b82f6;
}

.operator-header {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
    flex-wrap: wrap;
}

.operator-select {
    flex: 1;
    min-width: 200px;
    padding: 0.5rem;
    border: 2px solid #3b82f6;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    color: #1e40af;
    background: white;
    cursor: pointer;
}

.operator-select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.operands {
    margin-left: 1.5rem;
    border-left: 3px dashed #cbd5e1;
    padding-left: 1rem;
}

.empty-operands {
    margin-left: 1.5rem;
    padding: 1rem;
    background: #fef3c7;
    border-left: 3px solid #f59e0b;
    border-radius: 4px;
    color: #92400e;
    font-size: 0.875rem;
}

.type-task {
    background: #ecfdf5;
    border-color: #10b981;
}

.task-node {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.task-select {
    flex: 1;
    padding: 0.5rem;
    border: 2px solid #10b981;
    border-radius: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #047857;
    background: white;
    cursor: pointer;
}

.task-select:focus {
    outline: none;
    border-color: #059669;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.btn-small {
    padding: 0.4rem 0.8rem;
    font-size: 0.875rem;
    font-weight: 600;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-add {
    background: #3b82f6;
    color: white;
}

.btn-add:hover {
    background: #2563eb;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
}

.btn-danger {
    background: #ef4444;
    color: white;
    font-size: 1.2rem;
    padding: 0.3rem 0.7rem;
}

.btn-danger:hover {
    background: #dc2626;
    transform: scale(1.1);
}

.btn-small:active {
    transform: translateY(0);
}
</style>