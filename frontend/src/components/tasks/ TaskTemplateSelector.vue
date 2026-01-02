<template>
    <div class="template-selector">
      <label for="template-select">Vorlage verwenden (optional)</label>
      <select 
        id="template-select" 
        v-model="selectedTemplateId" 
        @change="applyTemplate"
        class="template-dropdown"
      >
        <option :value="null">-- Keine Vorlage --</option>
        <option 
          v-for="template in templates" 
          :key="template.template_id" 
          :value="template.template_id"
        >
          {{ template.name }}
        </option>
      </select>
      <p v-if="selectedTemplate" class="template-description">
        {{ selectedTemplate.description }}
      </p>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted } from 'vue';
  import { taskTemplate } from '@/stores/entities/templateStore';
  
  const emit = defineEmits(['templateSelected', null]);
  
  const templateStore = taskTemplate();
  const selectedTemplateId = ref(null);
  
  const templates = computed(() => templateStore.templates || []);
  const selectedTemplate = computed(() => 
    templates.value.find(t => t.template_id === selectedTemplateId.value)
  );
  
  onMounted(async () => {
    await templateStore.getTemplates();
  });
  
  const applyTemplate = () => {
    if (selectedTemplate.value) {
      emit('templateSelected', selectedTemplate.value);
    }
  };
  </script>
  
