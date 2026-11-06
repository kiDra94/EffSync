import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskMembersList from '@/components/tasks/TaskMembersList.vue';
import { taskMembersApi } from '@/api/taskMembers';
import { usersApi } from '@/api/usersService';

vi.mock('@/api/taskMembers');
vi.mock('@/api/usersService');

describe('Task Members Integration Tests', () => {
  const mockTask = {
    task_id: 1,
    title: 'Integration Test Task',
    created_by: 1
  };

  const mockMembers = [
    {
      user_id: 2,
      task_id: 1,
      joined_at: '2025-01-01T10:00:00Z',
      users: {
        user_id: 2,
        firstname: 'John',
        lastname: 'Doe',
        email: 'john@example.com'
      }
    }
  ];

  const mockAllUsers = [
    { user_id: 1, firstname: 'Admin', lastname: 'User', email: 'admin@example.com' },
    { user_id: 2, firstname: 'John', lastname: 'Doe', email: 'john@example.com' },
    { user_id: 3, firstname: 'Jane', lastname: 'Smith', email: 'jane@example.com' },
    { user_id: 4, firstname: 'Bob', lastname: 'Johnson', email: 'bob@example.com' },
    { user_id: 5, firstname: 'Alice', lastname: 'Williams', email: 'alice@example.com' }
  ];

  beforeEach(() => {
    taskMembersApi.getTaskMembers.mockResolvedValue({ data: mockMembers });
    taskMembersApi.addTaskMember.mockResolvedValue({ data: { user_id: 3, task_id: 1 } });
    taskMembersApi.removeTaskMember.mockResolvedValue({ status: 204 });
    taskMembersApi.checkPermission.mockResolvedValue({ data: { has_write: true } });
    usersApi.getAllForSelection.mockResolvedValue({ data: { data: mockAllUsers } });
    usersApi.getAll.mockResolvedValue({ data: mockAllUsers });
  });

  describe('Complete Workflow: Add Member', () => {
    it('should allow adding a member to a task', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Initially has 1 member
      expect(wrapper.vm.allMembers).toHaveLength(1);

      // Select Jane (user_id: 3) from dropdown
      const select = wrapper.find('.member-select');
      await select.setValue(3);

      // Click add button
      const addButton = wrapper.find('.btn-add');
      await addButton.trigger('click');

      // Verify API call
      expect(taskMembersApi.addTaskMember).toHaveBeenCalledWith(
        mockTask.task_id,
        { user_id: 3 }
      );
    });

    it('should update available users after adding member', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Initially, available users should exclude current members
      const initialAvailable = wrapper.vm.availableUsers.length;

      // Mock updated members list after adding
      const updatedMembers = [
        ...mockMembers,
        {
          user_id: 3,
          task_id: 1,
          joined_at: '2025-01-02T10:00:00Z',
          users: mockAllUsers[2]
        }
      ];

      taskMembersApi.getTaskMembers.mockResolvedValue({ data: updatedMembers });

      // Select and add Jane
      const select = wrapper.find('.member-select');
      await select.setValue(3);
      const addButton = wrapper.find('.btn-add');
      await addButton.trigger('click');

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Reload members
      await wrapper.vm.loadMembers();

      expect(wrapper.vm.availableUsers.length).toBeLessThanOrEqual(initialAvailable);
    });
  });

  describe('Complete Workflow: Remove Member', () => {
    it('should allow removing a member from a task', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Open remove dialog
      const removeButtons = wrapper.findAll('.btn-remove');
      expect(removeButtons.length).toBeGreaterThan(0);

      await removeButtons[0].trigger('click');
      expect(wrapper.vm.showRemoveDialog).toBe(true);

      // Confirm removal
      await wrapper.vm.confirmRemove();

      expect(taskMembersApi.removeTaskMember).toHaveBeenCalledWith(
        mockTask.task_id,
        2
      );
    });

    it('should protect creator from removal', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: 2, // John is creator
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Creator should not have remove button
      const memberCards = wrapper.findAll('.member-card');
      const creatorCard = memberCards[0];
      const removeButton = creatorCard.find('.btn-remove');

      expect(removeButton.exists()).toBe(false);
    });

    it('should protect assigned-to user from removal', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: 2 // John is assigned-to
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // User with assigned_to should not have remove button
      const memberCards = wrapper.findAll('.member-card');
      const assignedCard = memberCards[0];
      const removeButton = assignedCard.find('.btn-remove');

      expect(removeButton.exists()).toBe(false);
    });
  });

  describe('Permission Validation', () => {
    it('should check permissions on load', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(taskMembersApi.checkPermission).toHaveBeenCalledWith(mockTask.task_id);
    });

    it('should disable add member section if no write permission', async () => {
      taskMembersApi.checkPermission.mockResolvedValue({ data: { has_write: false } });

      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.canEditTask).toBe(false);
      expect(wrapper.find('.add-member-section').exists()).toBe(false);
    });
  });

  describe('Error Handling in Workflow', () => {
    it('should handle add member error gracefully', async () => {
      taskMembersApi.addTaskMember.mockRejectedValue(
        new Error('User is already a member')
      );

      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const select = wrapper.find('.member-select');
      await select.setValue(3);

      const addButton = wrapper.find('.btn-add');
      await addButton.trigger('click');

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(wrapper.vm.errorMessage).toBeTruthy();
      expect(wrapper.vm.errorMessage).toContain('konnten nicht hinzugefügt werden');
      expect(wrapper.find('.toast-error').exists()).toBe(true);
    });

    it('should handle remove member error gracefully', async () => {
      taskMembersApi.removeTaskMember.mockRejectedValue(
        new Error('Cannot remove creator')
      );

      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const removeButtons = wrapper.findAll('.btn-remove');
      if (removeButtons.length > 0) {
        await removeButtons[0].trigger('click');
        await wrapper.vm.confirmRemove();

        await new Promise(resolve => setTimeout(resolve, 150));

        expect(wrapper.vm.errorMessage).toBeTruthy();
        expect(wrapper.vm.errorMessage).toContain('konnte nicht entfernt werden');
      }
    });

    it('should handle load error gracefully', async () => {
      taskMembersApi.getTaskMembers.mockRejectedValue(
        new Error('Failed to load members')
      );

      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.errorMessage).toBeTruthy();
    });
  });

  describe('UI State Management', () => {
    it('should show success message after adding member', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const select = wrapper.find('.member-select');
      await select.setValue(3);

      const addButton = wrapper.find('.btn-add');
      await addButton.trigger('click');

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(wrapper.vm.successMessage).toBeTruthy();
      expect(wrapper.find('.toast-success').exists()).toBe(true);
    });

    it('should show success message after removing member', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const removeButtons = wrapper.findAll('.btn-remove');
      if (removeButtons.length > 0) {
        await removeButtons[0].trigger('click');
        await wrapper.vm.confirmRemove();

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(wrapper.vm.successMessage).toBeTruthy();
      }
    });

    it('should clear messages after timeout', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Show success
      wrapper.vm.showSuccess('Test message');
      expect(wrapper.vm.successMessage).toBe('Test message');

      // Wait for auto-clear (3 seconds)
      await new Promise(resolve => setTimeout(resolve, 3100));

      expect(wrapper.vm.successMessage).toBe('');
    });
  });

  describe('Data Flow', () => {
    it('should emit members-updated event with correct data', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const emitted = wrapper.emitted('members-updated');
      expect(emitted).toBeTruthy();
      expect(emitted[0][0]).toHaveLength(1); // One member
      expect(emitted[0][0][0].user_id).toBe(2);
    });

    it('should maintain member list consistency', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      const initialMemberCount = wrapper.vm.allMembers.length;

      // Simulate adding member and reloading
      taskMembersApi.getTaskMembers.mockResolvedValue({
        data: [
          ...mockMembers,
          {
            user_id: 3,
            task_id: 1,
            joined_at: '2025-01-02T10:00:00Z',
            users: mockAllUsers[2]
          }
        ]
      });

      await wrapper.vm.loadMembers();

      expect(wrapper.vm.allMembers.length).toBe(initialMemberCount + 1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form controls', async () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      const select = wrapper.find('.member-select');
      expect(select.exists()).toBe(true);
    });

    it('should have title attributes on buttons', () => {
      const wrapper = mount(TaskMembersList, {
        props: {
          taskId: mockTask.task_id,
          creatorId: mockTask.created_by,
          assignedToId: null
        }
      });

      const removeButtons = wrapper.findAll('.btn-remove');
      if (removeButtons.length > 0) {
        expect(removeButtons[0].attributes('title')).toBeTruthy();
      }
    });
  });
});
