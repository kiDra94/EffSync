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

    const filteredTasks = computed(() => {
        if (filterStatus.value === 'all') return searchedTasks.value;
        return searchedTasks.value.filter(t => t.status === filterStatus.value);
    });

    const sortedTasks = computed(() => {
        const sortFunctions = {
            date: (a, b) => new Date(a.deadline) - new Date(b.deadline),
            title: (a, b) => a.title.localeCompare(b.title),
            priority: (a, b) => (b.priority_id || 0) - (a.priority_id || 0),
            progress: (a, b) => (b.progress || 0) - (a.progress || 0)
        };

        const sortFunction = sortFunctions[sortBy.value] || (() => 0);
        return [...filteredTasks.value].sort(sortFunction);
    });

    return {
        filteredAndSorted: sortedTasks,
        searchedTasks,
        filteredTasks,
        sortedTasks
    };
}
