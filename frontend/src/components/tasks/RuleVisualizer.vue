<template>
    <div class="rule-visualizer">
        <span v-if="rule.type === 'task'" class="task-ref" :class="taskStatusClass">
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
<script>
import { computed } from 'vue';

const props = defineProps({
    rule: { type: Object, required: true },
    tasks: { type: Array, required: true }
});

</script>