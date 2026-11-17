import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { authGuard } from "./guards";

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
        path: '/reset-password',
        name: 'ResetPassword',
        component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
        path: '/auth-callback',
        name: 'AuthCallback',
        component: () => import('@/views/AuthCallbackView.vue'),
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
                // teachers change the members of their classes (M36, UC-20)
                meta: { roles: ['admin', 'superuser', 'teacher'] },
            },
            {
                path: 'classes/:id',
                name: 'ClassDetail',
                component: () => import('@/views/ClassDetail.vue'),
                props: true,
                meta: { roles: ['admin', 'superuser', 'teacher'] },
            },
            {
                path: 'departments',
                name: 'DepartmentList',
                component: () => import('@/views/DepartmentView.vue'),
                meta: { roles: ['admin', 'superuser'] },
            },
            {
                path: 'subjects',
                name: 'SubjectList',
                component: () => import('@/views/SubjectView.vue'),
                meta: { roles: ['admin', 'superuser'] },
            },
            {
                path: 'rooms',
                name: 'RoomList',
                component: () => import('@/views/RoomView.vue'),
                meta: { roles: ['admin', 'superuser'] },
            },
            {
                path: 'admin/users',
                name: 'AdminUsers',
                component: () => import('@/views/AdminView.vue'),
                meta: { roles: ['admin', 'superuser'] },
            },
            {
                // M27 (T33, UC-32): the activity log of all tasks
                path: 'admin/audit-log',
                name: 'AuditLog',
                component: () => import('@/views/AuditLogView.vue'),
                meta: { roles: ['admin', 'superuser'] },
            },
            {
                // M27 (UC-13 "Note einsehen"): the student's grades
                path: 'grades',
                name: 'Grades',
                component: () => import('@/views/GradesView.vue'),
            },
            {
                path: 'permissions',
                name: 'PermissionsDetail',
                component: () => import('@/views/PermissionsDetailView.vue'),
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

// the guard logic lives in guards.js, so it can be tested (M29, T70)
router.beforeEach((to) => authGuard(to, useAuthStore()))

export default router