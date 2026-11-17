import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskMembersList from './TaskMembersList.vue';
import UserAvatar from '@/components/profile/UserAvatar.vue';

vi.mock('@/stores/entities/avatarStore', () => ({
  useAvatarStore: () => ({ imageUrl: vi.fn().mockResolvedValue('blob:avatar') }),
}));
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
    vi.clearAllMocks();
    taskMembersApi.getTaskMembers.mockResolvedValue({ data: mockMembers });
    taskMembersApi.checkPermission.mockResolvedValue({ data: { has_read: true, has_write: true } });
    taskMembersApi.addTaskMember.mockResolvedValue({ data: { success: true } });
    taskMembersApi.removeTaskMember.mockResolvedValue({ data: { success: true } });
    usersApi.getAll.mockResolvedValue({ data: mockAllUsers });
    usersApi.getAllForSelection.mockResolvedValue({ data: { data: mockAllUsers } });
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
    expect(usersApi.getAllForSelection).toHaveBeenCalled();
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

  // T99, decision I4 (M38): each member's rights on the task
  describe('member rights (flags)', () => {
    const withFlags = [
      { ...mockMembers[0], role: 'creator', flags: 7 },
      { ...mockMembers[1], role: 'member', flags: 4 },
    ];
    const mountList = async (permission) => {
      taskMembersApi.getTaskMembers.mockResolvedValue({ data: withFlags });
      taskMembersApi.checkPermission.mockResolvedValue({ data: permission });
      const wrapper = mount(TaskMembersList, {
        props: { taskId: mockTask.task_id, creatorId: 2, assignedToId: null },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      return wrapper;
    };
    const card = (wrapper, name) => wrapper.findAll('.member-card').find((c) => c.text().includes(name));

    it('shows each member\'s R, W and X', async () => {
      const wrapper = await mountList({ has_read: true, has_write: false, has_execute: false });

      const active = (name) => card(wrapper, name).findAll('.flag.on').map((f) => f.text());
      expect(active('John')).toEqual(['R', 'W', 'X']);
      expect(active('Jane')).toEqual(['R']);
      expect(wrapper.find('.flag-editor').exists()).toBe(false);
    });

    it('lets an EXECUTE holder change an explicit member\'s flags', async () => {
      taskMembersApi.setMemberFlags.mockResolvedValue({ data: { user_id: 3, flags: 6 } });
      const wrapper = await mountList({ has_read: true, has_write: true, has_execute: true });

      // the creator's rights come from the task: no editor for them
      expect(card(wrapper, 'John').find('.flag-editor').exists()).toBe(false);
      await card(wrapper, 'Jane').find('input[aria-label="Jane Smith: Schreiben"]').setValue(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(taskMembersApi.setMemberFlags).toHaveBeenCalledWith(mockTask.task_id, 3, 6);
      expect(card(wrapper, 'Jane').findAll('.flag.on').map((f) => f.text())).toEqual(['R', 'W']);
    });

    // review of M38: the list shows for everyone with READ, and only for them
    it('stays hidden, without a request or an error, for someone without READ', async () => {
      const wrapper = await mountList({ has_read: false, has_write: false, has_execute: false });

      expect(wrapper.find('.task-members-section').exists()).toBe(false);
      expect(taskMembersApi.getTaskMembers).not.toHaveBeenCalled();
    });

    it('offers no editor for a member whose rights come from their role', async () => {
      taskMembersApi.getTaskMembers.mockResolvedValue({
        data: [{ ...mockMembers[1], role: 'member', flags: 7, fixed_flags: true }],
      });
      taskMembersApi.checkPermission.mockResolvedValue({ data: { has_read: true, has_write: true, has_execute: true } });
      const wrapper = mount(TaskMembersList, { props: { taskId: mockTask.task_id, creatorId: 2, assignedToId: null } });
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(card(wrapper, 'Jane').find('.flag-editor').exists()).toBe(false);
    });

    // review of M38: a second change waits for the first
    it('locks a member\'s flags while a change is on its way', async () => {
      let finish;
      taskMembersApi.setMemberFlags.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
      const wrapper = await mountList({ has_read: true, has_write: true, has_execute: true });

      await card(wrapper, 'Jane').find('input[aria-label="Jane Smith: Schreiben"]').setValue(true);
      expect(card(wrapper, 'Jane').find('input[aria-label="Jane Smith: Ausführen"]').attributes('disabled')).toBeDefined();

      finish({ data: {} });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(card(wrapper, 'Jane').find('input[aria-label="Jane Smith: Ausführen"]').attributes('disabled')).toBeUndefined();
    });

    // second review of M38: the controls only where the backend allows them
    it('offers no editor on the own card (nobody changes their own flags)', async () => {
      localStorage.setItem('userId', '3');
      const wrapper = await mountList({ has_read: true, has_write: true, has_execute: true });

      expect(card(wrapper, 'Jane').find('.flag-editor').exists()).toBe(false);
      localStorage.removeItem('userId');
    });

    it('offers no remove for a member with EXECUTE to someone without it', async () => {
      taskMembersApi.getTaskMembers.mockResolvedValue({
        data: [{ ...mockMembers[1], role: 'member', flags: 7 }],
      });
      taskMembersApi.checkPermission.mockResolvedValue({ data: { has_read: true, has_write: true, has_execute: false } });
      const wrapper = mount(TaskMembersList, { props: { taskId: mockTask.task_id, creatorId: 2, assignedToId: null } });
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(card(wrapper, 'Jane').find('.btn-remove').exists()).toBe(false);
    });

    it('shows the members of the task it shows, not of the one before', async () => {
      let firstTask;
      taskMembersApi.checkPermission.mockResolvedValue({ data: { has_read: true, has_write: true, has_execute: false } });
      taskMembersApi.getTaskMembers
        .mockReturnValueOnce(new Promise((resolve) => { firstTask = resolve; }))
        .mockResolvedValueOnce({ data: [{ ...mockMembers[1], role: 'member', flags: 4 }] });
      const wrapper = mount(TaskMembersList, { props: { taskId: 1, creatorId: 2, assignedToId: null } });
      await new Promise((resolve) => setTimeout(resolve, 0));

      await wrapper.setProps({ taskId: 2 });
      await new Promise((resolve) => setTimeout(resolve, 0));
      firstTask({ data: [{ ...mockMembers[0], role: 'member', flags: 4 }] });
      await new Promise((resolve) => setTimeout(resolve, 0));

      const cards = wrapper.findAll('.member-card').map((c) => c.text());
      expect(cards).toHaveLength(1);
      expect(cards[0]).toContain('Jane');
    });

    it('keeps the old flags and shows the reason when the change fails', async () => {
      taskMembersApi.setMemberFlags.mockRejectedValue({ response: { data: { message: 'Keine Berechtigung' } } });
      const wrapper = await mountList({ has_read: true, has_write: true, has_execute: true });

      await card(wrapper, 'Jane').find('input[aria-label="Jane Smith: Schreiben"]').setValue(true);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(card(wrapper, 'Jane').findAll('.flag.on').map((f) => f.text())).toEqual(['R']);
      expect(wrapper.text()).toContain('Keine Berechtigung');
    });
  });

  // T47, decision Q8c (M27): the members' profile pictures from the server
  it('shows a member\'s profile picture instead of the initials', async () => {
    taskMembersApi.getTaskMembers.mockResolvedValue({
      data: [{ ...mockMembers[0], users: { ...mockMembers[0].users, profile_picture: '/users/2/avatar?v=1' } }],
    });
    const wrapper = mount(TaskMembersList, {
      props: { taskId: mockTask.task_id, creatorId: mockTask.created_by, assignedToId: null }
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.findComponent(UserAvatar).props()).toEqual({ picture: '/users/2/avatar?v=1', initials: 'JD' });
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
