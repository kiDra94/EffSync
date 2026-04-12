<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskStore } from '@/stores/entities/taskStore';
import StatusDistributionChart from '@/components/dashboard/StatusDistributionChart.vue';
import TaskProgressChart from '@/components/dashboard/TaskProgressChart.vue';

const router = useRouter();
const taskStore = useTaskStore();

// Schnelle Notiz
const quickNote = ref('');
const noteInput = ref('');

const addQuickNote = () => {
  if (noteInput.value.trim()) {
    quickNote.value = noteInput.value;
    // Speichern in Notes
    const notes = JSON.parse(localStorage.getItem('effsync_notes') || '[]');
    const newNote = {
      id: Date.now(),
      title: 'Schnelle Notiz vom Dashboard',
      content: noteInput.value,
      created_at: new Date().toISOString()
    };
    notes.unshift(newNote);
    localStorage.setItem('effsync_notes', JSON.stringify(notes));
    noteInput.value = '';
    window.dispatchEvent(new Event('storage'));
  }
};

// Funktion zum Abrufen der Länge aus localStorage
const getStorageCount = (key) => {
  try {
    const data = localStorage.getItem(`effsync_${key}`);
    if (!data) return 0;
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch (error) {
    console.error(`Fehler beim Lesen von effsync_${key}:`, error);
    return 0;
  }
};

// Dynamische Metriken
const metrics = ref([
  { 
    id: 1, 
    title: 'Offene Aufgaben', 
    value: '0', 
    subtext: 'Zu erledigen', 
    icon: '📋', 
    color: '#3498db',
    route: 'TaskList'
  },
  { 
    id: 2, 
    title: 'Klassen', 
    value: '0', 
    subtext: 'Verwaltung', 
    icon: '🏫', 
    color: '#e67e22',
    route: 'ClassList'
  },
  { 
    id: 3, 
    title: 'Dokumente', 
    value: '0', 
    subtext: 'Geteilt', 
    icon: '📂', 
    color: '#2ecc71',
    route: 'DocumentList'
  },
  { 
    id: 4, 
    title: 'Notizen', 
    value: '0', 
    subtext: 'Erstellt', 
    icon: '📝', 
    color: '#9b59b6',
    route: 'NoteLists'
  },
  { 
    id: 5, 
    title: 'Stundenplan', 
    value: '0', 
    subtext: 'Einträge', 
    icon: '⏰', 
    color: '#f39c12',
    route: 'Schedules'
  },
  { 
    id: 6, 
    title: 'Abteilungen', 
    value: '0', 
    subtext: 'Im System', 
    icon: '🏢', 
    color: '#1abc9c',
    route: 'DepartmentList'
  }
]);

// Funktion zum Aktualisieren der Metriken
const updateMetrics = () => {
  const counts = {
    tasks: getStorageCount('tasks'),
    classes: getStorageCount('classes'),
    documents: getStorageCount('documents'),
    notes: getStorageCount('notes'),
    schedules: getStorageCount('schedules'),
    departments: getStorageCount('departments')
  };
  
  metrics.value[0].value = String(counts.tasks);
  metrics.value[1].value = String(counts.classes);
  metrics.value[2].value = String(counts.documents);
  metrics.value[3].value = String(counts.notes);
  metrics.value[4].value = String(counts.schedules);
  metrics.value[5].value = String(counts.departments);
};

onMounted(() => {
  updateMetrics();
  // Storage Events abfangen um Live-Updates zu ermöglichen
  window.addEventListener('storage', updateMetrics);
});

const handleCardClick = (routeName) => {
  if (routeName) {
    router.push({ name: routeName });
  }
};
</script>

<template>
  <div class="dashboard-container">
    <h1 class="page-title">Willkommen zurück! 👋</h1>
    <p class="subtitle">Hier ist dein Tagesüberblick.</p>
    
    <div class="metrics-grid">
      <div 
        v-for="item in metrics" 
        :key="item.id" 
        class="metric-card"
        :class="{ 'clickable': item.route }" 
        @click="handleCardClick(item.route)"
      >
        <div class="card-icon" :style="{ backgroundColor: item.color + '20', color: item.color }">
          {{ item.icon }}
        </div>
        <div class="card-info">
          <h3>{{ item.title }}</h3>
          <div class="value">{{ item.value }}</div>
          <p class="subtext">{{ item.subtext }}</p>
        </div>
      </div>
    </div>

    <div class="content-section">
      <!-- Stundenplan -->
      <div class="placeholder-box clickable" @click="router.push({name: 'Schedules'})">
        <h3>📅 Heutiger Stundenplan</h3>
        <p style="margin-bottom: 10px; color: #666;">Deine heutigen Stunden anschauen...</p>
        <button style="background: #3498db; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
          Zum Stundenplan →
        </button>
      </div>
      
      <!-- Schnelle Notizen -->
      <div class="placeholder-box">
        <h3>⚡ Schnelle Notiz erfassen</h3>
        <input 
          v-model="noteInput"
          type="text" 
          placeholder="Notiz eingeben..."
          style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px;"
          @keyup.enter="addQuickNote"
        />
        <button 
          @click="addQuickNote"
          style="background: #2ecc71; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; width: 100%;"
        >
          Speichern in Notizen
        </button>
        <p v-if="quickNote" style="margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 6px; color: #333;">
          ✓ Gespeichert: "{{ quickNote }}"
        </p>
      </div>
    </div>

    <!-- Dashboard Metrics -->
    <div class="metrics-section">
      <StatusDistributionChart />
      <TaskProgressChart />
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  margin-bottom: 5px;
  color: #23234c; /* Standard Hell */
}

.subtitle {
  color: #666;
  margin-bottom: 30px;
}

/* --- GRID --- */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

/* --- KARTEN (Basis) --- */
.metric-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
}

.metric-card.clickable { cursor: pointer; }
.metric-card.clickable:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.card-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.card-info h3 {
  margin: 0;
  font-size: 0.9rem;
  color: #888;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.card-info .value {
  font-size: 1.8rem;
  font-weight: bold;
  color: #23234c;
  margin: 5px 0;
}

.card-info .subtext {
  margin: 0;
  font-size: 0.8rem;
  color: #aaa;
}

/* --- CONTENT SECTION --- */
.content-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 40px;
}

.placeholder-box {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  min-height: 200px;
}
.placeholder-box.clickable {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.placeholder-box.clickable:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}
.placeholder-box h3 { margin-top: 0; color: #23234c; }
.placeholder-box p { color: #666; }

/* --- METRICS SECTION --- */
.metrics-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 40px;
}

:global(body.dark-mode) .dashboard-container .page-title {
  color: #ffffff;
}

:global(body.dark-mode) .dashboard-container .subtitle {
  color: #aaaaaa;
}

:global(body.dark-mode) .dashboard-container .metric-card,
:global(body.dark-mode) .dashboard-container .placeholder-box {
  background: #2c2c3e;
  border: 1px solid #444;
  box-shadow: none;
}

:global(body.dark-mode) .dashboard-container .card-info h3 {
  color: #cccccc;
}

:global(body.dark-mode) .dashboard-container .card-info .value {
  color: #ffffff;
}

:global(body.dark-mode) .dashboard-container .card-info .subtext,
:global(body.dark-mode) .dashboard-container .placeholder-box p {
  color: #9aa0b2;
}

@media (max-width: 768px) {
  .content-section { grid-template-columns: 1fr; }
  .metrics-section { grid-template-columns: 1fr; }
}
</style>