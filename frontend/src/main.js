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

// --- HIER FEHLTE DER CODE ---

// 3. App-Instanz erstellen
const app = createApp(App)

// 4. Plugins registrieren
app.use(createPinia()) // Wichtig: Pinia aktivieren
app.use(router)        // Wichtig: Router aktivieren

// 5. App in das HTML-Element mit id="app" einhängen
app.mount('#app')