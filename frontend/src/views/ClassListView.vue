<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import ClassForm from '@/components/classes/ClassForm.vue';
import ClassDeleteDialog from '@/components/classes/ClassDeleteDialog.vue';
import { useAuthStore } from '@/stores/authStore';
import { useClassStore, useDepartmentStore, useScheduleStore } from '@/stores/entities/schoolStores';

// GOALS.md M36 (decision D1): the classes come from the API, nothing is stored in the browser
const authStore = useAuthStore();
const router = useRouter();
const classStore = useClassStore();
const departmentStore = useDepartmentStore();
const scheduleStore = useScheduleStore();

const selectedClass = ref(null);
const activeModal = ref(null);
const searchQuery = ref('');

const classes = computed(() => classStore.catalog.items);
// manage_classes: Admin and Superuser; teachers open the detail to change members (UC-20)
const canManageClasses = computed(() => authStore.isAdmin);

const filteredClasses = computed(() => {
  const query = searchQuery.value.toLowerCase();
  if (!query) return classes.value;
  return classes.value.filter((cls) => (cls.name || '').toLowerCase().includes(query));
});

const personName = (person) => (person ? `${person.firstname} ${person.lastname}` : '');

const openClassForm = async (classObj = null) => {
  if (!canManageClasses.value) return;
  await Promise.allSettled([departmentStore.load(), scheduleStore.load(), classStore.loadAssignable()]);
  selectedClass.value = classObj;
  activeModal.value = 'form';
};

const openClassDetail = (classObj) => {
  router.push({ name: 'ClassDetail', params: { id: classObj.class_id } });
};

const openDeleteDialog = (classObj) => {
  if (!canManageClasses.value) return;
  selectedClass.value = classObj;
  activeModal.value = 'delete';
};

const closeModal = () => {
  activeModal.value = null;
  selectedClass.value = null;
};

const saveClass = async ({ class_id, ...data }) => {
  try {
    if (class_id) await classStore.catalog.edit(class_id, data);
    else await classStore.catalog.add(data);
    closeModal();
  } catch {
    // the store keeps the message for the page
  }
};

const deleteClass = async () => {
  try {
    await classStore.catalog.remove(selectedClass.value.class_id);
    closeModal();
  } catch {
    closeModal();
  }
};

onMounted(() => {
  classStore.catalog.load().catch(() => {});
});
</script>

<template>
  <div class="class-view">
    <div class="class-header">
      <h1>Klassen</h1>
      <button v-if="canManageClasses" @click="openClassForm()" class="btn-primary">
        + Neue Klasse
      </button>
    </div>

    <p v-if="classStore.catalog.error" class="error-message">{{ classStore.catalog.error }}</p>

    <div class="filters" v-if="classes.length > 0">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Klasse durchsuchen..."
        class="search-input"
      />
    </div>

    <div v-if="classes.length > 0" class="classes-grid">
      <div v-for="cls in filteredClasses" :key="cls.class_id" class="class-card">
        <div class="card-header">
          <h3>{{ cls.name }}</h3>
          <div class="card-actions">
            <button @click="openClassDetail(cls)" class="btn-icon" title="Details anzeigen">👁️</button>
            <button v-if="canManageClasses" @click="openClassForm(cls)" class="btn-icon" title="Bearbeiten">✏️</button>
            <button v-if="canManageClasses" @click="openDeleteDialog(cls)" class="btn-icon btn-danger" title="Löschen">🗑️</button>
          </div>
        </div>
        <div class="card-body">
          <p v-if="cls.department"><strong>Abteilung:</strong> {{ cls.department.name }}</p>
          <p v-if="cls.head_teacher"><strong>Klassenvorstand:</strong> {{ personName(cls.head_teacher) }}</p>
          <p><strong>Schüler:</strong> {{ cls.student_count }} · <strong>Lehrer:</strong> {{ cls.teacher_count }}</p>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Noch keine Klassen vorhanden.</p>
      <button v-if="canManageClasses" @click="openClassForm()" class="btn-primary">Erste Klasse erstellen</button>
      <p v-else-if="!classStore.catalog.loading">Du hast nur Leserechte für Klassen.</p>
    </div>

    <ClassForm
      v-if="activeModal === 'form'"
      :class-obj="selectedClass"
      :departments="departmentStore.items"
      :teachers="classStore.assignable.teachers"
      :schedules="scheduleStore.items"
      @save="saveClass"
      @close="closeModal"
    />
    <ClassDeleteDialog v-if="activeModal === 'delete'" :class-obj="selectedClass" @delete="deleteClass" @close="closeModal" />
  </div>
</template>

<style scoped>
.error-message {
  color: #b91c1c;
  margin-bottom: 12px;
}

.class-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.class-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.class-header h1 {
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

.classes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.class-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.class-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.card-header {
  background: #f3f4f6;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
}

.card-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.card-actions {
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

.card-body {
  padding: 12px 16px;
}

.card-body p {
  margin: 8px 0;
  color: #555;
  font-size: 0.9rem;
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
