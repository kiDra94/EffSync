export const API_CONFIG = {
    TESTING: true,
    BASE_URL: 'http://localhost:3000',
};

export const getIdField = () => {
    return API_CONFIG.TESTING ? 'id' : 'task_id';
};

