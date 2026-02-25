export const API_CONFIG = {
    BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
};

export const normalizeTask = (task) => {
    if (!task) return null;

        return {
            ...task,
            task_id: task.task_id ?? task.id,
        };
};

export const normalizeTasks = (tasks) => {
    if (!Array.isArray(tasks)) return [];
    return tasks.map(normalizeTask);
};

export const serializeTask = (task) => {
    if (!task) return null;

    const { task_id, id, ...rest } = task;
    const serialized = { ...rest };
    if (task_id !== undefined) {
        serialized.task_id = task_id;
    } else if (id !== undefined) {
        serialized.id = id;
    }

    return serialized;
};

export const buildUrl = (endpoint) => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
};

export const normalizeUser = (user) => {
    if (!user) return null;
    if (API_CONFIG.TESTING) {
        return {
            ...user,
            id: user.user_id || user.id
        };
    }

    return user;
};