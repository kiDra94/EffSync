import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskMemberChips from './TaskMemberChips.vue'

// the members chosen for a new task (Definition of done: out of TaskForm)
describe('TaskMemberChips', () => {
  it('shows each chosen member with initials and removes one', async () => {
    const members = [
      { user_id: 2, firstname: 'Anna', lastname: 'Lehrer', email: 'anna@htl.at' },
      { user_id: 4, firstname: 'Felix', lastname: 'Fuchs', email: 'felix@htl.at' },
    ]
    const wrapper = mount(TaskMemberChips, { props: { members } })

    const chips = wrapper.findAll('.member-chip')
    expect(chips.map((c) => c.find('.chip-avatar').text())).toEqual(['AL', 'FF'])
    expect(chips[1].find('.chip-name').text()).toBe('Felix Fuchs')
    await chips[1].find('.chip-remove').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([[4]])
  })
})
