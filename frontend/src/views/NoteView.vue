<script setup>
import { ref, computed, onMounted } from 'vue';
import NoteForm from '@/components/notes/NoteForm.vue';
import NoteDeleteDialog from '@/components/notes/NoteDeleteDialog.vue';
import { useNoteStore } from '@/stores/entities/noteStore';

const noteStore = useNoteStore();

const selectedNote = ref(null);
const activeModal = ref(null);
const searchQuery = ref('');
const filterPriority = ref('all');

const filteredNotes = computed(() => {
  let result = noteStore.notes;

  if (searchQuery.value) {
    result = result.filter(n =>
      n.title.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      n.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  if (filterPriority.value !== 'all') {
    result = result.filter(n => n.priority_id === filterPriority.value);
  }

  return result;
});

const openNoteForm = (note = null) => {
  selectedNote.value = note ? JSON.parse(JSON.stringify(note)) : null;
  activeModal.value = 'form';
};

const openDeleteDialog = (note) => {
  selectedNote.value = note;
  activeModal.value = 'delete';
};

const closeModal = () => {
  activeModal.value = null;
  selectedNote.value = null;
};

const saveNote = async (noteData) => {
  try {
    if (noteData.note_id) {
      await noteStore.editNote(noteData.note_id, noteData);
    } else {
      await noteStore.addNote(noteData);
    }
    closeModal();
  } catch (error) {
    console.error('Fehler beim Speichern:', error);
  }
};

const deleteNote = async () => {
  if (selectedNote.value) {
    try {
      await noteStore.removeNote(selectedNote.value.note_id);
      closeModal();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
    }
  }
};

const getPriorityColor = (priority) => {
  switch (priority) {
    case 'high': return '#dc2626';
    case 'medium': return '#f59e0b';
    case 'low': return '#10b981';
    default: return '#6b7280';
  }
};

onMounted(async () => {
  await noteStore.getNotes();
});
</script>

<template>
  <div class="note-view">
    <div class="note-header">
      <h1>Notizen</h1>
      <button @click="openNoteForm()" class="btn-primary">
        + Neue Notiz
      </button>
    </div>

    <div class="controls">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Notizensuche..."
          class="search-input"
        />
      </div>
      <select v-model="filterPriority" class="filter-select">
        <option value="all">Alle Prioritäten</option>
        <option value="high">Hoch</option>
        <option value="medium">Mittel</option>
        <option value="low">Niedrig</option>
      </select>
    </div>

    <div v-if="filteredNotes.length > 0" class="notes-list">
      <div v-for="note in filteredNotes" :key="note.note_id" class="note-card">
        <div class="note-card-header">
          <div class="note-title-section">
            <h3>{{ note.title }}</h3>
            <span class="priority-badge" :style="{ backgroundColor: getPriorityColor(note.priority) }">
              {{ note.priority }}
            </span>
          </div>
          <div class="note-actions">
            <button @click="openNoteForm(note)" class="btn-icon" title="Bearbeiten">✏️</button>
            <button @click="openDeleteDialog(note)" class="btn-icon btn-danger" title="Löschen">🗑️</button>
          </div>
        </div>

        <div class="note-card-body">
          <p class="description">{{ note.description }}</p>
          <div class="note-meta">
            <span class="author">Erstellt von: {{ note.created_by }}</span>
            <span class="date">{{ note.created_at }}</span>
            <span v-if="note.doc_count > 0" class="docs">📎 {{ note.doc_count }} Dokument(e)</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>Keine Notizen vorhanden.</p>
      <button @click="openNoteForm()" class="btn-primary">Erste Notiz erstellen</button>
    </div>

    <NoteForm v-if="activeModal === 'form'" :note="selectedNote" @save="saveNote" @close="closeModal" />
    <NoteDeleteDialog v-if="activeModal === 'delete'" :note="selectedNote" @delete="deleteNote" @close="closeModal" />
  </div>
</template>

<style scoped>
.note-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.note-header h1 {
  margin: 0;
  color: #1f2937;
  font-size: 2rem;
}

.controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-box {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95rem;
}

.filter-select {
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 0.95rem;
  cursor: pointer;
}

.notes-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
}

.note-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.note-card-header {
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-title-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.note-card-header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.priority-badge {
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.note-actions {
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

.note-card-body {
  padding: 12px 16px;
}

.description {
  margin: 0 0 12px;
  color: #555;
  line-height: 1.5;
}

.note-meta {
  display: flex;
  gap: 16px;
  font-size: 0.85rem;
  color: #999;
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
