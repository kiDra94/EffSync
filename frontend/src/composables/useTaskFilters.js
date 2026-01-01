import { computed } from 'vue';

export function useTaskFilters(tasks, searchQuery, filterStatus, sortBy) {

    const searchedTasks = computed(() => {
        if (!searchQuery.value) return tasks.value;

        const query = searchQuery.value.toLowerCase();
        return tasks.value.filter(t =>
            t.title?.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)
        );
    });

    
}
