<script setup>
import { ref, onMounted } from 'vue';
import { Pie } from 'vue-chartjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Colors,
} from 'chart.js';
import { fetchMetrics } from '@/api/metrics';

ChartJS.register(ArcElement, Tooltip, Legend, Colors);

const chartData = ref(null);
const loading = ref(true);

onMounted(async () => {
  try {
    const data = await fetchMetrics('status-distribution');
    chartData.value = {
      labels: data.labels,
      datasets: [
        {
          label: 'Task Status',
          data: data.data,
          backgroundColor: [
            '#3498db', // Blue for OPEN
            '#f39c12', // Orange for IN_PROGRESS
            '#2ecc71', // Green for COMPLETED
            '#95a5a6', // Gray for ON_HOLD
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
</script>

<template>
  <div class="chart-container">
    <h3>📊 Status-Verteilung</h3>
    <div v-if="loading" class="loading">Lädt...</div>
    <Pie v-else-if="chartData" :data="chartData" :options="{ responsive: true, maintainAspectRatio: true }" />
  </div>
</template>

<style scoped>
.chart-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.chart-container h3 {
  margin: 0 0 20px 0;
  color: #23234c;
}

.loading {
  text-align: center;
  color: #666;
  padding: 40px;
}
</style>
