import { createRouter, createWebHistory } from "vue-router";

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@views/LoginView.vue'),
    },
    {
        path: '/register',
        name: 'Register',
        component: () => import('@views/RegisterView.vue'),
    },
    {
        path: '/forgot-password',
        name: 'ForgotPassword',
        component: () => import('@views/ForgotPasswordView.vue'),
    },
    {
        path: '/',
        component: () => import('@views/LayoutView.vue'),
        meta: { requiresAuth: true },
        children: [
            {
                path: 'h',
                redirect: {name: 'Dashboard'},
            },
            {
                path: '/dashboard',
                name: 'Dashboard',
                component: () => import('@views/DashboardView.vue'),
            },
            {
                path: '/tasks',
                name: 'Tasks',
                component: () => import('@views/TasksView.vue'),
            },
            {
                path: '/notes',
                name: 'Notes',
                component: () => import('@views/NotesView.vue'),
            },
            {
                path: '/templates',
                name: 'Templates',
                component: () => import('@views/TemplatesView.vue'),
            },
            {
                path: '/documents',
                name: 'Documents',
                component: () => import('@views/DocumentsView.vue'),
            },
            {
                path: '/calendar',
                name: 'Calendar',
                component: () => import('@views/CalendarView.vue'),
            },
            {
                path: '/profile',
                name: 'Profile',
                component: () => import('@views/ProfileView.vue'),
            },
            {
                path: '/schedules',
                name: 'Schedules',
                component: () => import('@views/SchedulesView.vue'),
            },
            {
                path: '/classes',
                name: 'Classes',
                component: () => import('@views/ClassesView.vue'),
            },
            {
                path: '/departments',
                name: 'Departments',
                component: () => import('@views/DepartmentsView.vue'),
            },
        ]
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@views/NotFoundView.vue'),
    },
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

export default router