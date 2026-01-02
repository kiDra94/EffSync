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
  
