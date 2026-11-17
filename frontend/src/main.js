import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 1. Styles (the order matters!)
import './assets/css/normalize.css' 
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './style.css' 

// 2. Main components
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/authStore'
import { setAuthStore } from '@/api/httpClient'

// 2b. Auth store configuration
const pinia = createPinia()

// 3. Create the app instance
const app = createApp(App)

// 3b. Global Error Handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue Error:', err, info)
}

// 4. Register the plugins
app.use(pinia)
app.use(router)

// 4b. Initialize the auth store after Pinia
const authStore = useAuthStore()
setAuthStore(authStore)

// 5. Mount the app on the HTML element with id="app"
app.mount('#app')