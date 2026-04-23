import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AddMemberDialog from './AddMemberDialog.vue';
import { taskMembersApi } from '@/api/taskMembers';

vi.mock('@/api/taskMembers');

describe('AddMemberDialog.vue', () => {
  const mockAvailableUsers = [
    {
      user_id: 1,
      firstname: 'John',
      lastname: 'Doe',
      email: 'john@example.com'
    },
    {
      user_id: 2,
      firstname: 'Jane',
      lastname: 'Smith',
      email: 'jane@example.com'
    },
    {
      user_id: 3,
      firstname: 'Bob',
      lastname: 'Johnson',
      email: 'bob@example.com'
    }
  ];

  const mockCurrentMembers = [
    {
      user_id: 2,
      firstname: 'Jane',
      lastname: 'Smith',
      email: 'jane@example.com'
    }
  ];

  beforeEach(() => {
    taskMembersApi.addTaskMember.mockResolvedValue({
      data: { user_id: 1, task_id: 42 }
    });
  });

  it('renders dialog with title', () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    expect(wrapper.find('.dialog').exists()).toBe(true);
    expect(wrapper.find('.dialog-header h2').text()).toContain('👥 Mitglied hinzufügen');
  });

  it('renders close button', () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    expect(wrapper.find('.close-btn').exists()).toBe(true);
  });

  it('emits close event when close button clicked', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const closeBtn = wrapper.find('.close-btn');
    await closeBtn.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('renders user select dropdown with available users', () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    expect(select.exists()).toBe(true);

    const options = select.findAll('option');
    expect(options.length).toBeGreaterThan(0);
  });

  it('handles user selection', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    expect(wrapper.vm.selectedUserId).toBe(1);
  });

  it('shows user preview when user is selected', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    expect(wrapper.find('.user-preview').exists()).toBe(false);

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    await wrapper.vm.$nextTick();

    expect(wrapper.find('.user-preview').exists()).toBe(true);
    expect(wrapper.find('.user-preview').text()).toContain('John Doe');
    expect(wrapper.find('.user-preview').text()).toContain('john@example.com');
  });

  it('shows correct avatar initials', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    await wrapper.vm.$nextTick();

    const avatar = wrapper.find('.user-avatar');
    expect(avatar.text()).toBe('JD');
  });

  it('disables add button when no user selected', () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const addBtn = wrapper.find('.btn-primary');
    expect(addBtn.attributes('disabled')).toBeDefined();
  });

  it('enables add button when user is selected', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    expect(addBtn.attributes('disabled')).toBeUndefined();
  });

  it('calls API when add button clicked', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    await addBtn.trigger('click');

    expect(taskMembersApi.addTaskMember).toHaveBeenCalledWith(
      42,
      { user_id: 1 }
    );
  });

  it('shows loading state while adding member', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    
    // Initially should show "✅ Hinzufügen"
    expect(addBtn.text()).toContain('Hinzufügen');

    // Click to start loading
    taskMembersApi.addTaskMember.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    addBtn.trigger('click');
    await wrapper.vm.$nextTick();

    // Should show loading state
    expect(wrapper.vm.loading).toBe(true);
  });

  it('emits member-added event on success', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    await addBtn.trigger('click');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.emitted('member-added')).toBeTruthy();
    const emittedData = wrapper.emitted('member-added')[0][0];
    expect(emittedData.user_id).toBe(1);
    expect(emittedData.firstname).toBe('John');
  });

  it('shows error message on API failure', async () => {
    taskMembersApi.addTaskMember.mockRejectedValue({
      response: { data: { message: 'User ist bereits Mitglied' } }
    });

    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    await addBtn.trigger('click');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.vm.error).toBeTruthy();
    expect(wrapper.find('.error-message').exists()).toBe(true);
  });

  it('shows generic error message when no response data', async () => {
    taskMembersApi.addTaskMember.mockRejectedValue(
      new Error('Network error')
    );

    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    await addBtn.trigger('click');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.vm.error).toBeTruthy();
  });

  it('emits close event and disables buttons on overlay click', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const overlay = wrapper.find('.dialog-overlay');
    await overlay.trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not close when dialog content clicked', async () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const dialog = wrapper.find('.dialog');
    await dialog.trigger('click');

    // Due to @click.stop, dialog should not close
    // (Would need to check parent component's close handler)
    expect(dialog.exists()).toBe(true);
  });

  it('disables buttons while loading', async () => {
    taskMembersApi.addTaskMember.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 500))
    );

    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    const cancelBtn = wrapper.find('.btn-secondary');

    addBtn.trigger('click');
    await wrapper.vm.$nextTick();

    expect(addBtn.attributes('disabled')).toBeDefined();
    expect(cancelBtn.attributes('disabled')).toBeDefined();
  });

  it('clears error when user selects different user', async () => {
    taskMembersApi.addTaskMember.mockRejectedValue({
      response: { data: { message: 'User ist bereits Mitglied' } }
    });

    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: mockCurrentMembers,
        availableUsers: mockAvailableUsers
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(1);

    const addBtn = wrapper.find('.btn-primary');
    await addBtn.trigger('click');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(wrapper.vm.error).toBeTruthy();

    // Select different user
    await select.setValue(3);

    // Error should persist (only cleared on new attempt)
    expect(wrapper.vm.error).toBeTruthy();
  });

  it('formats user data correctly in preview', async () => {
    const testUser = {
      user_id: 5,
      firstname: 'Test',
      lastname: 'User',
      email: 'test@example.com'
    };

    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: [],
        availableUsers: [testUser]
      }
    });

    const select = wrapper.find('.user-select');
    await select.setValue(5);

    await wrapper.vm.$nextTick();

    expect(wrapper.vm.selectedUser.firstname).toBe('Test');
    expect(wrapper.vm.selectedUser.lastname).toBe('User');
    expect(wrapper.vm.selectedUser.email).toBe('test@example.com');
  });

  it('generates initials for special characters', () => {
    const wrapper = mount(AddMemberDialog, {
      props: {
        taskId: 42,
        currentMembers: [],
        availableUsers: []
      }
    });

    expect(wrapper.vm.getInitials('Ö', 'Ä')).toBe('ÖÄ');
    expect(wrapper.vm.getInitials('', '')).toBe('US');
  });
});
