<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchMetrics } from '@/api/metrics';

const router = useRouter();
const metrics = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await fetchMetrics('task-progress');
    metrics.value = data;
  } catch (error) {
    console.error('Fehler beim Laden der Fortschrittsmetriken:', error);
  } finally {
    loading.value = false;
  }
});

const getProgressColor = (value) => {
  if (value >= 80) return '#2ecc71'; // Green
  if (value >= 60) return '#f39c12'; // Orange
  if (value >= 40) return '#e74c3c'; // Red
  return '#c0392b'; // Dark Red
};

const goToTasks = () => {
  router.push({ name: 'TaskList' });
};
</script>

<template>
  <div class="progress-container">
    <h3>⚡ Fortschrittsmetriken</h3>
    
    <div v-if="loading" class="loading">Lädt...</div>
    
    <div v-else-if="metrics" class="metrics-grid" @click="goToTasks">
      <!-- Completion Rate -->
      <div class="metric-item clickable">
        <div class="metric-label">Abschlussquote</div>
        <div class="progress-bar-container">
          <div 
            class="progress-bar" 
            :style="{ width: metrics.completionRate + '%', backgroundColor: getProgressColor(metrics.completionRate) }"
          ></div>
        </div>
        <div class="metric-value">{{ metrics.completedTasks }} / {{ metrics.totalTasks }} ({{ metrics.completionRate }}%)</div>
      </div>

      <!-- Average Progress -->
      <div class="metric-item clickable">
        <div class="metric-label">Durchschnittlicher Fortschritt</div>
        <div class="progress-bar-container">
          <div 
            class="progress-bar" 
            :style="{ width: metrics.averageProgress + '%', backgroundColor: getProgressColor(metrics.averageProgress) }"
          ></div>
        </div>
        <div class="metric-value">{{ metrics.averageProgress }}%</div>
      </div>

      <!-- Overdue Tasks -->
      <div class="metric-item clickable">
        <div class="metric-label">Überfällige Aufgaben</div>
        <div class="metric-stat-box overdue">
          <span class="stat-number">{{ metrics.overtasks }}</span>
          <span class="stat-label">{{ metrics.percentageOverdue }}% der Gesamtaufgaben</span>
        </div>
      </div>

      <!-- Total Tasks -->
      <div class="metric-item clickable">
        <div class="metric-label">Gesamtaufgaben</div>
        <div class="metric-stat-box">
          <span class="stat-number">{{ metrics.totalTasks }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.progress-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.progress-container h3 {
  margin: 0 0 20px 0;
  color: #23234c;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.metric-item {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.metric-item.clickable {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.metric-item.clickable:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.metric-label {
  font-size: 0.9rem;
  color: #666;
  font-weight: 600;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metric-value {
  font-size: 0.85rem;
  color: #555;
  font-weight: 500;
}

.metric-stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.metric-stat-box.overdue {
  border-left-color: #e74c3c;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #23234c;
}

.stat-label {
  font-size: 0.8rem;
  color: #888;
  text-align: center;
  margin-top: 5px;
}

.loading {
  text-align: center;
  color: #666;
  padding: 40px;
}

:global(body.dark-mode) .progress-container {
  background: #2c2c3e;
  border: 1px solid #444;
  box-shadow: none;
}

:global(body.dark-mode) .progress-container h3 {
  color: #ffffff;
}

:global(body.dark-mode) .metric-item {
  background: #34354a;
}

:global(body.dark-mode) .metric-item.clickable:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

:global(body.dark-mode) .metric-label {
  color: #c8ceda;
}

:global(body.dark-mode) .progress-bar-container {
  background: #4a4d62;
}

:global(body.dark-mode) .metric-value,
:global(body.dark-mode) .loading {
  color: #c0c6d4;
}

:global(body.dark-mode) .metric-item,
:global(body.dark-mode) .metric-item * {
  color: inherit;
}

:global(body.dark-mode) .metric-stat-box {
  background: #2c2c3e;
}

:global(body.dark-mode) .stat-number {
  color: #ffffff;
}

:global(body.dark-mode) .stat-label {
  color: #aeb4c2;
}
</style>
