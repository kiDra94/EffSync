<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1>👥 Benutzerverwaltung - Rollen & Permissions</h1>
      <p class="subtitle">Admin-Panel zur Verwaltung von Konten, Rollen und Berechtigungen</p>
    </div>

    <!-- T75 (UC-30) and T77 (UC-40), M35: the system configuration is the Superuser's -->
    <div v-if="isSuperuser" class="admin-tabs" role="tablist">
      <button type="button" role="tab" data-tab="users" :aria-selected="activeTab === 'users'"
        :class="{ active: activeTab === 'users' }" @click="activeTab = 'users'">👥 Benutzerverwaltung</button>
      <button type="button" role="tab" data-tab="system" :aria-selected="activeTab === 'system'"
        :class="{ active: activeTab === 'system' }" @click="activeTab = 'system'">🛠️ Systemkonfiguration</button>
    </div>

    <SystemConfiguration v-if="activeTab === 'system'" />

    <div v-else-if="loading" class="loading-spinner">
      <p>📋 Lädt Benutzerdaten...</p>
    </div>

    <div v-else-if="error" class="error-banner">
      <p>❌ Fehler: {{ error }}</p>
      <button @click="loadUsers" class="btn-retry">Neuer Versuch</button>
    </div>

    <div v-else class="admin-content">
      <!-- User list -->
      <div class="users-section">
        <h2>📌 Benutzer</h2>
        <!-- T75, decision Q17 (M35): admins manage the accounts themselves -->
        <button type="button" class="btn-add btn-new-user" @click="openAccountForm(null)">+ Neues Konto</button>
        <UserAccountForm v-if="accountForm" :key="accountForm.key" :user="accountForm.user"
          @saved="onAccountSaved" @cancel="accountForm = null" />
        <p v-if="accountError" class="account-error" role="alert">{{ accountError }}</p>
        <div class="user-search-wrap">
          <input
            v-model="userSearch"
            type="text"
            class="user-search-input"
            placeholder="🔍 Name oder E-Mail suchen…"
          />
          <span v-if="userSearch" class="user-search-count">{{ filteredUsers.length }} Treffer</span>
        </div>
        <div class="users-list">
          <div
            v-for="user in filteredUsers"
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

        <!-- keyed by the user: a half-filled form doesn't carry over to the next one -->
        <UserAccountCard :key="'account-' + selectedUser.user_id" :user="selectedUser" :can-delete="selectedUser.user_id !== authStore.userId"
          :busy="isRemoving" @edit="openAccountForm(selectedUser)" @delete="deleteSelectedUser" />
        <UserRolesCard :key="'roles-' + selectedUser.user_id" :user="selectedUser" :roles="availableRoles" :users="users" :busy="isAdding || isRemoving"
          @add="addRoleToUser" @remove="removeRoleFromUser" />
        <UserPermissionsCard :key="'permissions-' + selectedUser.user_id" :user="selectedUser" :permissions="availablePermissions" :busy="isAdding || isRemoving"
          @add="addPermissionToUser" @remove="removePermissionFromUser" />
      </div>

      <div v-else class="no-selection">
        <p>👇 Wählen Sie einen Benutzer aus der Liste, um dessen Rollen und Permissions zu verwalten.</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { useAdminStore } from '@/stores/entities/adminStore';
import { useAuthStore } from '@/stores/authStore.js';
import UserAccountForm from '@/components/admin/UserAccountForm.vue';
import SystemConfiguration from '@/components/admin/SystemConfiguration.vue';
import UserAccountCard from '@/components/admin/UserAccountCard.vue';
import UserRolesCard from '@/components/admin/UserRolesCard.vue';
import UserPermissionsCard from '@/components/admin/UserPermissionsCard.vue';

