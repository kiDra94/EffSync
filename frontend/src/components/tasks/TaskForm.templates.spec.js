import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import TaskForm from './TaskForm.vue'

const addTemplate = vi.hoisted(() => vi.fn())

vi.mock('@/api/taskMembers', () => ({
  taskMembersApi: {
    getTaskMembers: vi.fn().mockResolvedValue({ data: [] }),
    checkPermission: vi.fn().mockResolvedValue({ data: { has_write: true } }),
  },
}))
vi.mock('@/api/usersService', () => ({ usersApi: { getAll: vi.fn().mockResolvedValue({ data: [] }) } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ userId: 1, userRole: 'teacher' }) }))
vi.mock('@/stores/entities/taskStore', () => ({
  useTaskStore: () => ({ getSubtasks: () => [], tasks: [] }),
}))
vi.mock('@/stores/entities/templateStore', () => ({ useTemplateStore: () => ({ addTemplate }) }))
vi.mock('@/components/tasks/TaskTemplateSelector.vue', () => ({
  default: { name: 'TaskTemplateSelector', template: '<div></div>' },
}))
vi.mock('@/components/tasks/SubtaskBuilder.vue', () => ({
  default: { name: 'SubtaskBuilder', template: '<div></div>' },
}))

// T110 (M18, decision H2): a template is a name and a description;
// T59 (decision Q8e): tags are set in the form
describe('TaskForm templates and tags', () => {
  beforeEach(() => addTemplate.mockReset().mockResolvedValue(undefined))

  const fillAndSubmit = async (wrapper) => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await wrapper.find('#deadline').setValue(tomorrow.toISOString().slice(0, 16))
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    return wrapper.emitted('save')?.[0]?.[0]
  }

  it('applies a template: title and description, and the link to the template', async () => {
    const wrapper = mount(TaskForm, { props: { task: null } })

    wrapper.findComponent({ name: 'TaskTemplateSelector' }).vm.$emit('templateSelected', {
      template_id: 3,
      name: 'Wöchentliche Hausübung',
      description: 'Kapitel lesen',
    })
    await flushPromises()

    expect(wrapper.find('#title').element.value).toBe('Wöchentliche Hausübung')
    expect(wrapper.find('#description').element.value).toBe('Kapitel lesen')
    expect((await fillAndSubmit(wrapper)).template_id).toBe(3)
  })

  it('saves the form as a template with name and description only', async () => {
    const wrapper = mount(TaskForm, { props: { task: null } })
    await wrapper.find('#title').setValue('Laborbericht')
    await wrapper.find('#description').setValue('Messwerte und Auswertung')

    await wrapper.find('[data-test="save-as-template"]').trigger('click')
    await flushPromises()

    expect(addTemplate).toHaveBeenCalledWith({
      name: 'Laborbericht',
      description: 'Messwerte und Auswertung',
    })
  })

  it('sends the tags typed in the tag input', async () => {
    const wrapper = mount(TaskForm, { props: { task: null } })
    await wrapper.find('#title').setValue('Getaggt')
    await wrapper.find('#tags').setValue('Mathe, Projekt ,  ')

    expect((await fillAndSubmit(wrapper)).tags).toEqual(['Mathe', 'Projekt'])
  })

  it('starts an existing task with its tags', () => {
    const wrapper = mount(TaskForm, {
      props: {
        task: {
          task_id: 4,
          title: 'Projekt',
          deadline: '2026-12-31T10:00:00Z',
          priority_id: 2,
          status: 'TODO',
          progress: 0,
          created_by: 1,
          task_tags: [{ tags: { tag_id: 1, name: 'mathe' } }, { tags: { tag_id: 2, name: 'projekt' } }],
        },
      },
    })

    expect(wrapper.find('#tags').element.value).toBe('mathe, projekt')
  })

  // review M18 (4): an update replaces the tags, so untouched tags aren't sent
  it('sends no tags when the field was not changed', async () => {
    const wrapper = mount(TaskForm, {
      props: {
        task: {
          task_id: 4, title: 'Kalender-Termin', deadline: '2026-12-31T10:00', priority_id: 2,
          status: 'TODO', progress: 0, created_by: 1,
        },
      },
    })

    const saved = await fillAndSubmit(wrapper)
    expect(saved).not.toHaveProperty('tags')
  })

  // review M18 (5): "Keine Vorlage" removes the link again
  it('drops the template link when the template is deselected', async () => {
    const wrapper = mount(TaskForm, { props: { task: null } })
    const selector = wrapper.findComponent({ name: 'TaskTemplateSelector' })
    selector.vm.$emit('templateSelected', { template_id: 3, name: 'X', description: '' })
    selector.vm.$emit('templateSelected', null)
    await wrapper.find('#title').setValue('Eigener Titel')

    expect(await fillAndSubmit(wrapper)).not.toHaveProperty('template_id')
  })
})
