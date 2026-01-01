<template>
    <div class="controls-bar">
        <input type="text" :value="searchQuery" @input="$emit('update:searchQuery', $event.target.value)"
            placeholder="🔍 Suchen..." class="search-input" />

        <select :value="filterStatus" @change="$emit('update:filterStatus', $event.target.value)"
            class="control-select">
            <option value="all">Alle Aufgaben</option>
            <option value="TODO">📝 Zu erledigen</option>
            <option value="IN_PROGRESS">🔄 In Bearbeitung</option>
            <option value="IN_REVIEW">👀 In Review</option>
            <option value="ON_HOLD">⏸️ On Hold</option>
            <option value="COMPLETED">✅ Abgeschlossen</option>
        </select>

        <select :value="sortBy" @change="$emit('update:sortBy', $event.target.value)" class="control-select">
            <option value="date">📅 Nach Datum</option>
            <option value="title">🔤 Alphabetisch</option>
            <option value="priority">⚡ Nach Priorität</option>
        </select>
    </div>
</template>
<script setup>
defineProps({
    searchQuery: {
        type: String,
        default: ''
    },
    filterStatus: {
        type: String,
        default: 'all'
    },
    sortBy: {
        type: String,
        default: 'date'
    }
});

defineEmits(['update:searchQuery', 'update:filterStatus', 'update:sortBy']);
</script>
<style scoped>
.controls-bar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.search-input {
    flex: 2;
    min-width: 200px;
    padding: 10px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.search-input:focus {
    outline: none;
    border-color: #4f46e5;
}

.control-select {
    flex: 1;
    min-width: 140px;
    padding: 10px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    background-color: white;
    cursor: pointer;
    font-size: 1rem;
    transition: border-color 0.2s;
}

.control-select:focus {
    outline: none;
    border-color: #4f46e5;
}
</style>