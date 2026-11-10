import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchAuditLog } from '@/api/activityLog';

const PAGE_SIZE = 50;

/** The admin's view of the activity log (T33, UC-32, M27). */
export const useAuditLogStore = defineStore('auditLog', () => {
    const entries = ref([]);
    const meta = ref({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
    const loading = ref(false);
    const error = ref('');

    /** One page; empty filters are left out of the request. */
    async function load({ action, from, to, page = 1 } = {}) {
        loading.value = true;
        error.value = '';
        const params = Object.fromEntries(
            Object.entries({ action, from, to }).filter(([, value]) => value),
        );
        try {
            const answer = await fetchAuditLog({ ...params, page, limit: PAGE_SIZE });
            entries.value = answer.data;
            meta.value = answer.meta;
        } catch (failure) {
            entries.value = [];
            error.value = failure?.response?.status === 403
                ? 'Das Audit-Log ist nur für Administratoren.'
                : 'Das Audit-Log konnte nicht geladen werden.';
        } finally {
            loading.value = false;
        }
    }

    return { entries, meta, loading, error, load };
});
