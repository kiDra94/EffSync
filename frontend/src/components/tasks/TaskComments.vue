<script setup>
import { useTaskCommentStore } from '@/stores/entities/taskCommentStore';
import { useTaskThread, authorOf, dateOf } from '@/composables/useTaskThread';

// T09, T74, decision Q16 (M27): the task's comments; an @username in the text
// mails that user (the backend's /@(\w+)/ rule)
const props = defineProps({
  taskId: { type: Number, required: true },
});

const store = useTaskCommentStore();
const { items: comments, draft, error, canSend, send } = useTaskThread({
  load: () => store.fetchComments(props.taskId),
  add: (content) => store.addComment(props.taskId, content),
  loadError: 'Die Kommentare konnten nicht geladen werden.',
  saveError: 'Der Kommentar konnte nicht gespeichert werden.',
});

/** The text in plain and @mention parts, rendered without v-html. */
const partsOf = (content) =>
  (content || '').split(/(@\w+)/).filter(Boolean).map((text) => ({ text, mention: /^@\w+$/.test(text) }));
</script>

<template>
  <section class="task-comments" aria-labelledby="task-comments-title">
    <h3 id="task-comments-title">💬 Kommentare</h3>
    <p v-if="error" class="comments-error" role="alert">{{ error }}</p>
    <p v-if="!error && comments.length === 0" class="comments-empty">Noch keine Kommentare.</p>
    <ul v-else class="comment-list">
      <li v-for="comment in comments" :key="comment.comment_id" class="comment-item">
        <div class="comment-meta">
          <strong>{{ authorOf(comment) }}</strong>
          <span class="comment-date">{{ dateOf(comment) }}</span>
        </div>
        <p class="comment-text">
          <template v-for="(part, i) in partsOf(comment.content)" :key="i">
            <span v-if="part.mention" class="mention">{{ part.text }}</span>
            <template v-else>{{ part.text }}</template>
          </template>
        </p>
      </li>
    </ul>
    <form class="comment-form" @submit.prevent="send">
      <label for="task-comment-input" class="visually-hidden">Kommentar</label>
      <textarea id="task-comment-input" v-model="draft" rows="2" maxlength="5000"
        placeholder="Kommentar schreiben … mit @benutzername erwähnst du jemanden"></textarea>
      <button type="submit" class="btn btn-primary btn-sm" :disabled="!canSend">Senden</button>
    </form>
  </section>
</template>

<style scoped>
.task-comments { margin-top: 1.5rem; border-top: 1px solid #e5e7eb; padding-top: 1rem; }
.task-comments h3 { font-size: 1rem; margin-bottom: 0.5rem; }
.comment-list { list-style: none; padding: 0; margin: 0 0 0.75rem; max-height: 260px; overflow-y: auto; }
.comment-item { padding: 0.5rem 0; border-bottom: 1px solid #f3f4f6; }
.comment-meta { display: flex; gap: 0.5rem; align-items: baseline; font-size: 0.85rem; }
.comment-date { color: #6b7280; font-size: 0.75rem; }
.comment-text { margin: 0.25rem 0 0; white-space: pre-wrap; word-wrap: break-word; }
.mention { color: #2563eb; font-weight: 600; }
.comments-empty { color: #6b7280; font-size: 0.9rem; }
.comments-error { color: #b91c1c; font-size: 0.9rem; }
.comment-form { display: flex; gap: 0.5rem; align-items: flex-end; }
.comment-form textarea { flex: 1; resize: vertical; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>

<style>
/* not scoped (see SearchResults.vue, review M26) */
body.dark-mode .task-comments { border-top-color: #444; }
body.dark-mode .task-comments .comment-item { border-bottom-color: #3b3b54; }
body.dark-mode .task-comments .mention { color: #93c5fd; }
body.dark-mode .task-comments textarea { background: #2c2c3e; color: #ddd; border-color: #444; }
</style>
