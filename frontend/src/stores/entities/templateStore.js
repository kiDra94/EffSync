import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fetchTaskTemplates, fetchTaskTemplateById, createTaskTemplate, updateTaskTemplate, deleteTaskTemplate } from '@/api/taskTemplates';


export const useTaskTemplateStore = defineStore('taskTemplate', () => {
    const templates = ref([]);


    async function getTemplates() {
        try {
            const response = await fetchTaskTemplates();
            templates.value = response.data || response;
        } catch (error) {
            console.error('Fehler beim Abrufen der Templates:', error);
            throw error;
        }
    }


    async function getTemplateById(template_id) {
        try {
            const response = await fetchTaskTemplateById(template_id);
            return response.data || response;
        } catch (error) {
            console.error('Fehler beim Abrufen des Templates:', error);
            throw error;
        }
    }


    async function addTemplate(template) {
        try {
            const newTemplate = await createTaskTemplate(template);
            templates.value.push(newTemplate.data || newTemplate);
        } catch (error) {
            console.error('Fehler beim Hinzufügen eines Templates:', error);
            throw error;
        }
    }


    async function editTemplate(template_id, template) {
        try {
            const updatedTemplate = await updateTaskTemplate(template_id, template);
            const index = templates.value.findIndex((i) => i.template_id === template_id);
            if (index !== -1) {
                templates.value[index] = updatedTemplate.data || updatedTemplate;
            }
        } catch (error) {
            console.error('Fehler beim Bearbeiten eines Templates:', error);
            throw error;
        }
    }


    async function removeTemplate(template_id) {
        try {
            await deleteTaskTemplate(template_id);
            templates.value = templates.value.filter((template) => template.template_id !== template_id);
        } catch (error) {
            console.error('Fehler beim Löschen eines Templates:', error);
            throw error;
        }
    }


    return {
        templates,
        getTemplates,
        getTemplateById,
        addTemplate,
        editTemplate,
        removeTemplate,
    };
});
