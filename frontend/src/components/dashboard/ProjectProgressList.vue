<script setup>
import { onMounted, ref } from 'vue';
import { useMetricsStore } from '@/stores/metricsStore';

// M25 (decision Q19): data through the store, not the api/ layer
const metricsStore = useMetricsStore();
// FA-30 and FA-34 (T41, T39, decision Q2): the active projects (top-level
// tasks that aren't completed), each with the progress of its subtasks
const projects = ref([]);
const loading = ref(true);
const error = ref('');

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('de-AT') : null);

onMounted(async () => {
  try {
    projects.value = await metricsStore.getMetric('projects');
  } catch {
    error.value = 'Projekte konnten nicht geladen werden.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="chart-container">
    <h3>Aktive Projekte</h3>
    <div v-if="loading" class="muted">Lädt...</div>
    <p v-else-if="error" class="muted">{{ error }}</p>
    <p v-else-if="projects.length === 0" class="muted">Keine aktiven Projekte.</p>
    <ul v-else class="project-list">
      <li v-for="project in projects" :key="project.task_id" class="project">
        <div class="project-head">
          <span class="project-title">{{ project.title }}</span>
          <span class="project-meta">
            <template v-if="project.subtask_count">{{ project.subtask_count }} Subtasks · </template>
            <template v-if="formatDate(project.deadline)">fällig {{ formatDate(project.deadline) }} · </template>
            {{ project.progress }} %
          </span>
        </div>
        <div class="progress-track" role="progressbar" :aria-valuenow="project.progress" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-fill" :style="{ width: `${project.progress}%` }"></div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

h3 {
  margin: 0 0 16px 0;
  color: #23234c;
}

.muted {
  color: #666;
}

.project-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 320px;
  overflow-y: auto;
}

.project-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.project-title {
  font-weight: 600;
  color: #23234c;
}

.project-meta {
  font-size: 0.85rem;
  color: #6b7280;
  white-space: nowrap;
}

.progress-track {
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #4f46e5;
}

:global(body.dark-mode) .chart-container {
  background: #2c2c3e;
  border: 1px solid #444;
  box-shadow: none;
}

:global(body.dark-mode) h3,
:global(body.dark-mode) .project-title {
  color: #ffffff;
}
</style>
