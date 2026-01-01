<template>
    <div>
      <p>Möchtest du diese Aufgabe wirklich löschen?</p>
      <button @click="confirmDelete">Löschen</button>
      <button @click="close">Abbrechen</button>
    </div>
  </template>
  
  <script setup>
  const emit = defineEmits(['delete', 'close']);
  
  const confirmDelete = () => {
    emit('delete');
  };
  
  const close = () => {
    emit('close');
  };
  </script>