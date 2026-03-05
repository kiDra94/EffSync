import { apiClient } from '@/api/httpClient';
import { normalizeEntity, normalizeEntities, serializeEntity } from '@/config/api.config';

const ENDPOINT = '/notes';
const ID_KEY = 'note_id';

export const fetchNotes = async () => {
    const response = await apiClient.get(ENDPOINT);
    const notes = response.data?.data ?? response.data;
    return normalizeEntities(notes, ID_KEY);
};

export const createNote = async (noteData) => {
    const response = await apiClient.post(ENDPOINT, serializeEntity(noteData, ID_KEY));
    return normalizeEntity(response.data, ID_KEY);
};

export const updateNote = async (note_id, noteData) => {
    const response = await apiClient.patch(`${ENDPOINT}/${note_id}`, serializeEntity(noteData, ID_KEY));
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
