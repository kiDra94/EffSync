<script setup>
import { ref, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { fetchMetrics } from '@/api/metrics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const chartData = ref(null);
const loading = ref(true);
const activeTab = ref('weekly');

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: { display: true, position: 'top' },
  },
  scales: {
    y: { beginAtZero: true, ticks: { stepSize: 1 } },
  },
};

const loadWeeklyData = async () => {
  try {
    const data = await fetchMetrics('weekly-trends');
    chartData.value = {
      labels: data.labels,
      datasets: [{
        label: 'Abgeschlossene Aufgaben',
        data: data.data,
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointBackgroundColor: '#2ecc71',
      }],
    };
  } catch (error) {
    console.error('Fehler:', error);
  }
};

const loadMonthlyData = async () => {
  try {
    const data = await fetchMetrics('monthly-trends');
    chartData.value = {
      labels: data.labels,
      datasets: [{
        label: 'Abgeschlossene Aufgaben',
        data: data.data,
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointBackgroundColor: '#3498db',
      }],
    };
  } catch (error) {
    console.error('Fehler:', error);
  }
};

const switchTab = async (tab) => {
  activeTab.value = tab;
  loading.value = true;
  if (tab === 'weekly') {
    await loadWeeklyData();
  } else {
    await loadMonthlyData();
  }
  loading.value = false;
};

onMounted(async () => {
  loading.value = true;
  await loadWeeklyData();
  loading.value = false;
});
</script>

<template>
  <div class="trends-container">
    <h3>📈 Trends</h3>
    <div class="tab-buttons">
      <button :class="{ 'tab-btn': true, 'active': activeTab === 'weekly' }" @click="switchTab('weekly')">Wöchentlich</button>
      <button :class="{ 'tab-btn': true, 'active': activeTab === 'monthly' }" @click="switchTab('monthly')">Monatlich</button>
    </div>
    <div v-if="loading" class="loading">Lädt...</div>
    <Line v-else-if="chartData" :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.trends-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}
.trends-container h3 {
  margin: 0 0 20px 0;
  color: #23234c;
}
.tab-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.tab-btn {
  padding: 8px 16px;
  background: #f0f0f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  color: #666;
  transition: all 0.3s ease;
}
.tab-btn:hover {
  background: #e0e0e0;
}
.tab-btn.active {
  background: #3498db;
  color: white;
}
.loading {
  text-align: center;
  color: #666;
  padding: 40px;
}
</style>
