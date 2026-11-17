import { defineStore } from 'pinia';
import { adminService } from '@/api/adminService.js';

/** The admin view's users, roles and permissions (M25, decision Q19). */
export const useAdminStore = defineStore('admin', () => ({
    fetchUsers: () => adminService.getAllUsers(),
    fetchRoles: () => adminService.getAllRoles(),
    fetchPermissions: () => adminService.getAllPermissions(),
    createUser: (data) => adminService.createUser(data),
    updateUser: (userId, changes) => adminService.updateUser(userId, changes),
    deleteUser: (userId) => adminService.deleteUser(userId),
    fetchMyRoles: () => adminService.getMyRoleNames(),
    setRolePermissions: (roleId, permissions) => adminService.setRolePermissions(roleId, permissions),
    assignRole: (userId, roleId) => adminService.assignRoleToUser(userId, roleId),
    removeRole: (userId, roleId) => adminService.removeRoleFromUser(userId, roleId),
    assignPermission: (userId, permissionId, validFrom, validTo) =>
        adminService.assignPermissionToUser(userId, permissionId, validFrom, validTo),
    removePermission: (userId, permissionId) => adminService.removePermissionFromUser(userId, permissionId),
}));
