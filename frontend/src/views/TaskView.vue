<script setup>
import { ref, computed } from 'vue';

// 1. MOCK DATEN (Später aus API)
const tasks = ref([
  { id: 1, title: 'Mathe Hausübung S. 12', subject: 'Mathe', dueDate: '2025-01-20', status: 'open', priority: 'high' },
  { id: 2, title: 'Englisch Vokabeln lernen', subject: 'Englisch', dueDate: '2025-01-22', status: 'open', priority: 'medium' },
  { id: 3, title: 'Diplomarbeit Einleitung schreiben', subject: 'DA', dueDate: '2025-02-01', status: 'in-progress', priority: 'high' },
  { id: 4, title: 'Turnbeutel waschen', subject: 'Sport', dueDate: '2025-01-18', status: 'done', priority: 'low' },
  { id: 5, title: 'Präsentation vorbereiten', subject: 'POS', dueDate: '2025-01-25', status: 'open', priority: 'medium' },
]);

// 2. STATE FÜR FILTER & SUCHE
const searchQuery = ref('');
const filterStatus = ref('all'); // 'all', 'open', 'done'
const sortBy = ref('date'); // 'date', 'title'

// 3. COMPUTED LOGIC (Der "Magische" Teil)
const filteredAndSortedTasks = computed(() => {
  let result = tasks.value;

  // A) Suche
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(t => t.title.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query));
  }

  // B) Filter nach Status
  if (filterStatus.value !== 'all') {
    if (filterStatus.value === 'done') {
      result = result.filter(t => t.status === 'done');
    } else {
      // 'open' zeigt alles was nicht 'done' ist
      result = result.filter(t => t.status !== 'done');
    }
  }

  // C) Sortierung
  result = [...result].sort((a, b) => {
    if (sortBy.value === 'date') {
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else if (sortBy.value === 'title') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  return result;
});

// Helper für Styling
const getPriorityColor = (prio) => {
    if (prio === 'high') return '#e74c3c';
    if (prio === 'medium') return '#f39c12';
    return '#27ae60';
}
</script>

<template>
  <div class="page-container">
    <div class="header-row">
      <h1 class="page-title">Meine Aufgaben 📝</h1>
      <button class="btn-add">+ Neue Aufgabe</button>
    </div>

    <div class="controls-bar">
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="🔍 Suchen..." 
        class="search-input"
      />
      
      <select v-model="filterStatus" class="control-select">
        <option value="all">Alle Aufgaben</option>
        <option value="open">Offen</option>
        <option value="done">Erledigt</option>
      </select>

      <select v-model="sortBy" class="control-select">
        <option value="date">📅 Nach Datum</option>
        <option value="title">🔤 Alphabetisch</option>
      </select>
    </div>

    <div class="task-list">
      <div 
        v-for="task in filteredAndSortedTasks" 
        :key="task.id" 
        class="task-card"
        :class="{ 'is-done': task.status === 'done' }"
      >
        <div class="task-left">
           <input 
             type="checkbox" 
             :checked="task.status === 'done'" 
             class="task-checkbox"
           />
        </div>

        <div class="task-content">
            <div class="task-header">
                <span class="subject-badge">{{ task.subject }}</span>
                <span class="date-badge" :style="{ color: task.status === 'done' ? '#aaa' : '#555' }">
                    📅 {{ task.dueDate }}
                </span>
            </div>
            <h3 class="task-title">{{ task.title }}</h3>
        </div>

        <div class="task-right">
            <div class="prio-dot" :style="{ backgroundColor: getPriorityColor(task.priority) }" title="Priorität"></div>
        </div>
      </div>

      <div v-if="filteredAndSortedTasks.length === 0" class="empty-state">
        <p>Keine Aufgaben gefunden 🤷‍♂️</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 0 auto;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  color: #23234c;
  margin: 0;
}

.btn-add {
  background-color: #23234c;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}
.btn-add:hover { background-color: #343458; }

/* CONTROLS */
.controls-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-input {
  flex: 2;
  min-width: 200px;
}

.control-select {
  flex: 1;
  min-width: 140px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
}

/* TASK LIST ITEMS */
.task-card {
  background: white;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 15px;
  transition: transform 0.2s, background-color 0.2s;
  border-left: 5px solid transparent;
}

.task-card:hover {
  transform: translateX(3px);
}

/* Erledigte Tasks ausgrauen */
.task-card.is-done {
  opacity: 0.6;
  background-color: #f9f9f9;
}
.task-card.is-done .task-title {
  text-decoration: line-through;
}

.task-checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.task-content {
  flex: 1;
}

.task-header {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
  margin-bottom: 4px;
}

.subject-badge {
  background-color: #eef2ff;
  color: #4f46e5;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: bold;
}

.task-title {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.prio-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.empty-state {
    text-align: center;
    color: #888;
    margin-top: 40px;
    font-size: 1.2rem;
}

/* ========================================= */
/* DARK MODE OVERRIDES                       */
/* ========================================= */

:global(body.dark-mode) .page-title { color: white !important; }

/* Controls */
:global(body.dark-mode) .control-select {
    background-color: #1e1e2f !important;
    border: 1px solid #444 !important;
    color: white !important;
}

/* Task Card */
:global(body.dark-mode) .task-card {
    background-color: #2c2c3e !important;
    color: white !important;
    border: 1px solid #444;
}

:global(body.dark-mode) .task-title {
    color: white !important;
}

:global(body.dark-mode) .subject-badge {
    background-color: #3b3b54 !important;
    color: #a5b4fc !important;
}

:global(body.dark-mode) .task-card.is-done {
    background-color: #232330 !important; /* Noch dunkler für erledigt */
    opacity: 0.5;
}

:global(body.dark-mode) .btn-add {
    background-color: #3b3b54 !important;
    border: 1px solid #555;
}
:global(body.dark-mode) .btn-add:hover {
    background-color: #4b4b6a !important;
}
</style>