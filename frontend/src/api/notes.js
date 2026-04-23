import { apiClient } from '@/api/httpClient';
import { normalizeEntity, normalizeEntities, serializeEntity } from '@/config/api.config';

const ENDPOINT = '/notes';
const ID_KEY = 'note_id';

const sanitizeNotePayload = (noteData = {}) => {
    const payload = {
        title: (noteData.title || '').trim(),
        description: (noteData.description || '').trim() || (noteData.title || '').trim() || 'Ohne Beschreibung',
    };

    if (typeof noteData.subject_id === 'number') payload.subject_id = noteData.subject_id;
    if (typeof noteData.task_id === 'number') payload.task_id = noteData.task_id;

    if (typeof noteData.priority === 'string') {
        const p = noteData.priority.toLowerCase();
        if (['low', 'medium', 'high'].includes(p)) payload.priority = p;
    }

    if (typeof noteData.priority_id === 'number') {
        payload.priority_id = noteData.priority_id;
    }

    return payload;
};

export const fetchNotes = async () => {
    const response = await apiClient.get(ENDPOINT);
    const notes = response.data?.data ?? response.data;
    return normalizeEntities(notes, ID_KEY);
};

export const createNote = async (noteData) => {
    const response = await apiClient.post(ENDPOINT, serializeEntity(sanitizeNotePayload(noteData), ID_KEY));
    return normalizeEntity(response.data, ID_KEY);
};

export const updateNote = async (note_id, noteData) => {
    const response = await apiClient.patch(`${ENDPOINT}/${note_id}`, serializeEntity(sanitizeNotePayload(noteData), ID_KEY));
    return normalizeEntity(response.data, ID_KEY);
};

export const deleteNote = async (note_id) => {
    const response = await apiClient.delete(`${ENDPOINT}/${note_id}`);
    return response.data;
};

export const shareNote = async (note_id, user_id) => {
    const response = await apiClient.post(`${ENDPOINT}/${note_id}/share`, { user_id });
    return response.data;
};
