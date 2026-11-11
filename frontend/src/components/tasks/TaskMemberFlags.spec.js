import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TaskMemberFlags from './TaskMemberFlags.vue'

const member = { user_id: 3, firstname: 'Jane', lastname: 'Smith', flags: 6 }

// T99, decision I4 (M38): a member's rights on the task
describe('TaskMemberFlags', () => {
  it('marks the flags the member holds', () => {
    const wrapper = mount(TaskMemberFlags, { props: { member } })

    expect(wrapper.findAll('.flag.on').map((f) => f.text())).toEqual(['R', 'W'])
    expect(wrapper.find('.flag-editor').exists()).toBe(false)
  })

  it('hands over a changed flag with its checkbox', async () => {
    const wrapper = mount(TaskMemberFlags, { props: { member, editable: true } })

    await wrapper.find('input[aria-label="Jane Smith: Ausführen"]').setValue(true)

    const [bit, checkbox] = wrapper.emitted('change')[0]
    expect(bit).toBe(1)
    expect(checkbox.checked).toBe(true)
  })
})
