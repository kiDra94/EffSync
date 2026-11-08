<script setup>
import SchoolCatalog from '@/components/school/SchoolCatalog.vue';
import { useSubjectStore } from '@/stores/entities/schoolStores';

// GOALS.md M36: subjects are managed in the app (T26, 05_…:60)
const subjectStore = useSubjectStore();
const fields = [
  { key: 'name', label: 'Fach', required: true },
  { key: 'short_name', label: 'Kürzel' },
];
</script>

<template>
  <SchoolCatalog title="Fächer" singular="Fach" :store="subjectStore" id-key="subject_id" :fields="fields" />
</template>
