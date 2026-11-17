<script setup>
import { reactive } from 'vue';

// a teacher grades a document: grade and feedback (Definition of done: out of
// DocumentView); the page saves it
const props = defineProps({
  document: { type: Object, required: true },
  saving: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'save']);

const form = reactive({
  grade: props.document.grade || '',
  feedback: props.document.feedback || '',
});
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h2>Dokument bewerten</h2>
          <p>{{ document.name }}</p>
        </div>
        <button class="close-btn" @click="emit('close')">×</button>
      </div>

      <div class="modal-body">
        <label class="field-label" for="document-grade">Note / Bewertung</label>
        <input
          id="document-grade"
          v-model.trim="form.grade"
          class="text-input"
          maxlength="32"
          placeholder="z. B. 1, Sehr gut oder 95/100"
        />

        <label class="field-label" for="document-feedback">Feedback</label>
        <textarea
          id="document-feedback"
          v-model.trim="form.feedback"
          class="text-area"
          rows="6"
          maxlength="2000"
          placeholder="Optionales Feedback für den Schüler"
        />

        <p class="modal-hint">
          Nach dem Speichern erhält der Schüler automatisch eine Benachrichtigung.
        </p>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" @click="emit('close')">Abbrechen</button>
        <button class="btn-primary" :disabled="saving" @click="emit('save', { ...form })">
          {{ saving ? 'Speichert…' : 'Bewertung speichern' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* with the page's button and field styles it uses (scoped styles don't
   reach into a child component) */
.btn-primary,
.btn-secondary {
  border: none;
  border-radius: 10px;
  padding: 11px 18px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease, opacity 0.15s ease;
}

.btn-primary {
  background: #4f46e5;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled),
.btn-secondary:hover {
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.btn-secondary {
  background: #e2e8f0;
  color: #1e293b;
}

.text-input,
.text-area {
  width: 100%;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 10px 12px;
  font: inherit;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.55);
  padding: 20px;
  z-index: 1100;
}

.modal-card {
  width: min(100%, 620px);
  background: #ffffff;
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
}

.modal-header,
.modal-body,
.modal-actions {
  padding: 20px 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0 0 4px;
}

.modal-header p,
.modal-hint {
  margin: 0;
  color: #64748b;
}

.field-label {
  display: block;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 8px;
}

.field-label + .text-input,
.field-label + .text-area {
  margin-bottom: 16px;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 2rem;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  .modal-card {
    background: #111827;
    color: #f9fafb;
  }

  .modal-header {
    border-color: #374151;
  }

  .modal-header p,
  .modal-hint {
    color: #9ca3af;
  }

  .text-input,
  .text-area {
    background: #0f172a;
    color: #f9fafb;
    border-color: #475569;
  }

  .btn-secondary {
    background: #334155;
    color: #f8fafc;
  }
}
</style>
