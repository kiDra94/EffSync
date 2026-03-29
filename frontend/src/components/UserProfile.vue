<template>
  <div class="user-profile-container">
    <!-- Loading State -->
    <div v-if="loading" class="loading-spinner">
      Profil wird geladen...
    </div>

    <!-- Profile Content -->
    <div v-else-if="profile" class="profile-content">
      <!-- Profile Header -->
      <div class="profile-header">
        <div class="profile-avatar">
          <img
            v-if="profile.user.profile_picture"
            :src="profile.user.profile_picture"
            :alt="`${profile.user.firstname} ${profile.user.lastname}`"
            class="avatar-image"
          />
          <div v-else class="avatar-placeholder">
            {{ getInitials(profile.user.firstname, profile.user.lastname) }}
          </div>
        </div>

        <div class="profile-info">
          <h1>{{ profile.user.firstname }} {{ profile.user.lastname }}</h1>
          <p class="profile-email">{{ profile.user.email }}</p>
          <p class="profile-meta">
            Mitglied seit {{ formatDate(profile.user.created_at) }}
          </p>
        </div>

        <!-- Edit Button (nur für Admins) -->
        <button
          v-if="canEditUsers"
          @click="isEditMode = true"
          class="btn-edit"
        >
          ✎ Bearbeiten
        </button>
      </div>

      <!-- Rollen-Sektion -->
      <section class="roles-section">
        <h2>🔐 Rollen</h2>

        <div v-if="profile.roles.length === 0" class="empty-box">
          Keine Rollen zugewiesen.
        </div>

        <div v-else class="roles-grid">
          <div v-for="role in profile.roles" :key="role.role_id" class="role-card">
            <h3>{{ role.name }}</h3>
            <ul class="permissions-list">
              <li v-for="perm in role.permissions" :key="perm.name">
                <span class="perm-name">{{ perm.name }}</span>
                <span class="perm-flags">{{ formatFlags(perm.flags) }}</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Add/Remove Role (Admins) -->
        <div v-if="canEditUsers" class="role-management">
          <div class="role-actions">
            <select v-model="selectedRoleId" class="role-select">
              <option value="">-- Rolle hinzufügen --</option>
              <option
                v-for="role in availableRoles"
                :key="role.role_id"
                :value="role.role_id"
              >
                {{ role.name }}
              </option>
            </select>
            <button
              @click="addRole"
              :disabled="!selectedRoleId || isAddingRole"
              class="btn-add"
            >
              {{ isAddingRole ? "Wird hinzugefügt..." : "+ Rolle" }}
            </button>
          </div>
        </div>
      </section>

      <!-- Direkte Permissions-Sektion (mit Zeitlimits) -->
      <section class="permissions-section">
        <h2>⏱️ Direkte Permissions (Zeitlich begrenzt)</h2>

        <div v-if="profile.directPermissions.length === 0" class="empty-box">
          Keine direkten Permissions zugewiesen.
        </div>

        <div v-else class="permissions-table">
          <div class="table-header">
            <div class="col-name">Permission</div>
            <div class="col-flags">Flags</div>
            <div class="col-valid-from">Gültig ab</div>
            <div class="col-valid-to">Gültig bis</div>
            <div class="col-status">Status</div>
            <div v-if="canEditUsers" class="col-actions">Aktionen</div>
          </div>

          <div
            v-for="perm in profile.directPermissions"
            :key="perm.name"
            class="table-row"
            :class="`status-${perm.status.toLowerCase()}`"
          >
            <div class="col-name">{{ perm.name }}</div>
            <div class="col-flags">{{ formatFlags(perm.flags) }}</div>
            <div class="col-valid-from">
              {{ perm.valid_from ? formatDate(perm.valid_from) : "–" }}
            </div>
            <div class="col-valid-to">
              {{ perm.valid_to ? formatDate(perm.valid_to) : "∞" }}
            </div>
            <div class="col-status">
              <badge :status="perm.status">{{ perm.status }}</badge>
            </div>
            <div v-if="canEditUsers" class="col-actions">
              <button
                @click="removePermission(perm)"
                class="btn-remove-perm"
                title="Entfernen"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <!-- Add Permission (Admins) -->
        <div v-if="canEditUsers" class="permission-management">
          <button
            @click="isAddPermissionMode = true"
            class="btn-add-perm"
          >
            + Permission hinzufügen
          </button>
        </div>
      </section>

      <!-- Edit Profile Modal -->
      <teleport to="body">
        <div v-if="isEditMode" class="modal-overlay" @click="closeEditMode">
          <div class="modal-content" @click.stop>
            <h2>Profil bearbeiten</h2>
            <form @submit.prevent="saveProfile">
              <div class="form-group">
                <label>Vorname</label>
                <input v-model="editData.firstname" type="text" required />
              </div>

              <div class="form-group">
                <label>Nachname</label>
                <input v-model="editData.lastname" type="text" required />
              </div>

              <div class="form-group">
                <label>Email</label>
                <input v-model="editData.email" type="email" required />
              </div>

              <div class="modal-actions">
                <button type="submit" class="btn-submit">Speichern</button>
                <button type="button" @click="closeEditMode" class="btn-cancel">
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      </teleport>

      <!-- Add Permission Modal -->
      <teleport to="body">
        <div v-if="isAddPermissionMode" class="modal-overlay" @click="closeAddPermissionMode">
          <div class="modal-content" @click.stop>
            <h2>Permission hinzufügen</h2>
            <form @submit.prevent="addPermission">
              <div class="form-group">
                <label>Permission</label>
                <select v-model="newPermission.permission_id" required>
                  <option value="">-- Permission wählen --</option>
                  <option
                    v-for="p in availablePermissions"
                    :key="p.permission_id"
                    :value="p.permission_id"
                  >
                    {{ p.name }} ({{ formatFlags(p.flags) }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Gültig ab (optional)</label>
                <input v-model="newPermission.valid_from" type="date" />
              </div>

              <div class="form-group">
                <label>Gültig bis (optional)</label>
                <input v-model="newPermission.valid_to" type="date" />
              </div>

              <div class="modal-actions">
                <button type="submit" class="btn-submit">Hinzufügen</button>
                <button
                  type="button"
                  @click="closeAddPermissionMode"
                  class="btn-cancel"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      </teleport>

      <!-- Toast Messages -->
      <div v-if="successMessage" class="toast toast-success">
        {{ successMessage }}
      </div>
      <div v-if="errorMessage" class="toast toast-error">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usersApi } from '@/api/usersService';
import Badge from '@/components/Badge.vue';

const route = useRoute();
const userId = parseInt(route.params.id) || 1;

// State
const profile = ref(null);
const loading = ref(false);
const isEditMode = ref(false);
const isAddPermissionMode = ref(false);
const canEditUsers = ref(false);

const editData = ref({});
const newPermission = ref({});
const selectedRoleId = ref('');
const isAddingRole = ref(false);

const allRoles = ref([]);
const allPermissions = ref([]);

const successMessage = ref('');
const errorMessage = ref('');

// Computed Properties
const availableRoles = computed(() => {
  return allRoles.value.filter(
    (role) => !profile.value.roles.some((r) => r.role_id === role.role_id)
  );
});

const availablePermissions = computed(() => {
  return allPermissions.value.filter(
    (perm) =>
      !profile.value.directPermissions.some((p) => p.name === perm.name)
  );
});

// Methods
const getInitials = (firstname, lastname) => {
  return `${(firstname || 'U')[0]}${(lastname || 'S')[0]}`.toUpperCase();
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatFlags = (flags) => {
  const flagNames = [];
  if ((flags & 4) === 4) flagNames.push('R');
  if ((flags & 2) === 2) flagNames.push('W');
  if ((flags & 1) === 1) flagNames.push('X');
  return `[${flagNames.join('')}]`;
};

const loadProfileData = async () => {
  try {
    loading.value = true;
    const response = await usersApi.getUserPermissions(userId);
    profile.value = response.data;

    editData.value = {
      firstname: profile.value.user.firstname,
      lastname: profile.value.user.lastname,
      email: profile.value.user.email
    };
  } catch (error) {
    console.error('Fehler beim Laden des Profils:', error);
    showError('Profil konnte nicht geladen werden');
  } finally {
    loading.value = false;
  }
};

const loadRoles = async () => {
  try {
    const response = await usersApi.getAllRoles();
    allRoles.value = response.data;
  } catch (error) {
    console.error('Fehler beim Laden der Rollen:', error);
  }
};

const loadPermissions = async () => {
  try {
    const response = await usersApi.getAllPermissions();
    allPermissions.value = response.data;
  } catch (error) {
    console.error('Fehler beim Laden der Permissions:', error);
  }
};

const checkPermissions = async () => {
  try {
    const myPerms = await usersApi.getMyPermissions();
    // Prüfe ob manage_users Permission vorhanden ist
    const hasManageUsers = myPerms.data.directPermissions.some(
      (p) => p.name === 'manage_users'
    ) || myPerms.data.rolePermissions.some(
      (p) => p.name === 'manage_users'
    );
    canEditUsers.value = hasManageUsers;
  } catch (error) {
    console.error('Fehler beim Prüfen der Berechtigungen:', error);
    canEditUsers.value = false;
  }
};

const closeEditMode = () => {
  isEditMode.value = false;
};

const saveProfile = async () => {
  try {
    await usersApi.updateUser(userId, editData.value);
    showSuccess('Profil gespeichert!');
    await loadProfileData();
    closeEditMode();
  } catch (error) {
    console.error('Fehler beim Speichern des Profils:', error);
    showError(
      error.response?.data?.message ||
        'Profil konnte nicht gespeichert werden'
    );
  }
};

const closeAddPermissionMode = () => {
  isAddPermissionMode.value = false;
  newPermission.value = {};
};

const addPermission = async () => {
  if (!newPermission.value.permission_id) return;

  try {
    await usersApi.addPermissionToUser(userId, {
      permission_id: newPermission.value.permission_id,
      valid_from: newPermission.value.valid_from || null,
      valid_to: newPermission.value.valid_to || null
    });

    showSuccess('Permission hinzugefügt!');
    await loadProfileData();
    closeAddPermissionMode();
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Permission:', error);
    showError(
      error.response?.data?.message ||
        'Permission konnte nicht hinzugefügt werden'
    );
  }
};

const removePermission = async (perm) => {
  if (!confirm(`Permission "${perm.name}" wirklich entfernen?`)) return;

  try {
    await usersApi.removePermissionFromUser(userId, perm.name);
    showSuccess('Permission entfernt!');
    await loadProfileData();
  } catch (error) {
    console.error('Fehler beim Entfernen der Permission:', error);
    showError(
      error.response?.data?.message ||
        'Permission konnte nicht entfernt werden'
    );
  }
};

const addRole = async () => {
  if (!selectedRoleId.value) return;

  try {
    isAddingRole.value = true;
    await usersApi.addRoleToUser(userId, {
      role_id: selectedRoleId.value
    });

    showSuccess('Rolle hinzugefügt!');
    await loadProfileData();
    await loadRoles();
    selectedRoleId.value = '';
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Rolle:', error);
    showError(
      error.response?.data?.message ||
        'Rolle konnte nicht hinzugefügt werden'
    );
  } finally {
    isAddingRole.value = false;
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
  loadProfileData();
  loadRoles();
  loadPermissions();
  checkPermissions();
});
</script>

<style scoped>
.user-profile-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.loading-spinner {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}

.profile-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Profile Header */
.profile-header {
  display: flex;
  align-items: center;
  gap: 30px;
  padding: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  margin-bottom: 30px;
  position: relative;
}

.profile-avatar {
  flex-shrink: 0;
}

.avatar-image,
.avatar-placeholder {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border: 4px solid white;
  font-size: 28px;
  font-weight: bold;
  color: white;
}

.profile-info {
  flex: 1;
}

.profile-info h1 {
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 700;
}

.profile-email {
  margin: 0 0 4px 0;
  font-size: 16px;
  opacity: 0.95;
}

.profile-meta {
  margin: 0;
  font-size: 14px;
  opacity: 0.85;
}

.btn-edit {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-edit:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Sections */
section {
  margin-bottom: 30px;
}

section h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.empty-box {
  background: #f9f9f9;
  padding: 30px 20px;
  border-radius: 8px;
  text-align: center;
  color: #999;
  border: 1px dashed #ddd;
}

/* Rollen Grid */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.role-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background: white;
  border-left: 4px solid #667eea;
}

.role-card h3 {
  margin: 0 0 15px 0;
  color: #667eea;
  font-size: 16px;
}

.permissions-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.permissions-list li {
  padding: 8px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
}

.permissions-list li:last-child {
  border-bottom: none;
}

.perm-name {
  color: #333;
  font-weight: 500;
}

.perm-flags {
  background: #e8f0fe;
  color: #1967d2;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
}

.role-management {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.role-actions {
  display: flex;
  gap: 8px;
}

.role-select {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
}

.role-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Permissions Table */
.permissions-table {
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
  margin-bottom: 16px;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 80px 130px 130px 100px 60px;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f5f5;
  font-weight: 600;
  font-size: 13px;
  color: #666;
  border-bottom: 1px solid #ddd;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 80px 130px 130px 100px 60px;
  gap: 12px;
  padding: 12px 16px;
  align-items: center;
  border-bottom: 1px solid #eee;
  transition: background 0.1s ease;
}

.table-row:hover {
  background: #f9f9f9;
}

.table-row.status-valid {
  background: #f0f9ff;
}

.table-row.status-expired {
  opacity: 0.6;
  background: #fff0f0;
}

.table-row.status-not_yet_valid {
  background: #fffef0;
}

.col-name {
  font-weight: 500;
  color: #333;
}

.col-flags {
  background: #e8f0fe;
  color: #1967d2;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.col-valid-from,
.col-valid-to {
  font-size: 13px;
  color: #666;
}

.col-status {
  text-align: center;
}

.col-actions {
  text-align: right;
}

.btn-remove-perm {
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

.btn-remove-perm:hover {
  background: #fca5a5;
  color: white;
}

.permission-management {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.btn-add-perm {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-perm:hover {
  background: #764ba2;
}

.btn-add {
  padding: 8px 16px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.btn-add:hover:not(:disabled) {
  background: #764ba2;
}

.btn-add:disabled {
  background: #ccc;
  cursor: not-allowed;
}

/* Modals */
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
  max-width: 500px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-content h2 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: inherit;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-submit {
  padding: 10px 20px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-submit:hover {
  background: #764ba2;
}

.btn-cancel {
  padding: 10px 20px;
  background: #e5e7eb;
  color: #333;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: #d1d5db;
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

/* Responsive */
@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }

  .btn-edit {
    position: static;
  }

  .roles-grid {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: auto 1fr auto;
  }

  .col-valid-from,
  .col-valid-to {
    display: none;
  }
}
</style>
