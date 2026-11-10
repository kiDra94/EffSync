<script setup>
import { ref } from 'vue';
import { useTaskCommentStore } from '@/stores/entities/taskCommentStore';
import { useTaskThread, authorOf, dateOf } from '@/composables/useTaskThread';

// T74, decision Q16 (M27): the teachers' grading remarks on a task; task
// members and staff read them, staff write them (the grade stays on the document)
const props = defineProps({
  taskId: { type: Number, required: true },
  canWrite: { type: Boolean, default: false },
});

const store = useTaskCommentStore();
// a 403 means the user isn't a member: the section stays hidden
const visible = ref(true);
const { items: remarks, draft, error, canSend, send } = useTaskThread({
  load: () => store.fetchGradeRemarks(props.taskId),
  add: (text) => store.addGradeRemark(props.taskId, text),
  loadError: 'Die Anmerkungen konnten nicht geladen werden.',
  saveError: 'Die Anmerkung konnte nicht gespeichert werden.',
  onForbidden: () => { visible.value = false; },
});
</script>

<template>
  <section v-if="visible" class="grade-remarks" aria-labelledby="grade-remarks-title">
    <h3 id="grade-remarks-title">🎓 Bewertungsanmerkungen</h3>
    <p v-if="error" class="remarks-error" role="alert">{{ error }}</p>
    <p v-if="!error && remarks.length === 0" class="remarks-empty">Noch keine Anmerkungen.</p>
    <ul v-else class="remark-list">
      <li v-for="remark in remarks" :key="remark.comment_id" class="remark-item">
        <div class="remark-meta">
          <strong>{{ authorOf(remark) }}</strong>
          <span class="remark-date">{{ dateOf(remark) }}</span>
        </div>
        <p class="remark-text">{{ remark.text }}</p>
      </li>
    </ul>
    <form v-if="canWrite" class="remark-form" @submit.prevent="send">
      <label for="grade-remark-input" class="visually-hidden">Bewertungsanmerkung</label>
      <textarea id="grade-remark-input" v-model="draft" rows="2" maxlength="5000"
        placeholder="Anmerkung zur Bewertung …"></textarea>
      <button type="submit" class="btn btn-primary btn-sm" :disabled="!canSend">Hinzufügen</button>
    </form>
  </section>
</template>

<style scoped>
.grade-remarks { margin-top: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
.grade-remarks h3 { font-size: 1rem; margin-bottom: 0.5rem; }
.remark-list { list-style: none; padding: 0; margin: 0 0 0.75rem; }
.remark-item { padding: 0.5rem 0.75rem; margin-bottom: 0.5rem; background: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px; }
.remark-meta { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.85rem; }
.remark-date { color: #6b7280; font-size: 0.75rem; }
.remark-text { margin: 0.25rem 0 0; white-space: pre-wrap; word-wrap: break-word; }
.remarks-empty { color: #6b7280; font-size: 0.9rem; }
.remarks-error { color: #b91c1c; font-size: 0.9rem; }
.remark-form { display: flex; gap: 0.5rem; align-items: flex-end; }
.remark-form textarea { flex: 1; resize: vertical; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>

<style>
/* not scoped (see SearchResults.vue, review M26) */
body.dark-mode .grade-remarks { border-top-color: #444; }
body.dark-mode .grade-remarks .remark-item { background: #2c2c3e; }
body.dark-mode .grade-remarks textarea { background: #2c2c3e; color: #ddd; border-color: #444; }
</style>
