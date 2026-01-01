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
        if (!title || typeof title !== 'string' || title.trim() === '') {
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

    const validateDescription = (description, priorityId) => {
        if (priorityId >= 3) {
            if (!description || description.trim().length < 10) {
                errors.description = 'Wichtige Aufgaben benötigen eine Beschreibung (min. 10 Zeichen)';
                return false;
            }
        }

        if (description && description.length > 500) {
            errors.description = 'Beschreibung darf maximal 500 Zeichen haben';
            return false;
        }

        errors.description = '';
        return true;
    };

    const validateDeadline = (deadline) => {
        if (!deadline) {
            errors.deadline = 'Deadline ist erforderlich';
            warnings.deadline = '';
            return false;
        }

        const selectedDate = new Date(deadline);
        const now = new Date();
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 5);

        if (selectedDate <= now) {
            errors.deadline = 'Deadline muss in der Zukunft liegen';
            warnings.deadline = '';
            return false;
        }

        if (selectedDate > maxDate) {
            errors.deadline = 'Deadline darf nicht mehr als 5 Jahre in der Zukunft liegen';
            warnings.deadline = '';
            return false;
        }

        const hoursDiff = (selectedDate - now) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
            warnings.deadline = '⚠️ Achtung: Deadline liegt in weniger als 24 Stunden!';
        } else if (hoursDiff < 48) {
            warnings.deadline = '⚠️ Hinweis: Deadline liegt in weniger als 48 Stunden';
        } else {
            warnings.deadline = '';
        }

        errors.deadline = '';
        return true;
    };

    const validateStatusProgress = (status, progress) => {
        errors.status = '';
        errors.progress = '';

        const progressNum = Number(progress);
        if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
            errors.progress = 'Fortschritt muss zwischen 0 und 100 liegen';
            return false;
        }

        if (status === 'COMPLETED' && progressNum !== 100) {
            errors.progress = 'Abgeschlossene Aufgaben müssen 100% Fortschritt haben';
            return false;
        }

        if (progressNum === 100 && status !== 'COMPLETED') {
            errors.status = 'Bei 100% Fortschritt sollte der Status "Abgeschlossen" sein';
            return false;
        }

        if (status === 'TODO' && progressNum > 0) {
            errors.progress = 'Status "Zu erledigen" sollte 0% Fortschritt haben';
            return false;
        }

        return true;
    };

    const validateProgress = (progress) => {
        const progressNum = Number(progress);
        if (isNaN(progressNum) || progressNum < 0 || progressNum > 100) {
            errors.progress = 'Fortschritt muss zwischen 0 und 100 liegen';
            return false;
        }

        errors.progress = '';
        return true;
    };

    const validateAll = (taskData, currentTaskId = null) => {
        const isTitleValid = validateTitle(taskData.title, currentTaskId);
        const isDescriptionValid = validateDescription(taskData.description, taskData.priority_id);
        const isDeadlineValid = validateDeadline(taskData.deadline);
        const isStatusProgressValid = validateStatusProgress(taskData.status, taskData.progress);

        return isTitleValid && isDescriptionValid && isDeadlineValid && isStatusProgressValid;
    };

    return {
        errors,
        warnings,
        hasErrors,
        clearError,
        clearAllErrors,
        validateTitle,
        validateDescription,
        validateDeadline,
        validateProgress,
        validateStatusProgress,
        validateAll
    };
}