export default {
  name: 'AdminView',
  components: { UserAccountForm, SystemConfiguration, UserAccountCard, UserRolesCard, UserPermissionsCard },
  setup() {
    // M25 (decision Q19): data through the store, not the api/ layer
    const adminStore = useAdminStore();
    const authStore = useAuthStore();
    const users = ref([]);
    const selectedUser = ref(null);
    const selectedUserId = ref(null);
    const loading = ref(true);
    const error = ref(null);
    const isAdding = ref(false);
    const isRemoving = ref(false);

    const userSearch = ref('');

    // M35: the tabs, the account form and the delete confirmation
    // any of the user's roles, not only the first one the token names (review M35)
    const myRoles = ref([]);
    const isSuperuser = computed(() => myRoles.value.includes('Superuser'));
    const activeTab = ref('users');
    const accountForm = ref(null);
    let formKey = 0;
    const accountError = ref('');

    const filteredUsers = computed(() => {
      if (!userSearch.value.trim()) return users.value;
      const q = userSearch.value.trim().toLowerCase();
      return users.value.filter(u =>
        `${u.firstname} ${u.lastname}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });


    // For later: once the backend provides endpoints for getAllRoles/getAllPermissions
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
        
        // Load the users first
        console.log('📥 AdminView: Loading users...');
        users.value = await adminStore.fetchUsers();
        console.log(`✅ AdminView: Loaded ${users.value?.length || 0} users`);
        
        // Then roles and permissions one after the other (not in parallel)
        try {
          console.log('📥 AdminView: Loading roles...');
          availableRoles.value = await adminStore.fetchRoles();
          console.log(`✅ AdminView: Loaded ${availableRoles.value?.length || 0} roles`);
        } catch (err) {
          console.error('❌ Fehler beim Laden der Rollen:', err?.response?.status, err?.response?.data || err?.message);
          availableRoles.value = [];
          // Fall back to the default roles
        }
        
        try {
          console.log('📥 AdminView: Loading permissions...');
          availablePermissions.value = await adminStore.fetchPermissions();
          console.log(`✅ AdminView: Loaded ${availablePermissions.value?.length || 0} permissions`);
        } catch (err) {
          console.error('❌ Fehler beim Laden der Permissions:', err?.response?.status, err?.response?.data || err?.message);
          availablePermissions.value = [];
          // Fall back to the default permissions
        }
      } catch (err) {
        error.value = err.message || 'Fehler beim Laden der Benutzer';
        console.error('❌ Error loading users:', err);
      } finally {
        loading.value = false;
      }
    };

    // the list again after a change, with the selected user's new data
    const refreshUsers = async () => {
      users.value = await adminStore.fetchUsers();
      selectedUser.value = users.value.find((u) => u.user_id === selectedUserId.value) ?? null;
      if (!selectedUser.value) selectedUserId.value = null;
    };

    const openAccountForm = (user) => {
      accountError.value = '';
      accountForm.value = { user, key: ++formKey };
    };

    const onAccountSaved = async (saved) => {
      accountForm.value = null;
      if (saved?.user_id) selectedUserId.value = saved.user_id;
      await refreshUsers();
    };

    // UC-30, M14: the content moves to the ghost user
    const deleteSelectedUser = async () => {
      if (!selectedUser.value) return;
      try {
        isRemoving.value = true;
        accountError.value = '';
        await adminStore.deleteUser(selectedUser.value.user_id);
      } catch (err) {
        accountError.value = err?.response?.data?.message || 'Das Konto konnte nicht gelöscht werden.';
        return;
      } finally {
        isRemoving.value = false;
      }
      selectedUserId.value = null;
      selectedUser.value = null;
      try {
        await refreshUsers();
      } catch {
        // review M35: the deletion stands; only the list is out of date
        accountError.value = 'Das Konto wurde gelöscht, die Liste konnte aber nicht neu geladen werden.';
      }
    };

    const selectUser = async (user) => {
      console.log('👤 Selecting user:', user.username, 'ID:', user.user_id);
      selectedUserId.value = user.user_id;
      selectedUser.value = user;
      accountError.value = '';
    };

    // the cards (UserRolesCard, UserPermissionsCard) hand over what to change
    // true once it's done: only then the card clears its form
    const addRoleToUser = async (roleId) => {
      if (!selectedUser.value || !roleId) return false;

      try {
        isAdding.value = true;
        await adminStore.assignRole(selectedUser.value.user_id, roleId);
        // review M35: the list again, so the change shows
        await refreshUsers();
        return true;
      } catch (err) {
        error.value = err.message || 'Fehler beim Zuweisen der Rolle';
        console.error('Error adding role:', err);
        return false;
      } finally {
        isAdding.value = false;
      }
    };

    const removeRoleFromUser = async (roleId) => {
      if (!selectedUser.value) return;

      try {
        isRemoving.value = true;
        await adminStore.removeRole(selectedUser.value.user_id, roleId);
        // review M35: the list again, so the change shows
        await refreshUsers();
      } catch (err) {
        error.value = err.message || 'Fehler beim Entfernen der Rolle';
        console.error('Error removing role:', err);
      } finally {
        isRemoving.value = false;
      }
    };

    const addPermissionToUser = async ({ permissionId, validFrom, validTo }) => {
      if (!selectedUser.value || !permissionId) return false;

      try {
        isAdding.value = true;
        await adminStore.assignPermission(selectedUser.value.user_id, permissionId, validFrom, validTo);
        // review M35: the list again, so the change shows
        await refreshUsers();
        return true;
      } catch (err) {
        error.value = err.message || 'Fehler beim Zuweisen der Permission';
        console.error('Error adding permission:', err);
        return false;
      } finally {
        isAdding.value = false;
      }
    };

    const removePermissionFromUser = async (permissionId) => {
      if (!selectedUser.value) return;

      try {
        isRemoving.value = true;
        await adminStore.removePermission(selectedUser.value.user_id, permissionId);
        // review M35: the list again, so the change shows
        await refreshUsers();
      } catch (err) {
        error.value = err.message || 'Fehler beim Entfernen der Permission';
        console.error('Error removing permission:', err);
      } finally {
        isRemoving.value = false;
      }
    };

    onMounted(() => {
      // Check whether the user is an admin (admin or superuser)
      if (!authStore.isAdmin) {
        error.value = '⛔ Sie haben keine Berechtigung, diese Seite zu besuchen.';
        loading.value = false;
        return;
      }
      loadUsers();
      adminStore.fetchMyRoles().then((names) => { myRoles.value = names; }, () => {});
    });

    return {
      authStore,
      isSuperuser,
      activeTab,
      accountForm,
      accountError,
      openAccountForm,
      onAccountSaved,
      deleteSelectedUser,
      users,
      selectedUser,
      selectedUserId,
      loading,
      error,
      isAdding,
      isRemoving,
      availableRoles,
      availablePermissions,
      userSearch,
      filteredUsers,
      loadUsers,
      selectUser,
      addRoleToUser,
      removeRoleFromUser,
      addPermissionToUser,
      removePermissionFromUser,
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
  align-self: start;
  position: sticky;
  top: 20px;
}

.users-section h2 {
  margin-top: 0;
  color: #1a1a1a;
}

.user-search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.user-search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.user-search-input:focus {
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.12);
}

.user-search-count {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.users-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 180px);
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

/* M35: tabs, account buttons and the delete confirmation */
.admin-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
.admin-tabs button { padding: 8px 16px; border: 1px solid #4a90e2; background: white; color: #4a90e2; border-radius: 4px; cursor: pointer; }
.admin-tabs button.active { background: #4a90e2; color: white; }
.btn-new-user { margin-bottom: 12px; }
.account-error { color: #b91c1c; margin: 8px 0 0; }

/* the button for a new account; the cards have their own (admin-card.css) */
.btn-add {
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
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
}
</style>

<style>
body.dark-mode .admin-container,
.app-container.dark-mode .admin-container {
  color: #edf0fa;
}

body.dark-mode .admin-header h1,
.app-container.dark-mode .admin-header h1 {
  color: #edf0fa !important;
}

body.dark-mode .subtitle,
.app-container.dark-mode .subtitle {
  color: #b2b9cb !important;
}

body.dark-mode .users-section,
.app-container.dark-mode .users-section {
  background: #25283a !important;
  border-color: #434963 !important;
}

body.dark-mode .users-section h2,
.app-container.dark-mode .users-section h2 {
  color: #edf0fa !important;
}

body.dark-mode .user-search-input,
.app-container.dark-mode .user-search-input {
  background: #31364d !important;
  border-color: #434963 !important;
  color: #edf0fa !important;
}

body.dark-mode .user-search-input::placeholder,
.app-container.dark-mode .user-search-input::placeholder {
  color: #7a8199 !important;
}

body.dark-mode .user-search-count,
.app-container.dark-mode .user-search-count {
  color: #7a8199 !important;
}

body.dark-mode .user-card,
.app-container.dark-mode .user-card {
  background: #2a2f45 !important;
  border-color: #434963 !important;
}

body.dark-mode .user-card:hover,
.app-container.dark-mode .user-card:hover {
  background: #31364d !important;
  border-color: #5b82c2 !important;
}

body.dark-mode .user-card.active,
.app-container.dark-mode .user-card.active {
  background: #2d3a5a !important;
  border-color: #4a90e2 !important;
}

body.dark-mode .user-card-header h3,
.app-container.dark-mode .user-card-header h3 {
  color: #edf0fa !important;
}

body.dark-mode .user-id,
.app-container.dark-mode .user-id {
  background: #434963 !important;
  color: #b2b9cb !important;
}

body.dark-mode .user-email,
.app-container.dark-mode .user-email {
  color: #b2b9cb !important;
}

body.dark-mode .no-roles,
.app-container.dark-mode .no-roles {
  color: #7a8199 !important;
}

body.dark-mode .details-section,
.app-container.dark-mode .details-section {
  background: transparent !important;
}

body.dark-mode .details-section h2,
.app-container.dark-mode .details-section h2 {
  color: #edf0fa !important;
}

body.dark-mode .no-selection,
.app-container.dark-mode .no-selection {
  color: #7a8199 !important;
}

body.dark-mode .loading-spinner,
.app-container.dark-mode .loading-spinner {
  color: #b2b9cb !important;
}

/* M35 */
body.dark-mode .admin-container .admin-tabs button { background: #2c2c3e; }
body.dark-mode .admin-container .admin-tabs button.active { background: #4a90e2; }
</style>

<!-- the user cards' dark mode, unscoped and loaded once (review: not per card) -->
<style src="../components/admin/admin-card-dark.css"></style>
