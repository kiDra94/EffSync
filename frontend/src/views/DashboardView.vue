<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Mock-Daten
const metrics = ref([
  { 
    id: 1, 
    title: 'Offene Aufgaben', 
    value: '12', 
    subtext: '3 heute fällig', 
    icon: '📋', 
    color: '#3498db',
    route: 'TaskList'
  },
  { 
    id: 2, 
    title: 'Nächster Unterricht', 
    value: '10:00', 
    subtext: 'Mathe - Raum 204', 
    icon: '🏫', 
    color: '#e67e22',
    route: 'ClassList'
  },
  { 
    id: 3, 
    title: 'Neue Dokumente', 
    value: '5', 
    subtext: 'In dieser Woche', 
    icon: '📂', 
    color: '#2ecc71',
    route: 'DocumentList'
  },
  { 
    id: 4, 
    title: 'Ungelesene Nachrichten', 
    value: '2', 
    subtext: 'Vom Sekretariat', 
    icon: '💬', 
    color: '#9b59b6',
    route: null
  }
]);

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
      <div class="placeholder-box">
        <h3>📅 Heutiger Stundenplan</h3>
        <p>Hier könnte eine Liste der heutigen Stunden stehen...</p>
      </div>
      <div class="placeholder-box">
        <h3>⚡ Schnelle Notizen</h3>
        <p>Hier könnte ein Textfeld für Notizen sein...</p>
      </div>
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
}

.placeholder-box {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  min-height: 200px;
}
.placeholder-box h3 { margin-top: 0; color: #23234c; }
.placeholder-box p { color: #666; }

@media (max-width: 768px) {
  .content-section { grid-template-columns: 1fr; }
}
</style>