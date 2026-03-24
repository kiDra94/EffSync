<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const darkMode = ref('system')

const updateDarkMode = () => {
  const body = document.body
  
  body.classList.remove('dark-mode')
  
  if (darkMode.value === 'dark') {
    body.classList.add('dark-mode')
  } else if (darkMode.value === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      body.classList.add('dark-mode')
    }
  }
  
  localStorage.setItem('darkMode', darkMode.value)
}

const initDarkMode = () => {
  const saved = localStorage.getItem('darkMode')
  darkMode.value = saved || 'system'
  updateDarkMode()
}

watch(darkMode, updateDarkMode)

const mql = window.matchMedia('(prefers-color-scheme: dark)')
mql.addEventListener('change', updateDarkMode)

onMounted(initDarkMode)
onUnmounted(() => mql.removeEventListener('change', updateDarkMode))
</script>

<template>
  <div class="dark-mode-section">
    <label class="dark-mode-label">
      <span>🌙 Dark Mode</span>
      <div class="dark-mode-toggle">
        <button 
          class="toggle-btn light" 
          :class="{ active: darkMode === 'light' }"
          @click="darkMode = 'light'"
        >
          ☀️ Light
        </button>
        <button 
          class="toggle-btn dark" 
          :class="{ active: darkMode === 'dark' }"
          @click="darkMode = 'dark'"
        >
          🌙 Dark
        </button>
        <button 
          class="toggle-btn system" 
          :class="{ active: darkMode === 'system' }"
          @click="darkMode = 'system'"
        >
          💻 System
        </button>
      </div>
    </label>
  </div>
</template>

<style scoped>
.dark-mode-section {
  padding: 24px;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.dark-mode-label {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dark-mode-label span {
  font-weight: 600;
  color: #1e293b;
  font-size: 1.1rem;
}

.dark-mode-toggle {
  display: flex;
  gap: 12px;
}

.toggle-btn {
  flex: 1;
  padding: 14px 8px;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.95rem;
  font-weight: 500;
  color: #64748b;
}

.toggle-btn:hover {
  border-color: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.toggle-btn.active {
  border-color: #4f46e5;
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: white;
  box-shadow: 0 6px 20px rgba(79, 70, 229, 0.4);
}

.toggle-btn.system.active {
  background: linear-gradient(135deg, #10b981, #059669);
}
</style>
