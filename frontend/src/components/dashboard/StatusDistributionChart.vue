<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Colors,
} from 'chart.js';
import { fetchMetrics } from '@/api/metrics';

const router = useRouter();

ChartJS.register(ArcElement, Tooltip, Legend, Colors);

const chartData = ref(null);
const loading = ref(true);
const tasksByStatus = ref(null);
const chartRenderKey = ref(0);
let themeObserver;

const isDarkMode = () => document.body.classList.contains('dark-mode');

const statusLabels = {
  TODO: 'Offen',
  IN_PROGRESS: 'In Bearbeitung',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Abgeschlossen',
  ON_HOLD: 'In Wartestellung',
};

const statusColors = {
  TODO: '#3498db',
  IN_PROGRESS: '#f39c12',
  IN_REVIEW: '#9b59b6',
  COMPLETED: '#2ecc71',
  ON_HOLD: '#95a5a6',
};

onMounted(async () => {
  try {
    const token = localStorage.getItem('token');
    
    // Load chart data
    const data = await fetchMetrics('status-distribution');
    chartData.value = {
      labels: data.labels,
      datasets: [
        {
          label: 'Task Status',
          data: data.data,
          backgroundColor: [
            '#3498db', // Blue for TODO (Offen)
            '#f39c12', // Orange for IN_PROGRESS
            '#9b59b6', // Purple for IN_REVIEW
            '#2ecc71', // Green for COMPLETED
            '#95a5a6', // Gray for ON_HOLD
          ],
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };

    // Load tasks by status
    const response = await fetch('/api/metrics/tasks-by-status', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    tasksByStatus.value = await response.json();
  } catch (error) {
    console.error('Fehler beim Laden der Status-Verteilung:', error);
  } finally {
    loading.value = false;
  }
});

const goToStatusTasks = (statusIndex) => {
  const statusKeys = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD'];
  const statusKey = statusKeys[statusIndex];
  console.log('Navigating to status:', statusKey);
  router.push({ name: 'TaskList', query: { status: statusKey } });
};

const chartOptions = ref({
  responsive: true,
  maintainAspectRatio: true,
  onClick: (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      goToStatusTasks(index);
    }
  },
  plugins: {
    legend: {
      labels: {
        color: isDarkMode() ? '#d1d5db' : '#4b5563'
      }
    },
    tooltip: {
      backgroundColor: isDarkMode() ? '#1f2433' : '#111827',
      titleColor: '#f9fafb',
      bodyColor: '#f3f4f6',
      callbacks: {
        label: function (context) {
          return context.label + ': ' + context.parsed;
        }
      }
    }
  }
});

const closeModal = () => {
  showModal.value = false;
  selectedStatusTasks.value = null;
  selectedStatusName.value = null;
};

onMounted(() => {
  themeObserver = new MutationObserver(() => {
    chartOptions.value = {
      ...chartOptions.value,
      plugins: {
        ...chartOptions.value.plugins,
        legend: {
          ...chartOptions.value.plugins?.legend,
          labels: {
            ...chartOptions.value.plugins?.legend?.labels,
            color: isDarkMode() ? '#d1d5db' : '#4b5563'
          }
        },
        tooltip: {
          ...chartOptions.value.plugins?.tooltip,
          backgroundColor: isDarkMode() ? '#1f2433' : '#111827'
        }
      }
    };
    chartRenderKey.value += 1;
  });

  themeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });
});

onUnmounted(() => {
  themeObserver?.disconnect();
});
</script>

<template>
  <div class="chart-container">
    <div class="header-row">
      <h3>📊 Status-Verteilung</h3>
      <p class="subtitle">Klick auf ein Segment um Tasks zu sehen</p>
    </div>
    <div v-if="loading" class="loading">Lädt...</div>
    <div v-else-if="chartData" class="chart-wrapper">
      <Pie :key="chartRenderKey" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.header-row {
  margin-bottom: 20px;
}

.header-row h3 {
  margin: 0 0 8px 0;
  color: #23234c;
}

.subtitle {
  margin: 0;
  font-size: 0.85rem;
  color: #999;
  font-style: italic;
}

.chart-wrapper {
  max-width: 400px;
  margin: 0 auto;
  cursor: pointer;
}

.loading {
  text-align: center;
  color: #666;
  padding: 40px;
}

:global(body.dark-mode) .chart-container {
  background: #2c2c3e;
  border: 1px solid #444;
  box-shadow: none;
}

:global(body.dark-mode) .header-row h3 {
  color: #ffffff;
}

:global(body.dark-mode) .subtitle,
:global(body.dark-mode) .loading {
  color: #aeb4c2;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 15px;
}

.modal-header h2 {
  margin: 0;
  color: #23234c;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #23234c;
}

.tasks-modal-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.task-modal-item {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #3498db;
  transition: transform 0.2s, box-shadow 0.2s;
}

.task-modal-item:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.task-title {
  font-weight: 600;
  color: #23234c;
  margin-bottom: 12px;
  font-size: 0.95rem;
  word-break: break-word;
}

.task-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
}

.progress-info,
.deadline-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-label,
.deadline-label {
  font-weight: 500;
  color: #666;
  min-width: 80px;
}

.progress-bar-modal {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill-modal {
  height: 100%;
  background: linear-gradient(90deg, #2ecc71, #27ae60);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-value {
  font-weight: 600;
  color: #23234c;
  min-width: 40px;
  text-align: right;
}

.deadline-info {
  color: #555;
}

.no-tasks-modal {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-style: italic;
}
</style>
