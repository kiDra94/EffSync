import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskMemberRemoveDialog from './TaskMemberRemoveDialog.vue'

// asks before a member is removed from a task
describe('TaskMemberRemoveDialog', () => {
  const member = { user_id: 3, firstname: 'Jane', lastname: 'Smith' }

  it('names the member and confirms', async () => {
    const wrapper = mount(TaskMemberRemoveDialog, { props: { member } })

    expect(wrapper.find('strong').text()).toBe('Jane Smith')
    await wrapper.find('.btn-confirm').trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('cancels on the button and beside the dialog, not inside it', async () => {
    const wrapper = mount(TaskMemberRemoveDialog, { props: { member } })

    await wrapper.find('.btn-cancel').trigger('click')
    await wrapper.find('.modal-overlay').trigger('click')
    await wrapper.find('.modal-content').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(2)
  })
})
