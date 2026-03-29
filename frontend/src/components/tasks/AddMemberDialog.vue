<template>
  <div class="dialog-overlay" @click="emit('close')">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h2>👥 Mitglied hinzufügen</h2>
        <button @click="emit('close')" class="close-btn">×</button>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        ❌ {{ error }}
      </div>

      <!-- Form -->
      <div class="dialog-body">
        <div class="form-group">
          <label for="user-select">Benutzer auswählen *</label>
          <select
            v-model.number="selectedUserId"
            id="user-select"
            class="user-select"
            required
          >
            <option :value="null">-- Bitte auswählen --</option>
            <option
              v-for="user in availableUsers"
              :key="user.user_id"
              :value="user.user_id"
            >
              {{ user.firstname }} {{ user.lastname }}
              ({{ user.email }})
            </option>
          </select>
        </div>

        <!-- Selected User Preview -->
        <div v-if="selectedUser" class="user-preview">
          <div class="preview-header">Ausgewählter Benutzer:</div>
          <div class="user-info">
            <div class="user-avatar">
              {{ getInitials(selectedUser.firstname, selectedUser.lastname) }}
            </div>
            <div>
              <strong>{{ selectedUser.firstname }} {{ selectedUser.lastname }}</strong>
              <p>{{ selectedUser.email }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button
          @click="addMember"
          class="btn-primary"
          :disabled="!selectedUserId || loading"
        >
          {{ loading ? "⏳ Wird hinzugefügt..." : "✅ Hinzufügen" }}
        </button>
        <button
          @click="emit('close')"
          class="btn-secondary"
          :disabled="loading"
        >
          Abbrechen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { taskMembersApi } from '@/api/taskMembers';

const emit = defineEmits(['close', 'member-added']);
const props = defineProps({
  taskId: {
    type: Number,
    required: true
  },
  currentMembers: {
    type: Array,
    default: () => []
  },
  availableUsers: {
    type: Array,
    default: () => []
  }
});

const selectedUserId = ref(null);
const loading = ref(false);
const error = ref(null);

const selectedUser = computed(() => {
  if (!selectedUserId.value) return null;
  return props.availableUsers.find(u => u.user_id === selectedUserId.value);
});

const isMemberAlready = (userId) => {
  return props.currentMembers?.some(m => m.user_id === userId);
};

const getInitials = (firstname, lastname) => {
  return `${(firstname || 'U')[0]}${(lastname || 'S')[0]}`.toUpperCase();
};

const addMember = async () => {
  if (!selectedUserId.value) return;

  error.value = null;
  loading.value = true;

  try {
    await taskMembersApi.addTaskMember(props.taskId, {
      user_id: selectedUserId.value
    });

    emit('member-added', selectedUser.value);
  } catch (err) {
    error.value =
      err.response?.data?.message ||
      err.message ||
      'Fehler beim Hinzufügen des Mitglieds';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.dialog {
  background: white;
  border-radius: 12px;
  max-width: 450px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease;
  display: flex;
  flex-direction: column;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.dialog-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.error-message {
  margin: 0;
  padding: 12px 24px 0 24px;
  background: transparent;
  color: #d32f2f;
  font-size: 14px;
  font-weight: 500;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.user-select {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  background: white;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-select:hover {
  border-color: #bbb;
}

.user-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.user-select:disabled {
  background: #f5f5f5;
  color: #999;
  cursor: not-allowed;
}

.user-preview {
  background: #f0f4ff;
  padding: 16px;
  border-radius: 8px;
  margin-top: 16px;
  border: 1px solid #e0e7ff;
}

.preview-header {
  font-size: 12px;
  color: #667eea;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  flex-shrink: 0;
  font-size: 14px;
}

.user-info strong {
  display: block;
  color: #333;
  margin-bottom: 2px;
}

.user-info p {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #764ba2;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e8e8e8;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background: #d8d8d8;
}

.btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
