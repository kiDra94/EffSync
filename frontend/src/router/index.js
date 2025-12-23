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

router.beforeEach((to, from) => {
    const authStore = useAuthStore()
    const token = authStore.isAuthenticated
    const routeRequiresAuth = to.matched.some(routesWithAuth => routesWithAuth.meta.requiresAuth)
    const userRole = authStore.userRole

    if (!token && routeRequiresAuth) { return { name: 'Login' } }
    if (token && (to.name === 'Login' || to.name === 'Register')) { return { name: 'Dashboard' } }
    if (token && to.meta.roles) {
        if (!to.meta.roles.includes(userRole)) { return { name: 'Dashboard' } }
    }
})

export default router