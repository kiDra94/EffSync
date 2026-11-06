import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskMembersApi } from './taskMembers';
import { apiClient } from './httpClient';

vi.mock('./httpClient');

describe('taskMembersApi', () => {
  const mockTaskId = 42;
  const mockUserId = 5;
  const mockData = { user_id: mockUserId };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTaskMembers', () => {
    it('calls correct endpoint', async () => {
      const mockMembers = [
        { user_id: 1, firstname: 'John', lastname: 'Doe' },
        { user_id: 2, firstname: 'Jane', lastname: 'Smith' }
      ];

      apiClient.get = vi.fn().mockResolvedValue({ data: mockMembers });

      const result = await taskMembersApi.getTaskMembers(mockTaskId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/tasks/${mockTaskId}/members`);
      expect(result.data).toEqual(mockMembers);
    });

    it('with different task ids', async () => {
      const taskIds = [1, 10, 100, 999];

      apiClient.get = vi.fn().mockResolvedValue({ data: [] });

      for (const id of taskIds) {
        await taskMembersApi.getTaskMembers(id);
        expect(apiClient.get).toHaveBeenCalledWith(`/api/tasks/${id}/members`);
      }

      expect(apiClient.get).toHaveBeenCalledTimes(taskIds.length);
    });

    it('handles API error', async () => {
      const error = new Error('Network error');
      apiClient.get = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.getTaskMembers(mockTaskId);
        expect(true).toBe(false); // Should not reach here
      } catch (e) {
        expect(e.message).toBe('Network error');
      }
    });

    it('returns empty array when no members', async () => {
      apiClient.get = vi.fn().mockResolvedValue({ data: [] });

      const result = await taskMembersApi.getTaskMembers(mockTaskId);

      expect(result.data).toEqual([]);
    });
  });

  describe('addTaskMember', () => {
    it('calls correct endpoint with correct data', async () => {
      const mockResponse = { status: 201, data: mockData };
      apiClient.post = vi.fn().mockResolvedValue(mockResponse);

      const result = await taskMembersApi.addTaskMember(mockTaskId, mockData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/tasks/${mockTaskId}/members`,
        mockData
      );
      expect(result.data).toEqual(mockData);
    });

    it('with different user ids', async () => {
      apiClient.post = vi.fn().mockResolvedValue({ data: {} });

      const userIds = [1, 5, 10, 100];
      for (const id of userIds) {
        await taskMembersApi.addTaskMember(mockTaskId, { user_id: id });
        expect(apiClient.post).toHaveBeenCalledWith(
          `/api/tasks/${mockTaskId}/members`,
          { user_id: id }
        );
      }

      expect(apiClient.post).toHaveBeenCalledTimes(userIds.length);
    });

    it('throws error when user already member', async () => {
      const error = new Error('User is already a member');
      apiClient.post = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.addTaskMember(mockTaskId, mockData);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('already a member');
      }
    });

    it('throws error when user not found', async () => {
      const error = new Error('User not found');
      apiClient.post = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.addTaskMember(mockTaskId, { user_id: 99999 });
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('not found');
      }
    });

    it('returns user object with task member data', async () => {
      const mockResponse = {
        status: 201,
        data: {
          task_id: mockTaskId,
          user_id: mockUserId,
          joined_at: '2025-01-01T10:00:00Z',
          user: {
            user_id: mockUserId,
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@example.com'
          }
        }
      };

      apiClient.post = vi.fn().mockResolvedValue(mockResponse);

      const result = await taskMembersApi.addTaskMember(mockTaskId, mockData);

      expect(result.data.task_id).toBe(mockTaskId);
      expect(result.data.user_id).toBe(mockUserId);
      expect(result.data.user.firstname).toBe('John');
    });
  });

  describe('removeTaskMember', () => {
    it('calls correct endpoint', async () => {
      const mockResponse = { status: 204 };
      apiClient.delete = vi.fn().mockResolvedValue(mockResponse);

      await taskMembersApi.removeTaskMember(mockTaskId, mockUserId);

      expect(apiClient.delete).toHaveBeenCalledWith(
        `/api/tasks/${mockTaskId}/members/${mockUserId}`
      );
    });

    it('with different user ids', async () => {
      apiClient.delete = vi.fn().mockResolvedValue({ status: 204 });

      const userIds = [1, 5, 10, 100];
      for (const id of userIds) {
        await taskMembersApi.removeTaskMember(mockTaskId, id);
        expect(apiClient.delete).toHaveBeenCalledWith(
          `/api/tasks/${mockTaskId}/members/${id}`
        );
      }

      expect(apiClient.delete).toHaveBeenCalledTimes(userIds.length);
    });

    it('throws error when trying to remove creator', async () => {
      const error = new Error('Cannot remove task creator');
      apiClient.delete = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.removeTaskMember(mockTaskId, 1); // User 1 is creator
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('creator');
      }
    });

    it('throws error when member not found', async () => {
      const error = new Error('Member not found');
      apiClient.delete = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.removeTaskMember(mockTaskId, 99999);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toContain('not found');
      }
    });

    it('returns success on 204 No Content', async () => {
      const mockResponse = { status: 204 };
      apiClient.delete = vi.fn().mockResolvedValue(mockResponse);

      const result = await taskMembersApi.removeTaskMember(mockTaskId, mockUserId);

      expect(result.status).toBe(204);
    });
  });

  describe('checkPermission', () => {
    it('calls correct endpoint', async () => {
      const mockResponse = {
        data: {
          task_id: mockTaskId,
          user_id: 1,
          has_read: true,
          has_write: true,
          has_execute: false,
          permission_flags: 6
        }
      };

      apiClient.get = vi.fn().mockResolvedValue(mockResponse);

      const result = await taskMembersApi.checkPermission(mockTaskId);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/api/tasks/${mockTaskId}/members/check-permission`
      );
      expect(result.data.has_read).toBe(true);
      expect(result.data.has_write).toBe(true);
    });

    it('returns permission flags object', async () => {
      const mockResponse = {
        data: {
          task_id: mockTaskId,
          user_id: 5,
          has_read: true,
          has_write: false,
          has_execute: false,
          permission_flags: 4
        }
      };

      apiClient.get = vi.fn().mockResolvedValue(mockResponse);

      const result = await taskMembersApi.checkPermission(mockTaskId);

      expect(result.data).toHaveProperty('has_read');
      expect(result.data).toHaveProperty('has_write');
      expect(result.data).toHaveProperty('has_execute');
      expect(result.data).toHaveProperty('permission_flags');
    });

    it('handles different permission combinations', async () => {
      const permissionCombinations = [
        { has_read: true, has_write: true, has_execute: true, flags: 7 },
        { has_read: true, has_write: true, has_execute: false, flags: 6 },
        { has_read: true, has_write: false, has_execute: false, flags: 4 },
        { has_read: false, has_write: false, has_execute: false, flags: 0 }
      ];

      apiClient.get = vi.fn();

      for (const perm of permissionCombinations) {
        apiClient.get.mockResolvedValue({
          data: {
            task_id: mockTaskId,
            user_id: 1,
            has_read: perm.has_read,
            has_write: perm.has_write,
            has_execute: perm.has_execute,
            permission_flags: perm.flags
          }
        });

        const result = await taskMembersApi.checkPermission(mockTaskId);

        expect(result.data.has_read).toBe(perm.has_read);
        expect(result.data.has_write).toBe(perm.has_write);
        expect(result.data.permission_flags).toBe(perm.flags);
      }
    });

    it('throws error when unauthorized', async () => {
      const error = new Error('Unauthorized');
      apiClient.get = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.checkPermission(mockTaskId);
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toBe('Unauthorized');
      }
    });
  });

  describe('API endpoint consistency', () => {
    it('uses consistent base path for all endpoints', async () => {
      apiClient.get = vi.fn().mockResolvedValue({ data: [] });
      apiClient.post = vi.fn().mockResolvedValue({ data: {} });
      apiClient.delete = vi.fn().mockResolvedValue({ status: 204 });

      await taskMembersApi.getTaskMembers(mockTaskId);
      await taskMembersApi.addTaskMember(mockTaskId, { user_id: 1 });
      await taskMembersApi.removeTaskMember(mockTaskId, 1);
      await taskMembersApi.checkPermission(mockTaskId);

      // All endpoints should have /api/tasks/:taskId/members in the path
      const allCalls = [
        ...apiClient.get.mock.calls,
        ...apiClient.post.mock.calls,
        ...apiClient.delete.mock.calls
      ];

      allCalls.forEach(call => {
        expect(call[0]).toContain(`/api/tasks/${mockTaskId}/members`);
      });
    });
  });

  describe('Error handling', () => {
    it('provides descriptive error messages', async () => {
      const errorMessage = 'User is already a member of this task';
      apiClient.post = vi.fn().mockRejectedValue({
        response: { data: { message: errorMessage } }
      });

      try {
        await taskMembersApi.addTaskMember(mockTaskId, mockData);
      } catch (e) {
        expect(e.response.data.message).toContain('already a member');
      }
    });

    it('handles timeout errors', async () => {
      const error = new Error('Request timeout');
      apiClient.get = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.getTaskMembers(mockTaskId);
      } catch (e) {
        expect(e.message).toContain('timeout');
      }
    });

    it('handles 500 server errors', async () => {
      const error = {
        response: { status: 500, data: { message: 'Internal server error' } }
      };
      apiClient.get = vi.fn().mockRejectedValue(error);

      try {
        await taskMembersApi.getTaskMembers(mockTaskId);
      } catch (e) {
        expect(e.response.status).toBe(500);
      }
    });
  });
});
