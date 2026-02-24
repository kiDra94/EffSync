import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 1. Styles (Reihenfolge ist wichtig!)
import './assets/css/normalize.css' 
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './style.css' 

// 2. Haupt-Komponenten
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/authStore'
import { setAuthStore } from '@/api/httpClient'

// 2b. Auth Store Konfiguration
const pinia = createPinia()

// 3. App-Instanz erstellen
const app = createApp(App)

// 3b. Global Error Handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
}

// 4. Plugins registrieren
app.use(pinia)
app.use(router)

// 4b. Auth Store nach Pinia initialisieren
const authStore = useAuthStore()
setAuthStore(authStore)

// 5. App in das HTML-Element mit id="app" einhängen
app.mount('#app')