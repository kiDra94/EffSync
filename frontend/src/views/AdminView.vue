<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1>👥 Benutzerverwaltung - Rollen & Permissions</h1>
      <p class="subtitle">Admin-Panel zur Verwaltung von Rollen und Berechtigungen</p>
    </div>

    <div v-if="loading" class="loading-spinner">
      <p>📋 Lädt Benutzerdaten...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      <p>❌ Fehler: {{ error }}</p>
      <button @click="loadUsers" class="btn-retry">Neuer Versuch</button>
    </div>

    <div v-else class="admin-content">
      <!-- Benutzer Liste -->
      <div class="users-section">
        <h2>📌 Benutzer</h2>
        <div class="users-list">
          <div
            v-for="user in users"
            :key="user.user_id"
            class="user-card"
            :class="{ active: selectedUserId === user.user_id }"
            @click="selectUser(user)"
          >
            <div class="user-card-header">
              <h3>{{ user.firstname }} {{ user.lastname }}</h3>
              <span class="user-id">#{{ user.user_id }}</span>
            </div>
            <p class="user-email">{{ user.email }}</p>
            <div v-if="user.user_roles && user.user_roles.length > 0" class="user-roles-preview">
              <span v-for="role in user.user_roles" :key="role.role_id" class="role-badge">
                {{ role.roles?.name }}
              </span>
            </div>
            <p v-else class="no-roles">Keine Rollen</p>
          </div>
        </div>
      </div>

      <!-- Details Panel -->
      <div v-if="selectedUser" class="details-section">
        <h2>⚙️ Verwaltung für: {{ selectedUser.firstname }} {{ selectedUser.lastname }}</h2>

        <!-- Rollen Management -->
        <div class="management-card">
          <h3>🎯 Rollen ({{ selectedUser.user_roles?.length || 0 }})</h3>

          <div v-if="selectedUser.user_roles && selectedUser.user_roles.length > 0" class="roles-list">
            <div v-for="role in selectedUser.user_roles" :key="role.role_id" class="role-item">
              <span class="role-name">{{ role.roles?.name }}</span>
              <button
                @click="removeRoleFromUser(role.role_id)"
                :disabled="isRemoving || !canRemoveRole(role)"
                class="btn-remove"
                :title="canRemoveRole(role) ? 'Entfernen' : 'Es muss mindestens 1 ' + role.roles?.name + ' existieren'"
              >
                ✕
              </button>
            </div>
          </div>
          <p v-else class="no-items">Noch keine Rollen zugewiesen</p>

          <!-- Rolle hinzufügen -->
          <div class="add-role-section">
            <label for="role-select">Neue Rolle zuweisen:</label>
            <select v-model="newRoleId" id="role-select" class="select-field">
              <option value="">-- Rolle wählen --</option>
              <option v-for="role in availableRoles" :key="role.role_id" :value="role.role_id">
                {{ role.name }}
              </option>
            </select>
            <button
              @click="addRoleToUser"
              :disabled="!newRoleId || isAdding"
              class="btn-add"
            >
              + Rolle hinzufügen
            </button>
          </div>
        </div>

        <!-- Permissions Management -->
        <div class="management-card">
          <h3>🔐 Direkte Permissions ({{ selectedUser.user_permissions?.length || 0 }})</h3>

          <div v-if="selectedUser.user_permissions && selectedUser.user_permissions.length > 0" class="permissions-list">
            <div v-for="perm in selectedUser.user_permissions" :key="perm.user_permission_id" class="permission-item">
              <div class="permission-info">
                <span class="permission-name">{{ perm.permissions?.name }}</span>
                <span v-if="perm.valid_from || perm.valid_to" class="permission-dates">
                  📅 {{ formatDate(perm.valid_from) }} 
                  <span v-if="perm.valid_to">→ {{ formatDate(perm.valid_to) }}</span>
                </span>
              </div>
              <button
                @click="removePermissionFromUser(perm.permissions?.permission_id)"
                :disabled="isRemoving"
                class="btn-remove"
                title="Entfernen"
              >
                ✕
              </button>
            </div>
          </div>
          <p v-else class="no-items">Noch keine direkten Permissions</p>

          <!-- Permission hinzufügen -->
          <div class="add-permission-section">
            <label for="permission-select">Neue Permission zuweisen:</label>
            <select v-model="newPermissionId" id="permission-select" class="select-field">
              <option value="">-- Permission wählen --</option>
              <option v-for="perm in availablePermissions" :key="perm.permission_id" :value="perm.permission_id">
                {{ perm.name }}
              </option>
            </select>

            <div class="date-inputs">
              <div class="date-group">
                <label for="valid-from">Gültig ab (optional):</label>
                <input
                  id="valid-from"
                  v-model="newPermissionValidFrom"
                  type="date"
                  class="input-field"
                />
              </div>
              <div class="date-group">
                <label for="valid-to">Gültig bis (optional):</label>
                <input
                  id="valid-to"
                  v-model="newPermissionValidTo"
                  type="date"
                  class="input-field"
                />
              </div>
            </div>

            <button
              @click="addPermissionToUser"
              :disabled="!newPermissionId || isAdding"
              class="btn-add"
            >
              + Permission hinzufügen
            </button>
          </div>
        </div>
      </div>

      <div v-else class="no-selection">
        <p>👇 Wählen Sie einen Benutzer aus der Liste, um dessen Rollen und Permissions zu verwalten.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { adminService } from '@/api/adminService.js';
