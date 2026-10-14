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
                v-if="member.role === 'creator'"
                class="badge badge-creator"
                title="Task-Creator"
              >
                👑 Creator
              </span>
              <span
                v-if="member.role === 'assigned'"
                class="badge badge-assigned"
                title="Zugewiesen"
              >
                ✓ Assigned
              </span>
              <span
                v-if="member.role === 'member'"
                class="badge badge-member"
                title="Task-Member"
              >
                👤 Member
              </span>
            </div>
          </div>

          <!-- Remove Button (nur für normale Members, nicht Creator/Assigned) -->
          <button
            v-if="canManageMembers && member.role === 'member'"
            @click.stop.prevent="openRemoveDialog(member)"
            class="btn-remove"
            title="Mitglied entfernen"
            type="button"
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

    <!-- Add Member Section (Creator oder WRITE-Permission) -->
    <div v-if="canManageMembers" class="add-member-section">
      <h4>Mitglieder hinzufügen</h4>
      <div class="add-member-form">
        <select
          v-model="selectedUserIds"
          class="member-select"
          multiple
          size="6"
        >
          <option
            v-for="user in availableUsers"
            :key="user.user_id"
            :value="user.user_id"
          >
            {{ user.firstname }} {{ user.lastname }} ({{ user.email }})
          </option>
        </select>
        <button
          @click.stop.prevent="addMembers"
          :disabled="selectedUserIds.length === 0 || isAddingMember"
          class="btn-add"
          type="button"
        >
          {{ isAddingMember ? 'Werden hinzugefügt...' : `+ ${selectedUserIds.length > 0 ? selectedUserIds.length + ' ' : ''}Hinzufügen` }}
        </button>
      </div>
      <p class="add-member-hint">Tipp: Mit Ctrl/Cmd oder Shift mehrere Benutzer gleichzeitig auswählen.</p>
    </div>

    <!-- Remove Confirmation Modal -->
    <div v-if="showRemoveDialog" class="modal-overlay" @click="handleOverlayClick">
      <div class="modal-content" @click.stop>
        <h3>Mitglied entfernen</h3>
        <p>
          Sind Sie sicher, dass Sie
          <strong>{{ memberToRemove?.firstname }} {{ memberToRemove?.lastname }}</strong>
          von dieser Task entfernen möchten?
        </p>
        <div class="modal-actions">
          <button 
            @click="handleConfirmRemove" 
            class="btn-confirm btn-danger"
            type="button"
          >
            Entfernen
          </button>
          <button 
            @click="handleCancelRemove" 
            class="btn-cancel"
            type="button"
          >
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
const selectedUserIds = ref([]);
const loading = ref(false);
const isAddingMember = ref(false);
const canEditTask = ref(false);
const currentUserId = ref(Number(localStorage.getItem('userId')) || null);

const memberToRemove = ref(null);
const showRemoveDialog = ref(false);

const successMessage = ref('');
const errorMessage = ref('');

// Computed Properties
const allMembers = computed(() => {
  return members.value.map((m) => {
    const userData = m.user || m.users || {};
    return {
      user_id: userData.user_id || m.user_id,
      firstname: userData.firstname || 'Unknown',
      lastname: userData.lastname || 'User',
      email: userData.email || '',
      profile_picture: userData.profile_picture || null,
      role: m.role || (m.user_id === props.creatorId ? 'creator' : m.user_id === props.assignedToId ? 'assigned' : 'member'),
      joined_at: m.joined_at,
    };
  }).filter(m => m.user_id);
});

const isCurrentUserCreator = computed(() => {
  if (!currentUserId.value || !props.creatorId) return false;
  return Number(currentUserId.value) === Number(props.creatorId);
});

const canManageMembers = computed(() => canEditTask.value || isCurrentUserCreator.value);

const availableUsers = computed(() => {
  return allUsers.value.filter(
    (u) => !allMembers.value.some((m) => m.user_id === u.user_id)
  );
});

