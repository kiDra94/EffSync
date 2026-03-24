import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/views/LoginView.vue'),
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@/views/RegisterView.vue'),
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('@/views/ForgotPasswordView.vue'),
    },
    {
        path: '/',
        component: () => import('@/views/LayoutView.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                redirect: { name: 'Dashboard' },
            },
            {
                path: 'dashboard',
                name: 'Dashboard',
                component: () => import('@/views/DashboardView.vue'),
            },
            {
                path: 'tasks',
                name: 'TaskList',
                component: () => import('@/views/TaskView.vue'),
            },
            {
                path: 'notes',
                name: 'NoteLists',
                component: () => import('@/views/NoteView.vue'),
            },
            {
                path: 'templates',
                name: 'TemplateLists',
                component: () => import('@/views/TemplateView.vue'),
            },
            {
                path: 'documents',
                name: 'DocumentList',
                component: () => import('@/views/DocumentView.vue'),
            },
            {
                path: 'calendar',
                name: 'Calendar',
                component: () => import('@/views/CalendarView.vue'),
            },
            {
                path: 'profile/:id',
                name: 'UserProfile',
                component: () => import('@/views/UserProfileView.vue'),
                props: true,
            },
            {
                path: 'schedules',
                name: 'Schedules',
                component: () => import('@/views/SchedulesView.vue'),
            },
            {
                path: 'classes',
                name: 'ClassList',
                component: () => import('@/views/ClassListView.vue'),
                meta: { roles: ['admin', 'teacher',] },
            },
            {
                path: 'classes/:id',
                name: 'ClassDetail',
                component: () => import('@/views/ClassDetail.vue'),
                props: true,
            },
            {
                path: 'departments',
                name: 'DepartmentList',
                component: () => import('@/views/DepartmentView.vue'),
                meta: { roles: ['admin'] },
            },
            {
                path: 'chat',
                name: 'Chat',
                component: () => import('@/views/ChatView.vue'),
            },
            {
                path: 'settings',
                name: 'Settings',
                component: () => import('@/views/SettingsView.vue'),
            },
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/NotFoundView.vue'),
    },
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

// --- Optimierter Navigation Guard ---
router.beforeEach(async (to) => {
    const authStore = useAuthStore()

    // isAuthenticated ist ein Boolean, token ist der String.
    // Wir prüfen hier auf den Token im State (oder LocalStorage durch initDevMode)
    const hasToken = authStore.isAuthenticated

    const routeRequiresAuth = to.matched.some(record => record.meta.requiresAuth)

    // 1. Nicht eingeloggt & Route braucht Auth -> Login
    if (!hasToken && routeRequiresAuth) {
        return { name: 'Login' }
    }

    // 2. Eingeloggt & will zu Login/Register -> Dashboard
    if (hasToken && (to.name === 'Login' || to.name === 'Register')) {
        return { name: 'Dashboard' }
    }

    // 3. User Daten laden (für F5 Refresh), falls Token da ist, aber User leer
    if (hasToken && !authStore.userDetails) {
        try {
            await authStore.loadUser()
        } catch (error) {
            // Falls Token ungültig war -> Logout passiert im Store, hier Redirect
            console.error('Fehler beim Laden der Benutzerdaten:', error)
            return { name: 'Login' }
        }
    }

    // 4. Rollen-Check (erst NACHDEM User geladen wurde)
    if (hasToken && to.meta.roles) {
        // Jetzt ist userRole sicher verfügbar
        if (!to.meta.roles.includes(authStore.userRole)) {
            // Optional: Redirect zu einer "Unauthorized" Seite oder zurück zum Dashboard
            console.warn('Zugriff verweigert: Fehlende Rolle')
            return { name: 'Dashboard' }
        }
    }

    return true
})

export default router