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
  import { useTemplateStore } from '@/stores/entities/templateStore';
  
  const emit = defineEmits(['templateSelected', null]);
  
  const templateStore = useTemplateStore();
  const selectedTemplateId = ref(null);
  
  const templates = computed(() => templateStore.templates || []);
  const selectedTemplate = computed(() => 
    templates.value.find(t => t.template_id === selectedTemplateId.value)
  );
  
  onMounted(async () => {
    await templateStore.getTemplates();
  });
  
  // "-- Keine Vorlage --" is a choice too: null drops the template link (M18)
  const applyTemplate = () => {
    emit('templateSelected', selectedTemplate.value ?? null);
  };
  </script>
  
  <style scoped>
  .template-selector {
    margin-bottom: 20px;
    padding: 16px;
    background-color: #f9fafb;
    border-radius: 8px;
    border: 1px dashed #d1d5db;
  }
  
  .template-selector label {
    display: block;
    margin-bottom: 8px;
    color: #374151;
    font-weight: 600;
  }
  
  .template-dropdown {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 1rem;
    background-color: white;
    cursor: pointer;
  }
  
  .template-dropdown:focus {
    outline: none;
    border-color: #4f46e5;
  }
  
  .template-description {
    margin-top: 8px;
    font-size: 0.875rem;
    color: #6b7280;
    font-style: italic;
  }
  </style>