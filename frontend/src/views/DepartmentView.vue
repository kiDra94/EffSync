<script setup>
import { computed, onMounted, ref } from 'vue';
import DepartmentForm from '@/components/departments/DepartmentForm.vue';
import DepartmentDeleteDialog from '@/components/departments/DepartmentDeleteDialog.vue';
import { useDepartmentStore } from '@/stores/entities/schoolStores';

// GOALS.md M36 (decision D1): departments from the API, nothing in the browser
const departmentStore = useDepartmentStore();
const selectedDepartment = ref(null);
const activeModal = ref(null);
const searchQuery = ref('');

const departments = computed(() => departmentStore.items);
const filteredDepartments = computed(() => {
  const query = searchQuery.value.toLowerCase();
  if (!query) return departments.value;
  return departments.value.filter((dept) => (dept.name || '').toLowerCase().includes(query));
});

const openDepartmentForm = (dept = null) => {
  selectedDepartment.value = dept ? { ...dept } : null;
  activeModal.value = 'form';
};

const openDeleteDialog = (dept) => {
  selectedDepartment.value = dept;
  activeModal.value = 'delete';
};

const closeModal = () => {
  activeModal.value = null;
  selectedDepartment.value = null;
};

const saveDepartment = async ({ department_id, name }) => {
  try {
    if (department_id) await departmentStore.edit(department_id, { name });
    else await departmentStore.add({ name });
    closeModal();
  } catch {
    // the store keeps the message for the page
  }
};

const deleteDepartment = async () => {
  try {
    await departmentStore.remove(selectedDepartment.value.department_id);
  } catch {
    // e.g. 409: the department still has classes
  }
  closeModal();
};

onMounted(() => {
  departmentStore.load().catch(() => {});
});
</script>

<template>
  <div class="department-view">
    <div class="department-header">
      <h1>Abteilungen</h1>
      <button @click="openDepartmentForm()" class="btn-primary">
        + Neue Abteilung
      </button>
    </div>

    <p v-if="departmentStore.error" class="error-message">{{ departmentStore.error }}</p>

    <div class="filters" v-if="departments.length > 0">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Abteilung durchsuchen..."
        class="search-input"
      />
    </div>

    <div v-if="filteredDepartments.length > 0" class="table-container">
      <table class="departments-table">
        <thead>
          <tr>
            <th>Abteilungsname</th>
            <th>Klassen</th>
            <th style="width: 120px;">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dept in filteredDepartments" :key="dept.department_id">
            <td>
              <strong>{{ dept.name }}</strong>
            </td>
            <td>{{ dept.class_count }}</td>
            <td>
              <div class="action-buttons">
                <button @click="openDepartmentForm(dept)" class="btn-icon" title="Bearbeiten">✏️</button>
                <button @click="openDeleteDialog(dept)" class="btn-icon btn-danger" title="Löschen">🗑️</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state">
      <p>Noch keine Abteilungen vorhanden.</p>
      <button @click="openDepartmentForm()" class="btn-primary">Erste Abteilung erstellen</button>
    </div>

    <DepartmentForm v-if="activeModal === 'form'" :department="selectedDepartment" @save="saveDepartment" @close="closeModal" />
    <DepartmentDeleteDialog v-if="activeModal === 'delete'" :department="selectedDepartment" @delete="deleteDepartment" @close="closeModal" />
  </div>
</template>

<style scoped>
.error-message {
  color: #b91c1c;
  margin-bottom: 12px;
}

.department-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.department-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.department-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 2rem;
}

.filters {
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 300px;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
}

.table-container {
  overflow-x: auto;
}

.departments-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.departments-table thead {
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
}

.departments-table th {
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: #6b7280;
  font-size: 0.9rem;
}

.departments-table tbody tr {
  border-bottom: 1px solid #e5e7eb;
  transition: background 0.2s;
}

.departments-table tbody tr:hover {
  background: #f9fafb;
}

.departments-table td {
  padding: 12px 16px;
  color: #1f2937;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.btn-icon:hover {
  background: rgba(0, 0, 0, 0.05);
}

.btn-icon.btn-danger:hover {
  background: rgba(229, 62, 62, 0.1);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
  background-color: #4338ca;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
}
</style>
