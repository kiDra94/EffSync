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
    </div>
</template>
<script setup>

</script>