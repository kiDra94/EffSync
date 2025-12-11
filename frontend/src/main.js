import { createApp } from 'vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './style.css'
import App from './App.vue'
import router from './router'

const APP = createApp(App)

if (import.meta.env.DEV) { 
    localStorage.setItem('authToken', 'DEV_TOKEN')
    localStorage.setItem('userRole', 'admin')
  }
  
APP.use(router)
APP.mount('#app')
