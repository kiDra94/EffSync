<script setup>
import { ref } from 'vue';

// T43 (FA-53, M26): the global search's results, grouped by category; a
// listbox of named groups that works with the arrow keys, Enter and Escape
defineProps({
  groups: { type: Array, required: true },
  // the id the search input points at with aria-controls
  listId: { type: String, default: 'search-results' },
});
const emit = defineEmits(['select', 'close']);

const list = ref(null);
const options = () => [...(list.value?.querySelectorAll('[role="option"]') ?? [])];

/** The search input hands over with ArrowDown. */
function focusFirst() {
  options()[0]?.focus();
}

function onKeydown(event, result) {
  const all = options();
  const at = all.indexOf(event.currentTarget);
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    all[Math.min(at + 1, all.length - 1)]?.focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    all[Math.max(at - 1, 0)]?.focus();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    emit('select', result);
  } else if (event.key === 'Escape') {
    emit('close');
  }
}

defineExpose({ focusFirst });
</script>

<template>
  <div v-if="groups.length > 0" :id="listId" ref="list" class="search-results" role="listbox"
    aria-label="Suchergebnisse">
    <div v-for="group in groups" :key="group.key" class="search-group" role="group"
      :aria-labelledby="`${listId}-${group.key}`">
      <div :id="`${listId}-${group.key}`" class="search-group-label" role="presentation">{{ group.label }}</div>
      <div v-for="result in group.items" :id="`${listId}-${result.type}-${result.id}`"
        :key="`${result.type}-${result.id}`" class="search-result-item" role="option" tabindex="-1"
        aria-selected="false" @click="emit('select', result)" @keydown="onKeydown($event, result)">
        <span class="result-icon" aria-hidden="true">{{ result.icon }}</span>
        <div class="result-text">
          <span class="result-label">{{ result.label }}</span>
          <span class="result-sub">{{ result.sub }}</span>
        </div>
      </div>
      <div v-if="group.more > 0" class="search-more" role="presentation">+{{ group.more }} weitere</div>
    </div>
  </div>
</template>

<style scoped>
.search-results {
    position: absolute;
    top: 38px;
    left: 0;
    width: 100%;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    z-index: 200;
    max-height: 360px;
    overflow-y: auto;
}

.search-group + .search-group { border-top: 1px solid #eee; }

.search-group-label {
    padding: 8px 12px 4px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #6b7280;
}

.search-result-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    cursor: pointer;
    transition: background 0.2s;
}

.search-result-item:hover,
.search-result-item:focus { background: #f5f5f5; outline: none; }

.result-icon { font-size: 1.1rem; }

.result-text {
    display: flex;
    flex-direction: column;
}

.result-label { font-size: 0.9rem; color: #1f2937; }
.result-sub   { font-size: 0.75rem; color: #9ca3af; }

.search-more {
    padding: 2px 12px 8px;
    font-size: 0.75rem;
    color: #6b7280;
}
</style>

<style>
/* review M26: not scoped, because `:global(body.dark-mode) .x` in a scoped
   block compiles to a bare `body.dark-mode` rule that colours the page */
body.dark-mode .search-results {
    background: #2c2c3e;
    border-color: #444;
}
body.dark-mode .search-results .search-group + .search-group { border-top-color: #444; }
body.dark-mode .search-results .search-group-label,
body.dark-mode .search-results .search-more { color: #9ca3af; }
body.dark-mode .search-results .search-result-item:hover,
body.dark-mode .search-results .search-result-item:focus { background: #3b3b54; }
body.dark-mode .search-results .result-label { color: #ddd; }
</style>
