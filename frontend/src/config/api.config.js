export const API_CONFIG = {
    TESTING: true,
    BASE_URL: 'http://localhost:3000',
};

export const normalizeTask = (task) => {
    if (!task) return null;
    
    if (API_CONFIG.TESTING) {
        return {
            ...task,
            task_id: task.id
        };
    }
    
    return task;
};

export const normalizeTasks = (tasks) => {
    if (!Array.isArray(tasks)) return [];
    return tasks.map(normalizeTask);
};

export const serializeTask = (task) => {
    if (!task) return null;
    
    if (API_CONFIG.TESTING) {
        const serialized = { ...task };
        if (task.task_id !== undefined) {
            serialized.id = String(task.task_id);
        }
        return serialized;
    }
    
    return task;
};

export const buildUrl = (endpoint) => {
    return `${API_CONFIG.BASE_URL}${endpoint}`;
};
