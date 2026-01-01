import { reactive, computed } from 'vue';

export function useTaskValidation(existingTasks = []) {
    const errors = reactive({
        title: '',
        description: '',
        deadline: '',
        status: '',
        progress: ''
    });

    const warnings = reactive({
        deadline: ''
    });

    const hasErrors = computed(() => {
        return Object.values(errors).some(error => error !== '');
    });

    const clearError = (field) => {
        errors[field] = '';
    };

    const clearAllErrors = () => {
        Object.keys(errors).forEach(key => {
            errors[key] = '';
        });
    };

    
}
