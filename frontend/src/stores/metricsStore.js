import { defineStore } from 'pinia';
import { fetchMetrics } from '@/api/metrics';
import { fetchDocuments } from '@/api/documents';
import { fetchAllLessonSlots } from '@/api/lessonSlots';
import {
    classesApi,
    departmentsApi,
    subjectsApi,
    roomsApi,
} from '@/api/schoolOrganization';

/** A list from an answer that may wrap it in `data` (or `data.data`). */
const listOf = (input) => {
    if (Array.isArray(input)) return input;
    if (Array.isArray(input?.data)) return input.data;
    if (Array.isArray(input?.data?.data)) return input.data.data;
    return [];
};

/**
 * The dashboard's data (FA-30 to FA-35, M24): the metrics and the counts of
 * the tiles. The dashboard and its charts read them through this store, not
 * through the api/ layer (M25, decision Q19).
 */
export const useMetricsStore = defineStore('metrics', () => {
    /** One metric, e.g. 'trends' with `{ period: 'week' }`. */
    function getMetric(type, params) {
        return params === undefined ? fetchMetrics(type) : fetchMetrics(type, params);
    }

    /**
     * The tile counts, in parallel; a failed request counts 0, the open tasks
     * null (the dashboard then counts its loaded tasks). Subjects and rooms
     * only for admins (the tiles they see).
     */
    async function loadDashboardCounts({ userId, isAdmin }) {
        const notShown = Promise.resolve([]);
        const [progress, classes, documents, slots, departments, subjects, rooms] =
            await Promise.allSettled([
                fetchMetrics('task-progress'),
                classesApi.list(),
                fetchDocuments(),
                fetchAllLessonSlots(),
                departmentsApi.list(),
                isAdmin ? subjectsApi.list() : notShown,
                isAdmin ? roomsApi.list() : notShown,
            ]);
        const count = (result) =>
            result.status === 'fulfilled' ? listOf(result.value).length : 0;
        const ownDocuments =
            documents.status === 'fulfilled'
                ? listOf(documents.value).filter((doc) => Number(doc?.added_by) === Number(userId)).length
                : 0;
        const value = progress.status === 'fulfilled' ? progress.value : null;
        const openTasks = value
            ? Number(value.openTasks ?? Math.max(0, Number(value.totalTasks ?? 0) - Number(value.completedTasks ?? 0)))
            : null;

        return {
            openTasks,
            classes: count(classes),
            ownDocuments,
            lessonSlots: count(slots),
            departments: count(departments),
            subjects: count(subjects),
            rooms: count(rooms),
        };
    }

    return { getMetric, loadDashboardCounts };
});
