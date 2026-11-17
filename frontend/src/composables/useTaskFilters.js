import { computed, ref } from 'vue';

const DAY = 24 * 60 * 60 * 1000;

// T57 (M18): the due-date filter; 'overdue' means past and not completed
function matchesDue(task, due, now) {
    if (due === 'all') return true;
    if (due === 'none') return !task.deadline;
    if (!task.deadline) return false;
    const deadline = new Date(task.deadline).getTime();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const today = startOfToday.getTime();
    if (due === 'overdue') return deadline < now.getTime() && task.status !== 'COMPLETED';
    if (due === 'today') return deadline >= today && deadline < today + DAY;
    // today and the six days after it
    if (due === 'week') return deadline >= today && deadline < today + 7 * DAY;
    return true;
}

export function useTaskFilters(tasks, searchQuery, filterStatus, sortBy, options = {}) {
    const filterPriority = options.filterPriority ?? ref('all');
    const filterDue = options.filterDue ?? ref('all');

    const searchedTasks = computed(() => {
        if (!searchQuery.value) return tasks.value;

        const query = searchQuery.value.toLowerCase();
        return tasks.value.filter(t =>
            t.title?.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query)
        );
    });

    const filteredTasks = computed(() => {
        const now = new Date();
        return searchedTasks.value.filter(t =>
            (filterStatus.value === 'all' || t.status === filterStatus.value) &&
            (filterPriority.value === 'all' || Number(t.priority_id) === Number(filterPriority.value)) &&
            matchesDue(t, filterDue.value, now)
        );
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
