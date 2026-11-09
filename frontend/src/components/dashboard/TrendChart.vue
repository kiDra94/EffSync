<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { Line } from 'vue-chartjs';
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { fetchMetrics } from '@/api/metrics';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

// FA-33 (T37, decision A4): created and completed tasks per week or month
const period = ref('week');
const chartData = ref(null);
const loading = ref(true);
const error = ref('');

// the axis and legend colors follow the dashboard's dark mode
const isDarkMode = () => document.body.classList.contains('dark-mode');
const optionsFor = (dark) => {
  const text = dark ? '#d1d5db' : '#4b5563';
  const grid = dark ? '#3a3a4e' : '#e5e7eb';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: text } } },
    scales: {
      x: { ticks: { color: text }, grid: { color: grid } },
      y: { beginAtZero: true, ticks: { precision: 0, color: text }, grid: { color: grid } },
    },
  };
};
const chartOptions = ref(optionsFor(isDarkMode()));
let themeObserver;

// only the newest request may fill the chart (review M24)
let latest = 0;

const load = async () => {
  const request = ++latest;
  loading.value = true;
  error.value = '';
  try {
    const trends = await fetchMetrics('trends', { period: period.value });
    if (request !== latest) return;
    chartData.value = {
      labels: trends.labels,
      datasets: [
        { label: 'Erstellt', data: trends.created, borderColor: '#3498db', backgroundColor: '#3498db', tension: 0.3 },
        { label: 'Abgeschlossen', data: trends.completed, borderColor: '#2ecc71', backgroundColor: '#2ecc71', tension: 0.3 },
      ],
    };
  } catch {
    if (request === latest) error.value = 'Trends konnten nicht geladen werden.';
  } finally {
    if (request === latest) loading.value = false;
  }
};

watch(period, load);
onMounted(() => {
  load();
  themeObserver = new MutationObserver(() => {
    chartOptions.value = optionsFor(isDarkMode());
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
});
onUnmounted(() => themeObserver?.disconnect());
</script>

<template>
  <div class="chart-container trend-chart">
    <div class="header-row">
      <h3>Trends</h3>
      <div class="period-switch" role="group" aria-label="Zeitraum">
        <button :class="{ active: period === 'week' }" @click="period = 'week'">Wöchentlich</button>
        <button :class="{ active: period === 'month' }" @click="period = 'month'">Monatlich</button>
      </div>
    </div>
    <div v-if="loading" class="loading">Lädt...</div>
    <p v-else-if="error" class="loading">{{ error }}</p>
    <div v-else-if="chartData" class="chart-wrapper">
      <Line :data="chartData" :options="chartOptions" />
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-row h3 {
  margin: 0;
  color: #23234c;
}

.period-switch button {
  border: 1px solid #d1d5db;
  background: #f9fafb;
  padding: 6px 12px;
  cursor: pointer;
  font-weight: 600;
}

.period-switch button:first-child {
  border-radius: 6px 0 0 6px;
}

.period-switch button:last-child {
  border-radius: 0 6px 6px 0;
}

.period-switch button.active {
  background: #4f46e5;
  border-color: #4f46e5;
  color: white;
}

.chart-wrapper {
  height: 260px;
}

.loading {
  color: #666;
}

:global(body.dark-mode) .chart-container {
  background: #2c2c3e;
  border: 1px solid #444;
  box-shadow: none;
}

:global(body.dark-mode) .header-row h3 {
  color: #ffffff;
}
</style>
