import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchNotes } from '../../api/notes';

export const useNoteStore = defineStore('note', () => {
    const notes = ref([])

    async function getNotes() {
        try {
            const response = await fetchNotes();
            notes.value = response.data || response;
        } catch (error) {
            console.error('Fehler beim Abrufen der Notes:', error);
            throw error;
        }
    }

    async function addNote(noteData) {
        try {
            const newNote = await createNote(noteData);
            notes.value.push(newNote.data || newNote);
        } catch (error) {
            console.error('Fehler beim Erstellen einer Notiz:', error);
            throw error;
        }
    }

    async function editNote(note_id, noteData) {
        try {
            const updatedNote = await updateNote(note_id, noteData);
            const index = notes.value.findIndex((n) => n.note_id === note_id);
            if (index !== -1) {
                notes.value[index] = updatedNote.data || updatedNote;
            }
        } catch (error) {
            console.error('Fehler beim Bearbeiten einer Notiz:', error);
            throw error;
        }
    }

    async function removeNote(note_id) {
        try {
            await deleteNote(note_id);
            notes.value = notes.value.filter((n) => n.note_id !== note_id);
        } catch (error) {
            console.error('Fehler beim Löschen einer Notiz:', error);
            throw error;
        }
    }

    async function shareNoteWithUser(note_id, user_id) {
        try {
            await shareNote(note_id, user_id);
        } catch (error) {
            console.error('Fehler beim Teilen einer Notiz:', error);
            throw error;
        }
    }

    return {
        notes,
        getNotes,
        addNote,
        editNote,
        removeNote,
        shareNoteWithUser,
    };
});