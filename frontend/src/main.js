import { createApp } from 'vue'
// 1. Ganz oben: Basis-Reset
import './assets/css/normalize.css' 

// 2. Frameworks
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// 3. Deine eigenen globalen Anpassungen 
import './style.css' 

import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'