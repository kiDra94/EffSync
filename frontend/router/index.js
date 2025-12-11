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
                path: '',
                redirect: {name: 'Dashboard'},
            },
            {
                path: '/dashboard',
                name: 'Dashboard',
                component: () => import('@views/DashboardView.vue'),
            },
            {
                path: '/tasks',
                name: 'TasksList',
                component: () => import('@views/TasksView.vue'),
            },
            {
                path: '/notes',
                name: 'NotesLists',
                component: () => import('@views/NotesView.vue'),
            },
            {
                path: '/templates',
                name: 'TemplatesLists',
                component: () => import('@views/TemplatesView.vue'),
            },
            {
                path: '/documents',
                name: 'DocumentList',
                component: () => import('@views/DocumentsView.vue'),
            },
            {
                path: '/calendar',
                name: 'Calendar',
                component: () => import('@views/CalendarView.vue'),
            },
            {
                path: '/profile',
                name: 'UserProfile',
                component: () => import('@views/UserProfileView.vue'),
            },
            {
                path: '/schedules',
                name: 'Schedules',
                component: () => import('@views/SchedulesView.vue'),
            },
            {
                path: '/classes',
                name: 'ClassLists',
                component: () => import('@views/ClassesView.vue'),
            },
            {
                path: '/classes/:id',
                name: 'ClassDetail',
                component: () => import('@views/ClassDetail.vue'),
            },
            {
                path: '/departments',
                name: 'DepartmentList',
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