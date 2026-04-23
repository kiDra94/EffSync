<template>
  <div class="permissions-container">
    <div class="header">
      <h1>🔐 Deine Permissions & Rollen</h1>
      <button @click="refreshPermissions" class="btn-refresh">
        🔄 Aktualisieren
      </button>
    </div>

    <div v-if="loading" class="loading">
      <p>Lädt Permissions...</p>
    </div>

    <div v-else-if="error" class="error">
      <p>❌ Fehler: {{ error }}</p>
    </div>

    <div v-else class="permissions-content">
      <!-- User Info -->
      <div class="user-info card">
        <h2>👤 Dein Profil</h2>
        <p><strong>User ID:</strong> {{ permissions.userId }}</p>
      </div>

      <!-- Direct Permissions -->
      <div class="section">
        <h2>🔑 Direkte Permissions ({{ permissions.directPermissions.length }})</h2>
        <div v-if="permissions.directPermissions.length === 0" class="no-data">
          Keine direkten Permissions vergeben
        </div>
        <div v-else class="permission-grid">
          <div
            v-for="perm in permissions.directPermissions"
            :key="perm.name"
            class="permission-card"
            :class="`status-${perm.status.toLowerCase()}`"
          >
            <div class="status-icon">
              {{ getStatusIcon(perm.status) }}
            </div>
            <div class="permission-details">
              <h3>{{ perm.name }}</h3>
              <p class="description">{{ perm.description }}</p>
              <p class="dates">
                📅 {{ formatDate(perm.valid_from) }} →
                {{ perm.valid_to ? formatDate(perm.valid_to) : '∞ unbegrenzt' }}
              </p>
              <span class="status-badge">{{ perm.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- User Roles -->
      <div class="section">
        <h2>👥 Deine Rollen ({{ permissions.roles.length }})</h2>
        <div v-if="permissions.roles.length === 0" class="no-data">
          Keine Rollen zugewiesen
        </div>
        <div v-else class="roles-grid">
          <div v-for="role in permissions.roles" :key="role.role_id" class="role-card">
            <h3>{{ role.name }}</h3>
            <div class="role-permissions">
              <p v-if="role.permissions.length === 0" class="no-permissions">
                Keine Permissions in dieser Rolle
              </p>
              <div v-else class="perm-list">
                <li v-for="perm in role.permissions" :key="perm.name" class="perm-item">
                  {{ perm.name }}
                </li>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Permissions from Roles -->
      <div class="section">
        <h2>🎯 Permissions durch Rollen ({{ permissions.rolePermissions.length }})</h2>
        <div v-if="permissions.rolePermissions.length === 0" class="no-data">
          Keine Permissions durch Rollen verfügbar
        </div>
        <div v-else class="role-perms-list">
          <div
            v-for="perm in permissions.rolePermissions"
            :key="perm.name"
            class="role-perm-item"
          >
            <span class="perm-name">{{ perm.name }}</span>
            <span class="perm-desc">{{ perm.description }}</span>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="summary card">
        <h3>📊 Zusammenfassung</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Gültige Permissions:</span>
            <span class="value">
              {{ permissions.directPermissions.filter(p => p.status === 'VALID').length }}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">Abgelaufen:</span>
            <span class="value expired">
              {{ permissions.directPermissions.filter(p => p.status === 'EXPIRED').length }}
            </span>
          </div>
          <div class="summary-item">
            <span class="label">Zukünftig:</span>
            <span class="value future">
              {{ permissions.directPermissions.filter(p => p.status === 'NOT_YET_VALID').length }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { usersApi } from '@/api/usersService';

const loading = ref(true);
const error = ref(null);
const permissions = ref({
  userId: null,
  directPermissions: [],
  roles: [],
  rolePermissions: []
});

const getStatusIcon = (status) => {
  switch (status) {
    case 'VALID':
      return '✅';
    case 'EXPIRED':
      return '❌';
    case 'NOT_YET_VALID':
      return '⏳';
    default:
      return '❓';
  }
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toISOString().split('T')[0];
};

const refreshPermissions = async () => {
  loading.value = true;
  error.value = null;
  try {
    const response = await usersApi.getMyPermissions();
    permissions.value = response.data;
  } catch (err) {
    error.value = err.response?.data?.message || err.message || 'Fehler beim Laden der Permissions';
    console.error('Error loading permissions:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  refreshPermissions();
});
</script>

<style scoped>
.permissions-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.header h1 {
  margin: 0;
  font-size: 28px;
}

.btn-refresh {
  padding: 10px 20px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s;
}

.btn-refresh:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  font-size: 18px;
}

.error {
  background: #f8d7da;
  color: #721c24;
  border-radius: 5px;
  border: 1px solid #f5c6cb;
}

.permissions-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-info {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.user-info p {
  margin: 10px 0;
  font-size: 16px;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #667eea;
  padding-bottom: 10px;
}

.no-data {
  padding: 20px;
  text-align: center;
  color: #999;
  font-style: italic;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
}

.permission-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  gap: 15px;
  transition: all 0.3s;
}

.permission-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.permission-card.status-valid {
  border-color: #28a745;
  background: #f0f9f6;
}

.permission-card.status-expired {
  border-color: #dc3545;
  background: #fff5f5;
}

.permission-card.status-not_yet_valid {
  border-color: #ffc107;
  background: #fffbf0;
}

.status-icon {
  font-size: 24px;
  min-width: 30px;
  text-align: center;
}

.permission-details h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.description {
  margin: 5px 0;
  color: #666;
  font-size: 14px;
}

.dates {
  margin: 8px 0;
  font-size: 12px;
  color: #999;
}

.status-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: bold;
  margin-top: 8px;
}

.permission-card.status-valid .status-badge {
  background: #28a745;
  color: white;
}

.permission-card.status-expired .status-badge {
  background: #dc3545;
  color: white;
}

.permission-card.status-not_yet_valid .status-badge {
  background: #ffc107;
  color: #333;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 15px;
}

.role-card {
  border: 2px solid #667eea;
  border-radius: 8px;
  padding: 15px;
  background: #f8f9ff;
}

.role-card h3 {
  margin: 0 0 10px 0;
  color: #667eea;
}

.role-permissions {
  font-size: 14px;
}

.no-permissions {
  color: #999;
  font-style: italic;
}

.perm-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.perm-item {
  padding: 5px 0;
  color: #555;
  border-bottom: 1px solid #e0e0e0;
}

.perm-item:last-child {
  border-bottom: none;
}

.role-perms-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.role-perm-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 5px;
  border-left: 4px solid #667eea;
}

.perm-name {
  font-weight: bold;
  color: #333;
}

.perm-desc {
  color: #666;
  font-size: 14px;
}

.summary {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.summary h3 {
  margin-top: 0;
  color: #333;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 15px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  padding: 15px;
  background: white;
  border-radius: 5px;
  text-align: center;
}

.summary-item .label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.summary-item .value {
  font-size: 24px;
  font-weight: bold;
  color: #667eea;
}

.summary-item .value.expired {
  color: #dc3545;
}

.summary-item .value.future {
  color: #ffc107;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 15px;
  }

  .header h1 {
    font-size: 22px;
  }

  .permission-grid,
  .roles-grid {
    grid-template-columns: 1fr;
  }
}
</style>
