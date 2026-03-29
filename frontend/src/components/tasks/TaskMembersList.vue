<template>
  <div class="task-members-section">
    <h3 class="section-title">👥 Task-Mitglieder</h3>

    <!-- Loading State -->
    <div v-if="loading" class="loading-spinner">
      Mitglieder werden geladen...
    </div>

    <!-- Members List -->
    <div v-else-if="allMembers.length > 0" class="members-container">
      <div class="members-list">
        <div v-for="member in allMembers" :key="member.user_id" class="member-card">
          <div class="member-avatar">
            <img
              v-if="member.profile_picture"
              :src="member.profile_picture"
              :alt="`${member.firstname} ${member.lastname}`"
              class="avatar-image"
            />
            <div v-else class="avatar-placeholder">
              {{ getInitials(member.firstname, member.lastname) }}
            </div>
          </div>

          <div class="member-info">
            <p class="member-name">{{ member.firstname }} {{ member.lastname }}</p>
            <p class="member-email">{{ member.email }}</p>
            <div class="member-badges">
              <span
                v-if="isCreator(member.user_id)"
                class="badge badge-creator"
                title="Task-Creator"
              >
                👑 Creator
              </span>
              <span
                v-if="isAssignedTo(member.user_id)"
                class="badge badge-assigned"
                title="Zugewiesen"
              >
                ✓ Assigned
              </span>
            </div>
          </div>

          <!-- Remove Button (nur wenn canEditTask und nicht Creator/Assigned-to) -->
          <button
            v-if="canEditTask && !isCreator(member.user_id) && !isAssignedTo(member.user_id)"
            @click="openRemoveDialog(member)"
            class="btn-remove"
            title="Mitglied entfernen"
          >
            ✕
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p>Keine Mitglieder hinzugefügt (nur Creator und Assigned-to)</p>
    </div>

    <!-- Add Member Section (nur mit WRITE-Permission) -->
    <div v-if="canEditTask" class="add-member-section">
      <h4>Mitglied hinzufügen</h4>
      <div class="add-member-form">
        <select
          v-model="selectedUserId"
          class="member-select"
          placeholder="Benutzer wählen..."
        >
          <option value="">-- Benutzer wählen --</option>
          <option
            v-for="user in availableUsers"
            :key="user.user_id"
            :value="user.user_id"
          >
            {{ user.firstname }} {{ user.lastname }} ({{ user.email }})
          </option>
        </select>
        <button
          @click="addMember"
          :disabled="!selectedUserId || isAddingMember"
          class="btn-add"
        >
          {{ isAddingMember ? "Wird hinzugefügt..." : "+ Hinzufügen" }}
        </button>
      </div>
    </div>

    <!-- Remove Confirmation Modal -->
    <div v-if="showRemoveDialog" class="modal-overlay" @click="closeRemoveDialog">
      <div class="modal-content" @click.stop>
        <h3>Mitglied entfernen</h3>
        <p>
          Sind Sie sicher, dass Sie
          <strong>{{ memberToRemove.firstname }} {{ memberToRemove.lastname }}</strong>
          von dieser Task entfernen möchten?
        </p>
        <div class="modal-actions">
          <button @click="confirmRemove" class="btn-confirm btn-danger">
            Entfernen
          </button>
          <button @click="closeRemoveDialog" class="btn-cancel">
            Abbrechen
          </button>
        </div>
      </div>
    </div>

    <!-- Toast Notifications -->
    <div v-if="successMessage" class="toast toast-success">
      {{ successMessage }}
    </div>
    <div v-if="errorMessage" class="toast toast-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { taskMembersApi } from '@/api/taskMembers';
import { usersApi } from '@/api/usersService';

const props = defineProps({
  taskId: {
    type: Number,
    required: true
  },
  creatorId: {
    type: Number,
    required: true
  },
  assignedToId: {
    type: Number,
    default: null
  }
});

const emit = defineEmits(['members-updated']);

// State
const members = ref([]);
const allUsers = ref([]);
const selectedUserId = ref(null);
const loading = ref(false);
const isAddingMember = ref(false);
const canEditTask = ref(false);

const memberToRemove = ref(null);
const showRemoveDialog = ref(false);

const successMessage = ref('');
const errorMessage = ref('');

// Computed Properties
const allMembers = computed(() => {
  // Kombiniere user_permissions mit Creater und Assigned-to
  return members.value.map((m) => ({
    user_id: m.user_id,
    ...m.users
  }));
});

