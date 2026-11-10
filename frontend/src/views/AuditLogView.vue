<script setup>
import { onMounted, reactive } from 'vue';
import { useAuditLogStore } from '@/stores/entities/auditLogStore';

// T33, UC-32 (M27): the admin's view of the activity log of all tasks; a
// deleted task appears by the text of its entry (decision Q8g)
const store = useAuditLogStore();
const filter = reactive({ action: '', from: '', to: '' });
// the pager keeps the filter last sent, not what is typed but unsent (review M27)
let applied = { ...filter };

const load = (page = 1) => store.load({ ...applied, page });
const applyFilter = () => {
  applied = { ...filter };
  return load(1);
};

const formatTime = (value) => new Date(value).toLocaleString('de-AT');
const userName = (entry) =>
  entry.users ? `${entry.users.firstname} ${entry.users.lastname}` : `#${entry.user_id}`;

onMounted(() => load(1));
</script>

<template>
  <div class="audit-log-view">
    <h1>Audit-Log</h1>
    <p class="subtitle">Wer hat wann was an welcher Aufgabe getan, gelöschte Aufgaben eingeschlossen.</p>

    <form class="audit-filter" @submit.prevent="applyFilter">
      <label>
        Aktion enthält
        <input v-model="filter.action" name="action" type="text" maxlength="200" placeholder="z. B. deleted" />
      </label>
      <label>
        Von
        <input v-model="filter.from" name="from" type="date" />
      </label>
      <label>
        Bis
        <input v-model="filter.to" name="to" type="date" />
      </label>
      <button type="submit" class="btn-primary">Filtern</button>
    </form>

    <p v-if="store.error" class="error-message" role="alert">{{ store.error }}</p>
    <p v-else-if="store.loading" class="loading">Lädt …</p>
    <template v-else>
      <table v-if="store.entries.length > 0" class="audit-table">
        <thead>
          <tr><th>Zeit</th><th>Benutzer</th><th>Aktion</th><th>Aufgabe</th></tr>
        </thead>
        <tbody>
          <tr v-for="entry in store.entries" :key="entry.log_id">
            <td>{{ formatTime(entry.timestamp) }}</td>
            <td>{{ userName(entry) }}</td>
            <td>{{ entry.action }}</td>
            <td>{{ entry.task_id ? `#${entry.task_id}` : 'gelöscht' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty">Keine Einträge.</p>

      <div v-if="store.meta.totalPages > 1" class="pager">
        <button type="button" :disabled="store.meta.page <= 1" @click="load(store.meta.page - 1)">‹ Neuere</button>
        <span>Seite {{ store.meta.page }} von {{ store.meta.totalPages }}</span>
        <button type="button" :disabled="store.meta.page >= store.meta.totalPages" @click="load(store.meta.page + 1)">Ältere ›</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.audit-log-view { padding: 24px; }
.subtitle { color: #6b7280; margin: 4px 0 16px; }
.audit-filter { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end; margin-bottom: 16px; }
.audit-filter label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
.audit-filter input { padding: 6px 8px; border: 1px solid #d1d5db; border-radius: 6px; }
.btn-primary { padding: 7px 14px; border: none; border-radius: 6px; background: #4f46e5; color: white; cursor: pointer; }
.audit-table { width: 100%; border-collapse: collapse; }
.audit-table th, .audit-table td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.9rem; }
.error-message { color: #b91c1c; }
.pager { display: flex; gap: 12px; align-items: center; margin-top: 12px; }
</style>

<style>
body.dark-mode .audit-log-view .audit-table th,
body.dark-mode .audit-log-view .audit-table td { border-bottom-color: #444; }
body.dark-mode .audit-log-view .audit-filter input { background: #2c2c3e; color: #ddd; border-color: #444; }
</style>
