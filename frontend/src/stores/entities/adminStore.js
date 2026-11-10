import { defineStore } from 'pinia';
import { adminService } from '@/api/adminService.js';

/** The admin view's users, roles and permissions (M25, decision Q19). */
export const useAdminStore = defineStore('admin', () => ({
    fetchUsers: () => adminService.getAllUsers(),
    fetchRoles: () => adminService.getAllRoles(),
    fetchPermissions: () => adminService.getAllPermissions(),
    assignRole: (userId, roleId) => adminService.assignRoleToUser(userId, roleId),
    removeRole: (userId, roleId) => adminService.removeRoleFromUser(userId, roleId),
    assignPermission: (userId, permissionId, validFrom, validTo) =>
        adminService.assignPermissionToUser(userId, permissionId, validFrom, validTo),
    removePermission: (userId, permissionId) => adminService.removePermissionFromUser(userId, permissionId),
}));
