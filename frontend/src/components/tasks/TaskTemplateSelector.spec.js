import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TaskTemplateSelector from './TaskTemplateSelector.vue'

vi.mock('@/stores/entities/templateStore', () => ({
  useTemplateStore: () => ({
    templates: [{ template_id: 3, name: 'Hausübung', description: 'Kapitel lesen' }],
    getTemplates: vi.fn().mockResolvedValue(undefined),
  }),
}))

// review M18 (5): choosing "-- Keine Vorlage --" is a selection too
describe('TaskTemplateSelector', () => {
  it('emits the chosen template, and null for "Keine Vorlage"', async () => {
    const wrapper = mount(TaskTemplateSelector)
    await flushPromises()
    const select = wrapper.find('select')

    await select.setValue(3)
    await select.setValue(null)

    expect(wrapper.emitted('templateSelected')).toEqual([
      [{ template_id: 3, name: 'Hausübung', description: 'Kapitel lesen' }],
      [null],
    ])
  })
})
