import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskMembersList from './TaskMembersList.vue';
import { taskMembersApi } from '@/api/taskMembers';
import { usersApi } from '@/api/usersService';

// Mock APIs
vi.mock('@/api/taskMembers');
vi.mock('@/api/usersService');

describe('TaskMembersList.vue', () => {
  const mockTask = {
    task_id: 1,
    title: 'Test Task',
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
        email: 'john@example.com',
        profile_picture: null
      }
    },
    {
      user_id: 3,
      task_id: 1,
      joined_at: '2025-01-02T10:00:00Z',
      users: {
        user_id: 3,
        firstname: 'Jane',
        lastname: 'Smith',
        email: 'jane@example.com',
        profile_picture: null
      }
    }
  ];

  const mockAllUsers = [
    {
      user_id: 1,
      firstname: 'Admin',
      lastname: 'User',
      email: 'admin@example.com'
    },
    {
      user_id: 2,
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com'
    },
    {
      user_id: 3,
      firstname: 'Jane',
      lastname: 'Smith',
      email: 'jane@example.com'
    },
    {
      user_id: 4,
      firstname: 'Bob',
      lastname: 'Johnson',
      email: 'bob@example.com'
    }
  ];

  beforeEach(() => {
    taskMembersApi.getTaskMembers.mockResolvedValue({ data: mockMembers });
    taskMembersApi.checkPermission.mockResolvedValue({ data: { has_write: true } });
    usersApi.getAll.mockResolvedValue({ data: mockAllUsers });
  });

  it('renders task members section', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.find('.task-members-section').exists()).toBe(true);
    expect(wrapper.find('.section-title').text()).toContain('👥 Task-Mitglieder');
  });

  it('loads and displays members on mount', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check API was called
    expect(taskMembersApi.getTaskMembers).toHaveBeenCalledWith(mockTask.task_id);
    expect(usersApi.getAll).toHaveBeenCalled();
  });

  it('displays member cards with correct information', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const memberCards = wrapper.findAll('.member-card');
    expect(memberCards).toHaveLength(2);

    // Check first member
    expect(memberCards[0].text()).toContain('John Doe');
    expect(memberCards[0].text()).toContain('john@example.com');
  });

  it('shows creator badge for creator', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: 2, // John is creator
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const badges = wrapper.findAll('.badge-creator');
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].text()).toContain('👑 Creator');
  });

  it('filters available users (excludes current members)', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const availableUsers = wrapper.vm.availableUsers;
    const memberIds = mockMembers.map(m => m.user_id);

    // Should only have Bob (user_id: 4) since John, Jane, and Admin are already members
    expect(availableUsers.some(u => u.user_id === 4)).toBe(true);
    expect(availableUsers.some(u => memberIds.includes(u.user_id))).toBe(false);
  });

  it('shows add member form when canEditTask is true', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.find('.add-member-section').exists()).toBe(true);
    expect(wrapper.find('.member-select').exists()).toBe(true);
  });

  it('adds member when button is clicked', async () => {
    taskMembersApi.addTaskMember.mockResolvedValue({
      data: { user_id: 4, task_id: 1 }
    });

    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Select Bob from dropdown
    const select = wrapper.find('.member-select');
    await select.setValue(4);

    // Click add button
    const addButton = wrapper.find('.btn-add');
    expect(addButton.exists()).toBe(true);
    await addButton.trigger('click');

    await new Promise(resolve => setTimeout(resolve, 100));

    // Check API was called with correct parameters
    expect(taskMembersApi.addTaskMember).toHaveBeenCalledWith(
      mockTask.task_id,
      { user_id: 4 }
    );
  });

  it('shows error toast on add member failure', async () => {
    taskMembersApi.addTaskMember.mockRejectedValue(
      new Error('Permission denied')
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

    // Select and try to add
    const select = wrapper.find('.member-select');
    await select.setValue(4);
    const addButton = wrapper.find('.btn-add');
    await addButton.trigger('click');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.vm.errorMessage).toBeTruthy();
  });

  it('shows remove dialog when remove button is clicked', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Remove button for John Doe (user_id: 2, not creator)
    const removeButtons = wrapper.findAll('.btn-remove');
    expect(removeButtons.length).toBeGreaterThan(0);

    await removeButtons[0].trigger('click');

    expect(wrapper.vm.showRemoveDialog).toBe(true);
    expect(wrapper.vm.memberToRemove).toBeTruthy();
  });

  it('removes member when confirmed', async () => {
    taskMembersApi.removeTaskMember.mockResolvedValue({});

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
    await removeButtons[0].trigger('click');

    // Confirm removal
    await wrapper.vm.confirmRemove();

    expect(taskMembersApi.removeTaskMember).toHaveBeenCalledWith(
      mockTask.task_id,
      2 // John's user_id
    );
  });

  it('does not show remove button for creator', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: 2, // John is creator
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get all remove buttons and check if creator's button is missing
    const memberCards = wrapper.findAll('.member-card');
    const creatorCard = memberCards[0]; // John'scard

    const removeButton = creatorCard.find('.btn-remove');
    expect(removeButton.exists()).toBe(false);
  });

  it('emits members-updated event when members change', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.emitted('members-updated')).toBeTruthy();
    expect(wrapper.emitted('members-updated')[0]).toBeTruthy();
  });

  it('shows correct permission badges', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: 3 // Jane is assigned-to
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const assignedBadges = wrapper.findAll('.badge-assigned');
    expect(assignedBadges.length).toBeGreaterThan(0);
    expect(assignedBadges[0].text()).toContain('✓ Assigned');
  });

  it('shows empty state when no members', async () => {
    taskMembersApi.getTaskMembers.mockResolvedValue({ data: [] });

    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.find('.empty-state').text()).toContain('Keine Mitglieder');
  });

  it('disables add button when no user selected', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();
    await new Promise(resolve => setTimeout(resolve, 100));

    const addButton = wrapper.find('.btn-add');
    expect(addButton.attributes('disabled')).toBeDefined();
  });

  it('generates correct initials for avatars', async () => {
    const wrapper = mount(TaskMembersList, {
      props: {
        taskId: mockTask.task_id,
        creatorId: mockTask.created_by,
        assignedToId: null
      }
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.getInitials('John', 'Doe')).toBe('JD');
    expect(wrapper.vm.getInitials('Jane', 'Smith')).toBe('JS');
    expect(wrapper.vm.getInitials('', 'Doe')).toBe('UD');
  });
});
