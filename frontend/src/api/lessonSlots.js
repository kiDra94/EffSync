import { apiClient } from '@/api/httpClient';

const ENDPOINT = '/lesson-slots';

export const fetchAllLessonSlots = async () => {
    try {
        const response = await apiClient.get(ENDPOINT);
        return response.data?.data ?? response.data ?? [];
    } catch (error) {
        console.error('❌ [fetchAllLessonSlots] Fehler:', error.message);
        return [];
    }
};

export const fetchLessonSlotById = async (id) => {
    try {
        const response = await apiClient.get(`${ENDPOINT}/${id}`);
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error(`❌ [fetchLessonSlotById] Fehler beim Laden von ID ${id}:`, error.message);
        throw error;
    }
};

export const createLessonSlot = async (slotData) => {
    try {
        const response = await apiClient.post(ENDPOINT, slotData);
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error('❌ [createLessonSlot] Fehler:', error.message);
        throw error;
    }
};

export const updateLessonSlot = async (id, slotData) => {
    try {
        const response = await apiClient.patch(`${ENDPOINT}/${id}`, slotData);
        return response.data?.data ?? response.data;
    } catch (error) {
        console.error(`❌ [updateLessonSlot] Fehler bei ID ${id}:`, error.message);
        throw error;
    }
};

export const deleteLessonSlot = async (id) => {
    try {
        await apiClient.delete(`${ENDPOINT}/${id}`);
        return true;
    } catch (error) {
        console.error(`❌ [deleteLessonSlot] Fehler bei ID ${id}:`, error.message);
        throw error;
    }
};