const availableUsers = computed(() => {
  return allUsers.value.filter(
    (u) => !allMembers.value.some((m) => m.user_id === u.user_id)
  );
});

// Methods
const isCreator = (userId) => userId === props.creatorId;
const isAssignedTo = (userId) => userId === props.assignedToId;

const getInitials = (firstname, lastname) => {
  return `${(firstname || 'U')[0]}${(lastname || 'S')[0]}`.toUpperCase();
};

const loadMembers = async () => {
  try {
    loading.value = true;
    const response = await taskMembersApi.getTaskMembers(props.taskId);
    members.value = response.data;
    emit('members-updated', allMembers.value);
  } catch (error) {
    console.error('Fehler beim Laden der Mitglieder:', error);
    showError('Mitglieder konnten nicht geladen werden');
  } finally {
    loading.value = false;
  }
};

const loadUsers = async () => {
  try {
    const response = await usersApi.getAll();
    allUsers.value = response.data;
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer:', error);
  }
};

const checkPermissions = async () => {
  try {
    const response = await taskMembersApi.checkPermission(props.taskId);
    canEditTask.value = response.data.has_write;
  } catch (error) {
    console.error('Fehler beim Prüfen der Berechtigungen:', error);
    canEditTask.value = false;
  }
};

const addMember = async () => {
  if (!selectedUserId.value) return;

  try {
    isAddingMember.value = true;
    await taskMembersApi.addTaskMember(props.taskId, {
      user_id: selectedUserId.value
    });

    showSuccess(
      `Mitglied hinzugefügt!`
    );

    // Neuladen
    await loadMembers();
    selectedUserId.value = null;
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Mitglieds:', error);
    showError(
      error.response?.data?.message || 'Mitglied konnte nicht hinzugefügt werden'
    );
  } finally {
    isAddingMember.value = false;
  }
};

const openRemoveDialog = (member) => {
  memberToRemove.value = member;
  showRemoveDialog.value = true;
};

const closeRemoveDialog = () => {
  showRemoveDialog.value = false;
  memberToRemove.value = null;
};

const confirmRemove = async () => {
  if (!memberToRemove.value) return;

  try {
    await taskMembersApi.removeTaskMember(
      props.taskId,
      memberToRemove.value.user_id
    );

    showSuccess(
      `${memberToRemove.value.firstname} entfernt!`
    );

    // Neuladen
    await loadMembers();
    closeRemoveDialog();
  } catch (error) {
    console.error('Fehler beim Entfernen des Mitglieds:', error);
    showError(
      error.response?.data?.message || 'Mitglied konnte nicht entfernt werden'
    );
  }
};

const showSuccess = (message) => {
  successMessage.value = message;
  setTimeout(() => {
    successMessage.value = '';
  }, 3000);
};

const showError = (message) => {
  errorMessage.value = message;
  setTimeout(() => {
    errorMessage.value = '';
  }, 5000);
};

// Lifecycle
onMounted(() => {
  loadMembers();
  loadUsers();
  checkPermissions();
});

// Watch
watch(() => props.taskId, () => {
  loadMembers();
  checkPermissions();
});
</script>

<style scoped>
.task-members-section {
  padding: 24px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  margin: 20px 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 20px 0;
  color: #333;
}

.loading-spinner {
  text-align: center;
  padding: 40px 20px;
  color: #999;
  font-style: italic;
}

.members-container {
  margin-bottom: 20px;
}

.members-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.member-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.member-card:hover {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.member-avatar {
  flex-shrink: 0;
}

.avatar-image,
.avatar-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #667eea;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.member-info {
  flex: 1;
  min-width: 0;
}

.member-name {
  margin: 0 0 4px 0;
  font-weight: 500;
  color: #333;
}

.member-email {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.badge-creator {
  background: #fff4e6;
  color: #d97706;
}

.badge-assigned {
  background: #e0f2fe;
  color: #0284c7;
}

.btn-remove {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-remove:hover {
  background: #fca5a5;
  color: white;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  background: white;
  border: 1px dashed #e0e0e0;
  border-radius: 6px;
}

.add-member-section {
  padding: 20px;
  background: white;
  border: 1px dashed #e0e0e0;
  border-radius: 6px;
  margin-top: 16px;
}

.add-member-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.add-member-form {
  display: flex;
  gap: 8px;
}

.member-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
}

.member-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.btn-add {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-add:hover:not(:disabled) {
  background: #764ba2;
}

.btn-add:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
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

/* Toast Messages */
.toast {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  z-index: 1001;
}

.toast-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.toast-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
