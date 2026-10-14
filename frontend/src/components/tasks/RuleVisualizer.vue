<template>
    <div class="rule-visualizer">
        <span v-if="rule.type === 'leaf'" class="task-ref" :class="taskStatusClass">
            <span class="task-status-icon">{{ taskStatusIcon }}</span>
            <span class="task-title">{{ getTaskTitle(rule.task_id) }}</span>
        </span>

        <div v-else-if="rule.type === 'operator'" class="operator-group">
            <span class="operator-label" :class="`op-${rule.operator.toLowerCase()}`">
                {{ operatorLabel(rule.operator) }}
            </span>
            <div class="operands-viz">
                <RuleVisualizer v-for="(op, idx) in rule.operands" :key="idx" :rule="op" :tasks="tasks" />
            </div>
        </div>
    </div>
</template>
<script setup>
import { computed } from 'vue';

const props = defineProps({
    rule: { type: Object, required: true },
    tasks: { type: Array, required: true }
});

const getTaskTitle = (taskId) => {
    const task = props.tasks.find(t => t.task_id === taskId);
    return task?.title || `Task #${taskId}`;
};

const getTaskStatus = (taskId) => {
    const task = props.tasks.find(t => t.task_id === taskId);
    return task?.status || 'TODO';
};

const taskStatusClass = computed(() => {
  if (props.rule.type !== 'leaf') return '';
  const status = getTaskStatus(props.rule.task_id);
  return `status-${status.toLowerCase()}`;
});

const taskStatusIcon = computed(() => {
    if (props.rule.type !== 'leaf') return '';
  const status = getTaskStatus(props.rule.task_id);
  const icons = {
    TODO: '○',
    IN_PROGRESS: '◐',
    IN_REVIEW: '◕',
    ON_HOLD: '⊗',
    COMPLETED: '✓'
  };
  return icons[status] || '○';
});

const operatorLabel = (op) => {
  const labels = {
    AND: 'UND',
    OR: 'ODER',
    XOR: 'ENTWEDER-ODER',
    NOT: 'NICHT'
  };
  return labels[op] || op;
};
</script>
<style scoped>
.rule-visualizer {
    display: inline-flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
}

.task-ref {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    border: 2px solid;
    transition: all 0.2s;
}

.task-status-icon {
    font-size: 1.1rem;
    font-weight: bold;
}

.task-title {
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-todo {
    background: #f3f4f6;
    border-color: #9ca3af;
    color: #4b5563;
}

.status-in_progress {
    background: #dbeafe;
    border-color: #3b82f6;
    color: #1e40af;
}

.status-in_review {
    background: #fef3c7;
    border-color: #f59e0b;
    color: #92400e;
}

.status-on_hold {
    background: #fee2e2;
    border-color: #ef4444;
    color: #991b1b;
}

.status-completed {
    background: #d1fae5;
    border-color: #10b981;
    color: #065f46;
}

.operator-group {
    display: inline-flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border: 2px solid #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
}

.operator-label {
    font-weight: bold;
    font-size: 0.75rem;
    text-transform: uppercase;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    text-align: center;
    white-space: nowrap;
}

.op-and {
    background: #dbeafe;
    color: #1e40af;
}

.op-or {
    background: #fef3c7;
    color: #92400e;
}

.op-xor {
    background: #e0e7ff;
    color: #4338ca;
}

.op-not {
    background: #fee2e2;
    color: #991b1b;
}

.operands-viz {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
}
</style>