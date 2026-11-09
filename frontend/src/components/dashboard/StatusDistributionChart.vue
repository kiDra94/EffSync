<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { Doughnut } from 'vue-chartjs';
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
const chartRenderKey = ref(0);
let themeObserver;

const isDarkMode = () => document.body.classList.contains('dark-mode');

onMounted(async () => {
  try {
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
            '#e74c3c', // Red for OVERDUE
          ],
          borderColor: '#fff',
          borderWidth: 2,
        },
      ],
    };

  } catch (error) {
    console.error('Fehler beim Laden der Status-Verteilung:', error);
  } finally {
    loading.value = false;
  }
});

const goToStatusTasks = (statusIndex) => {
  const statusKeys = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD', 'OVERDUE'];
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
      <Doughnut :key="chartRenderKey" :data="chartData" :options="chartOptions" />
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
</style>
