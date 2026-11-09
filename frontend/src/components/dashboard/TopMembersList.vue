<script setup>
import { onMounted, ref } from 'vue';
import { fetchMetrics } from '@/api/metrics';

// FA-35 (T40): the five members with the most completed tasks
const members = ref([]);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    members.value = await fetchMetrics('top-members');
  } catch {
    error.value = 'Die Rangliste konnte nicht geladen werden.';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="chart-container">
    <h3>Top 5 Mitglieder</h3>
    <div v-if="loading" class="muted">Lädt...</div>
    <p v-else-if="error" class="muted">{{ error }}</p>
    <p v-else-if="members.length === 0" class="muted">Noch keine abgeschlossenen Tasks.</p>
    <ol v-else class="member-list">
      <li v-for="(member, index) in members" :key="member.user_id" class="member">
        <span class="rank">{{ index + 1 }}</span>
        <span class="name">{{ member.firstname }} {{ member.lastname }}</span>
        <span class="count">{{ member.completed }} erledigt</span>
      </li>
    </ol>
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

.member-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.rank {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.name {
  flex: 1;
  font-weight: 600;
  color: #23234c;
}

.count {
  color: #6b7280;
  font-size: 0.9rem;
}

:global(body.dark-mode) .chart-container {
  background: #2c2c3e;
  border: 1px solid #444;
  box-shadow: none;
}

:global(body.dark-mode) h3,
:global(body.dark-mode) .name {
  color: #ffffff;
}
</style>
