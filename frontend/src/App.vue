<script setup>
import { ref, watch } from "vue";
import Dashboard from "./components/Dashboard.vue";

const isDark = ref(false);

// toggle dark mode class on <body>
watch(isDark, (val) => {
  document.body.classList.toggle("dark-mode", val);
});
</script>

<template>
  <div :class="{ 'dark-mode': isDark }" class="app-container">
    <!-- Sidebar -->
    <div class="sidebar">
      <a href="#">🏠</a>
      <a href="#">🗓️</a>
      <a href="#">📂</a>
      <a href="#">🏢</a>
      <a href="#">📋</a>
      <a href="#">❓</a>
    </div>

    <!-- Main content area -->
    <div class="main-wrapper">
      <!-- Header -->
      <div class="header">
        <div class="logo"><strong>EffSync</strong></div>

        <input type="search" placeholder="Search..." />

        <div class="header-actions">
          <div>👤</div>

          <label class="switch-label">
            <input type="checkbox" class="checkbox" v-model="isDark" />
            <span class="slider"></span>
          </label>
        </div>
      </div>

      <!-- Page Content (Dashboard) -->
      <div class="content">
        <Dashboard />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* layout */
.app-container {
  display: flex;
  height: 100vh;
}

/* Sidebar */
.sidebar {
  width: 80px;
  background-color: #23234c;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 20px;
}

.sidebar a {
  color: white;
  text-decoration: none;
  margin: 20px 0;
  font-size: 22px;
}

/* Header */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header {
  height: 60px;
  background-color: white;
  padding: 0 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #ddd;
}

.dark-mode .header {
  background-color: #2c2c3e;
  border-bottom: 1px solid #444;
}

.header input[type="search"] {
  padding: 5px 10px;
  width: 300px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

/* Dark mode toggler */
.switch-label {
  position: relative;
  width: 60px;
  height: 30px;
  background-color: #28292c;
  border-radius: 25px;
  cursor: pointer;
}

.checkbox {
  display: none;
}

.slider {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 25px;
  transition: 0.3s;
}

.slider::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #d8dbe0;
  transition: 0.3s;
}

.checkbox:checked ~ .slider {
  background-color: #d8dbe0;
}

.checkbox:checked ~ .slider::before {
  transform: translateX(28px);
  background-color: #28292c;
}

/* Page Content */
.content {
  padding: 20px 30px;
  overflow-y: auto;
  flex: 1;
}

/* Dark mode body */
.dark-mode {
  background-color: #1e1e2f;
  color: #ddd;
}
</style>
