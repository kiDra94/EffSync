import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TemplateForm from './TemplateForm.vue'

// T110 (M18, decision H2): a template is a name and a description; the
// default_* fields were never columns and are gone
describe('TemplateForm', () => {
  it('saves only name and description', async () => {
    const wrapper = mount(TemplateForm, { props: { template: null } })

    expect(wrapper.find('#default_priority_id').exists()).toBe(false)
    await wrapper.find('#name').setValue('Hausübung')
    await wrapper.find('#description').setValue('Kapitel lesen')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')[0][0]).toEqual({ name: 'Hausübung', description: 'Kapitel lesen' })
  })
})
