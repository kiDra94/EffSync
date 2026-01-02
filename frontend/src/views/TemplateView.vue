<script setup>
import { ref, onMounted } from 'vue';
import { useTemplateStore } from '@/stores/entities/templateStore';
import TemplateList from '@/components/templates/TemplateList.vue';
import TemplateForm from '@/components/templates/TemplateForm.vue';
import TemplateDeleteDialog from '@/components/templates/TemplateDeleteDialog.vue';

const templateStore = useTemplateStore();

const activeModal = ref(null);
const selectedTemplate = ref(null);

onMounted(async () => {
    await templateStore.getTemplates();
});

const openTemplateForm = (template = null) => {
    selectedTemplate.value = template;
    activeModal.value = 'form';
};

const openDeleteDialog = (template) => {
    selectedTemplate.value = template;
    activeModal.value = 'delete';
};

const closeModal = () => {
    activeModal.value = null;
    selectedTemplate.value = null;
};

const saveTemplate = async (template) => {
    try {
        if (template.template_id) {
            await templateStore.editTemplate(template.template_id, template);
        } else {
            await templateStore.addTemplate(template);
        }
        closeModal();
    } catch (error) {
        alert('Fehler beim Speichern des Templates.');
    }
};

const deleteTemplate = async () => {
    if (selectedTemplate.value) {
        try {
            await templateStore.removeTemplate(selectedTemplate.value.template_id);
            closeModal();
        } catch (error) {
            alert('Fehler beim Löschen des Templates.');
        }
    }
};
</script>

<template>
    <div class="template-view">
        <div class="template-header">
            <h1>Meine Templates</h1>
            <button @click="openTemplateForm()" class="btn-primary">
                + Neues Template
            </button>
        </div>

        <TemplateList :templates="templateStore.templates" @edit="openTemplateForm" @delete="openDeleteDialog" />

        <TemplateForm v-if="activeModal === 'form'" :template="selectedTemplate" @save="saveTemplate"
            @close="closeModal" />

        <TemplateDeleteDialog v-if="activeModal === 'delete'" :template="selectedTemplate" @delete="deleteTemplate"
            @close="closeModal" />
    </div>
</template>

<style scoped>
.template-view {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.template-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #e5e7eb;
}

.template-header h1 {
    margin: 0;
    color: #1f2937;
    font-size: 2rem;
}

.btn-primary {
    background-color: #4f46e5;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);
}

.btn-primary:hover {
    background-color: #4338ca;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
}

.btn-primary:active {
    transform: translateY(0);
}

.btn-primary:focus {
    outline: 2px solid #4f46e5;
    outline-offset: 2px;
}
</style>