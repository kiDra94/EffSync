import { defineStore } from 'pinia';
import { usersApi } from '@/api/usersService';

/**
 * Users for the task forms and the own permissions (M25, decision Q19):
 * the answers are the API's, unchanged.
 */
export const useUserStore = defineStore('user', () => ({
    fetchAll: () => usersApi.getAll(),
    fetchForSelection: () => usersApi.getAllForSelection(),
    fetchMyPermissions: () => usersApi.getMyPermissions(),
}));
