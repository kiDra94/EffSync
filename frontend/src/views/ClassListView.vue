<script setup>
import { ref, computed, onMounted } from 'vue';
import ClassForm from '@/components/classes/ClassForm.vue';
import ClassDeleteDialog from '@/components/classes/ClassDeleteDialog.vue';
import { useAuthStore } from '@/stores/authStore';

const STORAGE_KEY = 'effsync_classes';

// Default mock data
const defaultClasses = [
  { class_id: 1, name: '3AKIFT', department_name: 'Informationstechnologie', head_teacher_name: 'Dr. Müller' },
  { class_id: 2, name: '3AKITE', department_name: 'Informationstechnologie', head_teacher_name: 'Prof. Schmidt' },
  { class_id: 3, name: '4AKIFT', department_name: 'Informationstechnologie', head_teacher_name: 'Dr. Weber' },
];

const classes = ref([]);
const selectedClass = ref(null);
const activeModal = ref(null);
const searchQuery = ref('');
const authStore = useAuthStore();

const canManageClasses = computed(() => {
  const role = (authStore.userRole || '').toLowerCase();
  return ['admin', 'superuser', 'director'].includes(role);
});

const filteredClasses = computed(() => {
  if (!searchQuery.value) return classes.value;
  return classes.value.filter(cls =>
    cls.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// localStorage Funktionen
const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      classes.value = JSON.parse(stored);
    } else {
      classes.value = JSON.parse(JSON.stringify(defaultClasses));
      saveToStorage();
    }
  } catch (error) {
    console.error('Fehler beim Laden aus localStorage:', error);
    classes.value = JSON.parse(JSON.stringify(defaultClasses));
  }
};

const saveToStorage = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(classes.value));
  } catch (error) {
    console.error('Fehler beim Speichern in localStorage:', error);
  }
};

const openClassForm = (classObj = null) => {
  if (!canManageClasses.value) return;
  selectedClass.value = classObj ? JSON.parse(JSON.stringify(classObj)) : null;
  activeModal.value = 'form';
};

const openClassDetail = (classObj) => {
  console.log('Detail für Klasse:', classObj);
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

const saveClass = async (classData) => {
  if (!canManageClasses.value) return;
  try {
    if (classData.class_id) {
      const index = classes.value.findIndex(c => c.class_id === classData.class_id);
      if (index !== -1) {
        classes.value[index] = classData;
      }
    } else {
      classData.class_id = Math.max(...classes.value.map(c => c.class_id), 0) + 1;
      classes.value.push(classData);
    }
    saveToStorage();
    closeModal();
  } catch (error) {
    console.error('Fehler beim Speichern der Klasse:', error);
  }
};

const deleteClass = async () => {
  if (!canManageClasses.value) return;
  if (selectedClass.value) {
    try {
      classes.value = classes.value.filter(c => c.class_id !== selectedClass.value.class_id);
      saveToStorage();
      closeModal();
    } catch (error) {
      console.error('Fehler beim Löschen der Klasse:', error);
    }
  }
};

onMounted(() => {
  loadFromStorage();
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
          <p v-if="cls.department_name"><strong>Abteilung:</strong> {{ cls.department_name }}</p>
          <p v-if="cls.head_teacher_name"><strong>Klassenvorstand:</strong> {{ cls.head_teacher_name }}</p>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Noch keine Klassen vorhanden.</p>
      <button v-if="canManageClasses" @click="openClassForm()" class="btn-primary">Erste Klasse erstellen</button>
      <p v-else>Du hast nur Leserechte für Klassen.</p>
    </div>

    <ClassForm v-if="activeModal === 'form'" :class-obj="selectedClass" @save="saveClass" @close="closeModal" />
    <ClassDeleteDialog v-if="activeModal === 'delete'" :class-obj="selectedClass" @delete="deleteClass" @close="closeModal" />
  </div>
</template>

<style scoped>
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