// Methods
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
    const response = await usersApi.getAllForSelection();
    const users = response?.data?.data ?? response?.data ?? [];
    allUsers.value = Array.isArray(users) ? users : [];
  } catch (error) {
    console.error('Fehler beim Laden der Benutzer (for-chat), versuche Fallback /users:', error);
    try {
      const fallbackResponse = await usersApi.getAll();
      const users = fallbackResponse?.data?.data ?? fallbackResponse?.data ?? [];
      allUsers.value = Array.isArray(users) ? users : [];
    } catch (fallbackError) {
      console.error('Fehler beim Laden der Benutzer (Fallback /users):', fallbackError);
      allUsers.value = [];
    }
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

const addMembers = async () => {
  if (!Array.isArray(selectedUserIds.value) || selectedUserIds.value.length === 0) return;

  const userIds = selectedUserIds.value.map((id) => Number(id)).filter((id) => Number.isFinite(id));

  try {
    isAddingMember.value = true;
    const results = await Promise.allSettled(
      userIds.map((userId) =>
        taskMembersApi.addTaskMember(props.taskId, { user_id: userId })
      )
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected');

    if (successCount > 0) {
      showSuccess(successCount === 1 ? '1 Mitglied hinzugefügt!' : `${successCount} Mitglieder hinzugefügt!`);
    }
    if (failed.length > 0) {
      const firstError = failed[0]?.reason?.response?.data?.message;
      showError(firstError || `${failed.length} Mitglied(er) konnten nicht hinzugefügt werden`);
    }

    await loadMembers();
    selectedUserIds.value = [];
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Mitglieder:', error);
    showError(error.response?.data?.message || 'Mitglieder konnten nicht hinzugefügt werden');
  } finally {
    isAddingMember.value = false;
  }
};

const openRemoveDialog = (member) => {
  memberToRemove.value = member;
  showRemoveDialog.value = true;
};

const handleOverlayClick = (event) => {
  // Nur schließen wenn direkt auf dem Overlay-Hintergrund geklickt wurde
  if (event.target === event.currentTarget) {
    closeRemoveDialog();
  }
};

const handleConfirmRemove = async (event) => {
  event.preventDefault();
  event.stopPropagation();
  await confirmRemove();
};

const handleCancelRemove = (event) => {
  event.preventDefault();
  event.stopPropagation();
  closeRemoveDialog();
};

const closeRemoveDialog = () => {
  showRemoveDialog.value = false;
  memberToRemove.value = null;
};

const confirmRemove = async () => {
  if (!memberToRemove.value) {
    console.error('❌ Kein Mitglied zum Löschen ausgewählt');
    return;
  }

  console.log(`🗑️ Versuche Mitglied ${memberToRemove.value.user_id} zu löschen...`);

  try {
    console.log(`📡 API-Anfrage: DELETE /api/tasks/${props.taskId}/members/${memberToRemove.value.user_id}`);
    
    const response = await taskMembersApi.removeTaskMember(
      props.taskId,
      memberToRemove.value.user_id
    );

    console.log('✅ Mitglied erfolgreich gelöscht:', response);
    showSuccess(`${memberToRemove.value.firstname} entfernt!`);

    console.log('🔄 Lade Mitglieder neu...');
    await loadMembers();
    
    // Modal schließen
    closeRemoveDialog();
    console.log('✓ Dialog geschlossen');
  } catch (error) {
    console.error('❌ Fehler beim Entfernen des Mitglieds:', error);
    console.error('❌ Response:', error.response?.data);
    console.error('❌ Status:', error.response?.status);
    
    showError(
      error.response?.data?.message || 
      error.response?.data?.error ||
      'Mitglied konnte nicht entfernt werden'
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.member-card {
  display: grid;
  grid-template-columns: 48px 1fr 32px;
  align-items: center;
  gap: 12px;
  padding: 12px;
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
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
}

.member-name {
  margin: 0;
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
}

.member-email {
  margin: 0;
  font-size: 0.8rem;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-badges {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
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

.badge-member {
  background: #f0fdf4;
  color: #16a34a;
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
  align-items: stretch;
  flex-wrap: wrap;
}

.member-select {
  flex: 1 1 220px;
  min-width: 0;
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
  flex: 0 0 auto;
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
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

:global(body.dark-mode) .task-members-section,
:global(.app-container.dark-mode) .task-members-section {
  background: #2a2f45 !important;
  border-color: #4f5672 !important;
}

:global(body.dark-mode) .section-title,
:global(body.dark-mode) .loading-spinner,
:global(body.dark-mode) .empty-state,
:global(body.dark-mode) .add-member-section h4,
:global(.app-container.dark-mode) .section-title,
:global(.app-container.dark-mode) .loading-spinner,
:global(.app-container.dark-mode) .empty-state,
:global(.app-container.dark-mode) .add-member-section h4 {
  color: #edf0fa !important;
}

:global(body.dark-mode) .member-card,
:global(.app-container.dark-mode) .member-card {
  background: #25283a !important;
  border-color: #444b66 !important;
}

:global(body.dark-mode) .member-name,
:global(.app-container.dark-mode) .member-name {
  color: #f5f7ff !important;
}

:global(body.dark-mode) .member-email,
:global(.app-container.dark-mode) .member-email {
  color: #b2b9cb !important;
}

:global(body.dark-mode) .empty-state,
:global(body.dark-mode) .add-member-section,
:global(.app-container.dark-mode) .empty-state,
:global(.app-container.dark-mode) .add-member-section {
  background: #25283a !important;
  border-color: #4f5672 !important;
}

:global(body.dark-mode) .member-select,
:global(.app-container.dark-mode) .member-select,
:global(body.dark-mode) .btn-add,
:global(.app-container.dark-mode) .btn-add {
  background: #31364d !important;
  border-color: #59607d !important;
  color: #f5f7ff !important;
}
</style>
