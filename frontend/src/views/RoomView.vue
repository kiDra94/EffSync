<script setup>
import SchoolCatalog from '@/components/school/SchoolCatalog.vue';
import { useRoomStore } from '@/stores/entities/schoolStores';

// GOALS.md M36: school rooms are managed in the app (T26, 05_…:60)
const roomStore = useRoomStore();
const fields = [
  { key: 'name', label: 'Raum', required: true },
  { key: 'type', label: 'Art' },
  { key: 'capacity', label: 'Plätze', type: 'number' },
  { key: 'building', label: 'Gebäude' },
];
</script>

<template>
  <SchoolCatalog title="Räume" singular="Raum" :store="roomStore" id-key="room_id" :fields="fields" />
</template>