import { useAuthStore } from '@/stores/authStore.js';

export default {
  name: 'AdminView',
  setup() {
    const authStore = useAuthStore();
    const users = ref([]);
    const selectedUser = ref(null);
    const selectedUserId = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const isAdding = ref(false);
    const isRemoving = ref(false);

    const newRoleId = ref('');
    const newPermissionId = ref('');
    const newPermissionValidFrom = ref('');
    const newPermissionValidTo = ref('');

    // Für später: wenn Backend Endpoints für getAllRoles/getAllPermissions bereitstellt
    const availableRoles = ref([
      { role_id: 1, name: 'Admin' },
      { role_id: 2, name: 'Teacher' },
      { role_id: 3, name: 'Student' },
      { role_id: 4, name: 'Parent' },
    ]);

    const availablePermissions = ref([
      { permission_id: 1, name: 'manage_users' },
      { permission_id: 2, name: 'manage_roles' },
      { permission_id: 3, name: 'manage_permissions' },
      { permission_id: 4, name: 'create_task' },
      { permission_id: 5, name: 'edit_task' },
      { permission_id: 6, name: 'delete_task' },
      { permission_id: 7, name: 'view_grades' },
      { permission_id: 8, name: 'edit_grades' },
    ]);

    const loadUsers = async () => {
      try {
        loading.value = true;
        error.value = null;
        
        // Erst Benutzer laden
        console.log('📥 AdminView: Loading users...');
        users.value = await adminService.getAllUsers();
        console.log(`✅ AdminView: Loaded ${users.value?.length || 0} users`);
        
        // Dann Rollen und Permissions nacheinander (nicht parallel)
        try {
          console.log('📥 AdminView: Loading roles...');
          availableRoles.value = await adminService.getAllRoles();
          console.log(`✅ AdminView: Loaded ${availableRoles.value?.length || 0} roles`);
        } catch (err) {
          console.error('❌ Fehler beim Laden der Rollen:', err?.response?.status, err?.response?.data || err?.message);
          availableRoles.value = [];
          // Fallback auf default Rollen
        }
        
        try {
          console.log('📥 AdminView: Loading permissions...');
          availablePermissions.value = await adminService.getAllPermissions();
          console.log(`✅ AdminView: Loaded ${availablePermissions.value?.length || 0} permissions`);
        } catch (err) {
          console.error('❌ Fehler beim Laden der Permissions:', err?.response?.status, err?.response?.data || err?.message);
          availablePermissions.value = [];
          // Fallback auf default Permissions
        }
      } catch (err) {
        error.value = err.message || 'Fehler beim Laden der Benutzer';
        console.error('❌ Error loading users:', err);
      } finally {
        loading.value = false;
      }
    };

    const selectUser = async (user) => {
      console.log('👤 Selecting user:', user.username, 'ID:', user.user_id);
      selectedUserId.value = user.user_id;
      selectedUser.value = user;
      newRoleId.value = '';
      newPermissionId.value = '';
      newPermissionValidFrom.value = '';
      newPermissionValidTo.value = '';
    };

    const addRoleToUser = async () => {
      if (!selectedUser.value || !newRoleId.value) return;

      try {
        isAdding.value = true;
        await adminService.assignRoleToUser(selectedUser.value.user_id, parseInt(newRoleId.value));
        // Benutzer neu laden
        await selectUser(selectedUser.value);
        newRoleId.value = '';
      } catch (err) {
        error.value = err.message || 'Fehler beim Zuweisen der Rolle';
        console.error('Error adding role:', err);
      } finally {
        isAdding.value = false;
      }
    };

    const removeRoleFromUser = async (roleId) => {
      if (!selectedUser.value) return;

      try {
        isRemoving.value = true;
        await adminService.removeRoleFromUser(selectedUser.value.user_id, roleId);
        // Benutzer neu laden
        await selectUser(selectedUser.value);
      } catch (err) {
        error.value = err.message || 'Fehler beim Entfernen der Rolle';
        console.error('Error removing role:', err);
      } finally {
        isRemoving.value = false;
      }
    };

    const addPermissionToUser = async () => {
      if (!selectedUser.value || !newPermissionId.value) return;

      try {
        isAdding.value = true;
        await adminService.assignPermissionToUser(
          selectedUser.value.user_id,
          parseInt(newPermissionId.value),
          newPermissionValidFrom.value || null,
          newPermissionValidTo.value || null
        );
        // Benutzer neu laden
        await selectUser(selectedUser.value);
        newPermissionId.value = '';
        newPermissionValidFrom.value = '';
        newPermissionValidTo.value = '';
      } catch (err) {
        error.value = err.message || 'Fehler beim Zuweisen der Permission';
        console.error('Error adding permission:', err);
      } finally {
        isAdding.value = false;
      }
    };

    const removePermissionFromUser = async (permissionId) => {
      if (!selectedUser.value) return;

      try {
        isRemoving.value = true;
        await adminService.removePermissionFromUser(selectedUser.value.user_id, permissionId);
        // Benutzer neu laden
        await selectUser(selectedUser.value);
      } catch (err) {
        error.value = err.message || 'Fehler beim Entfernen der Permission';
        console.error('Error removing permission:', err);
      } finally {
        isRemoving.value = false;
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return '—';
      const date = new Date(dateString);
      return date.toLocaleDateString('de-DE');
    };

    const canRemoveRole = (role) => {
      // Kritische Rollen (Superuser/Admin) können nicht entfernt werden wenn nur noch 1 existiert
      const criticalRoles = ['Superuser', 'Admin'];
      
      if (criticalRoles.includes(role.roles?.name)) {
        // Zähle wie viele User diese Rolle haben
        const countInAllUsers = users.value.filter(u => 
          u.user_roles?.some(ur => ur.role_id === role.role_id)
        ).length;
        
        // Wenn nur noch ein User diese Rolle hat - nicht entfernen!
        if (countInAllUsers <= 1) {
          return false;
        }
      }
      
      return true;
    };

    onMounted(() => {
      // Prüfe, ob der Benutzer admin ist (admin oder superuser)
      if (!authStore.isAdmin) {
        error.value = '⛔ Sie haben keine Berechtigung, diese Seite zu besuchen.';
        loading.value = false;
        return;
      }
      loadUsers();
    });

    return {
      users,
      selectedUser,
      selectedUserId,
      loading,
      error,
      isAdding,
      isRemoving,
      newRoleId,
      newPermissionId,
      newPermissionValidFrom,
      newPermissionValidTo,
      availableRoles,
      availablePermissions,
      loadUsers,
      selectUser,
      addRoleToUser,
      removeRoleFromUser,
      addPermissionToUser,
      removePermissionFromUser,
      formatDate,
      canRemoveRole,
    };
  },
};
</script>

<style scoped>
.admin-container {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.admin-header {
  margin-bottom: 30px;
  border-bottom: 3px solid #4a90e2;
  padding-bottom: 15px;
}

.admin-header h1 {
  margin: 0 0 5px 0;
  color: #1a1a1a;
  font-size: 28px;
}

.subtitle {
  color: #666;
  margin: 0;
  font-size: 14px;
}

.loading-spinner {
  text-align: center;
  padding: 40px;
  color: #666;
}

.error-banner {
  background: #fee;
  border: 2px solid #f88;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  color: #c33;
}

.error-banner p {
  margin: 0 0 10px 0;
}

.btn-retry {
  background: #f88;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.btn-retry:hover {
  background: #e77;
}

.admin-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 30px;
}

.users-section {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.users-section h2 {
  margin-top: 0;
  color: #1a1a1a;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 70vh;
  overflow-y: auto;
}

.user-card {
  background: white;
  border: 2px solid #ddd;
  border-radius: 6px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.user-card:hover {
  border-color: #4a90e2;
  background: #f3f7ff;
}

.user-card.active {
  border-color: #4a90e2;
  background: #e8f0ff;
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}

.user-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.user-card-header h3 {
  margin: 0;
  color: #1a1a1a;
  font-size: 16px;
}

.user-id {
  font-size: 12px;
  color: #999;
  background: #eee;
  padding: 2px 8px;
  border-radius: 3px;
}

.user-email {
  margin: 5px 0;
  color: #666;
  font-size: 13px;
}

.user-roles-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

.role-badge {
  background: #4a90e2;
  color: white;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
}

.no-roles {
  color: #999;
  font-size: 12px;
  margin: 8px 0 0 0;
  font-style: italic;
}

.details-section {
  background: white;
  padding: 0;
}

.details-section h2 {
  color: #1a1a1a;
  margin-top: 0;
  padding-bottom: 15px;
  border-bottom: 2px solid #4a90e2;
}

.management-card {
  background: #f9f9f9;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.management-card h3 {
  margin-top: 0;
  color: #1a1a1a;
}

.roles-list,
.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.role-item,
.permission-item {
  background: white;
  border: 1px solid #ddd;
  padding: 12px;
  border-radius: 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.role-name,
.permission-name {
  color: #1a1a1a;
  font-weight: bold;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.permission-dates {
  font-size: 12px;
  color: #666;
}

.no-items {
  text-align: center;
  color: #999;
  padding: 15px;
  background: white;
  border: 1px dashed #ddd;
  border-radius: 6px;
  margin-bottom: 20px;
}

.add-role-section,
.add-permission-section {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #ddd;
}

.add-role-section label,
.add-permission-section label {
  display: block;
  margin-bottom: 8px;
  color: #1a1a1a;
  font-weight: bold;
  font-size: 14px;
}

.select-field,
.input-field {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  margin-bottom: 12px;
  font-family: inherit;
}

.select-field:focus,
.input-field:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
}

.date-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.date-group {
  display: flex;
  flex-direction: column;
}

.date-group label {
  margin-bottom: 5px;
  color: #666;
  font-weight: normal;
  font-size: 13px;
}

.btn-add,
.btn-remove {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.btn-add {
  background: #4a90e2;
  color: white;
  width: 100%;
}

.btn-add:hover:not(:disabled) {
  background: #357abd;
}

.btn-add:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-remove {
  background: #e74c3c;
  color: white;
  padding: 4px 8px;
  font-size: 11px;
  flex-shrink: 0;
  white-space: nowrap;
}

.btn-remove:hover:not(:disabled) {
  background: #c0392b;
}

.btn-remove:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.no-selection {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 16px;
}

@media (max-width: 1200px) {
  .admin-content {
    grid-template-columns: 1fr;
  }

  .users-list {
    max-height: 40vh;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .user-card {
    flex: 1 1 calc(50% - 5px);
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .admin-container {
    padding: 10px;
  }

  .admin-header h1 {
    font-size: 20px;
  }

  .users-list {
    flex-direction: column;
  }

  .user-card {
    flex: 1 1 100%;
  }

  .date-inputs {
    grid-template-columns: 1fr;
  }
}
</style>
