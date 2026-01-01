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

    const validateTitle = (title, currentTaskId = null) => {
        if (!title || title.trim() === '') {
            errors.title = 'Titel ist erforderlich';
            return false;
        }

        if (title.trim().length < 3) {
            errors.title = 'Titel muss mindestens 3 Zeichen haben';
            return false;
        }

        if (title.length > 100) {
            errors.title = 'Titel darf maximal 100 Zeichen haben';
            return false;
        }

        const isDuplicate = existingTasks.some(t =>
            t.title.toLowerCase().trim() === title.toLowerCase().trim() &&
            t.task_id !== currentTaskId
        );

        if (isDuplicate) {
            errors.title = 'Eine Aufgabe mit diesem Titel existiert bereits';
            return false;
        }

        errors.title = '';
        return true;
    };

    
}
