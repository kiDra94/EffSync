import { defineStore } from 'pinia';
import { fetchAllLessonSlots } from '@/api/lessonSlots';

/** The lesson slots of the calendar (M25, decision Q19). */
export const useLessonSlotStore = defineStore('lessonSlot', () => ({
    fetchAll: () => fetchAllLessonSlots(),
}));
