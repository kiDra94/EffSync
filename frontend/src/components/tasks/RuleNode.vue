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