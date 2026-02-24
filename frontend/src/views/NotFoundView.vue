<script setup>
</script>

<template>
  <section class="placeholder-view">
    <h1>404 - Seite nicht gefunden</h1>
    <p>Die angeforderte Seite existiert nicht oder wurde verschoben.</p>
    <router-link class="back-link" :to="{ name: 'Dashboard' }">Zurück zum Dashboard</router-link>
  </section>
</template>

<style scoped>
.placeholder-view {
  padding: 1.5rem;
}

h1 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
}

p {
  margin: 0.25rem 0 1rem;
  color: #555;
}

.back-link {
  color: #23234c;
  text-decoration: none;
  font-weight: 600;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
