<script setup>
// asks before a member is removed from a task (out of TaskMembersList, for
// the Definition of done's 800-line limit after M38)
defineProps({
  member: { type: Object, default: null },
});
const emit = defineEmits(['confirm', 'cancel']);
</script>

<template>
  <!-- a click beside the dialog cancels -->
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-content">
      <h3>Mitglied entfernen</h3>
      <p>
        Sind Sie sicher, dass Sie
        <strong>{{ member?.firstname }} {{ member?.lastname }}</strong>
        von dieser Task entfernen möchten?
      </p>
      <div class="modal-actions">
        <button @click.stop.prevent="emit('confirm')" class="btn-confirm btn-danger" type="button">
          Entfernen
        </button>
        <button @click.stop.prevent="emit('cancel')" class="btn-cancel" type="button">
          Abbrechen
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  cursor: default;
}

.modal-content h3 {
  margin: 0 0 12px 0;
  color: #333;
}

.modal-content p {
  margin: 0 0 20px 0;
  color: #666;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-confirm,
.btn-cancel {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm {
  background: #dc2626;
  color: white;
}

.btn-confirm:hover {
  background: #b91c1c;
}

.btn-cancel {
  background: #e5e7eb;
  color: #333;
}

.btn-cancel:hover {
  background: #d1d5db;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}
</style>
