import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { reactive } from 'vue'

const tasks = reactive({ tasks: [], getTasks: vi.fn() })
const notes = reactive({ notes: [], getNotes: vi.fn() })
const templates = reactive({ templates: [], getTemplates: vi.fn() })
const users = { fetchForSelection: vi.fn() }
const chat = { openDirect: vi.fn() }
vi.mock('@/stores/entities/taskStore', () => ({ useTaskStore: () => tasks }))
vi.mock('@/stores/entities/noteStore', () => ({ useNoteStore: () => notes }))
vi.mock('@/stores/entities/templateStore', () => ({ useTemplateStore: () => templates }))
vi.mock('@/stores/entities/userStore', () => ({ useUserStore: () => users }))
vi.mock('@/stores/entities/chatStore', () => ({ useChatStore: () => chat }))

import { useSearchStore } from './searchStore'

// T42 (FA-52: tasks, projects and users) and T43 (FA-53: grouped by
// category), M26; a project is a top-level task (decision Q2)
describe('searchStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    tasks.tasks = [
      { task_id: 1, title: 'Mathe Projekt', parent_task_id: null, status: 'IN_PROGRESS' },
      { task_id: 2, title: 'Mathe Kapitel 1', parent_task_id: 1, status: 'TODO' },
      { task_id: 3, title: 'Deutsch', parent_task_id: null, status: 'TODO' },
    ]
    notes.notes = [{ note_id: 5, title: 'Mathe Formeln' }]
    templates.templates = [{ template_id: 6, name: 'Mathe Test' }]
    users.fetchForSelection.mockResolvedValue({
      data: [
        { user_id: 4, firstname: 'Felix', lastname: 'Mathes', username: 'ffuchs' },
        { user_id: 7, firstname: 'Anna', lastname: 'Lehrer', username: 'alehrerin' },
      ],
    })
  })

  const search = async (query) => {
    const store = useSearchStore()
    await store.ensureLoaded()
    store.query = query
    return store
  }
  const group = (store, key) => store.groups.find((g) => g.key === key)

  it('shows matching top-level tasks as projects', async () => {
    const store = await search('mathe')

    expect(group(store, 'project').label).toBe('Projekte')
    expect(group(store, 'project').items.map((i) => i.id)).toEqual([1])
  })

  it('keeps the other matching tasks under tasks', async () => {
    const store = await search('mathe')

    expect(group(store, 'task').label).toBe('Aufgaben')
    expect(group(store, 'task').items.map((i) => i.id)).toEqual([2])
  })

  it('finds users by first name, last name and username', async () => {
    expect(group(await search('mathes'), 'user').items.map((i) => i.id)).toEqual([4])
    expect(group(await search('alehr'), 'user').items).toEqual([
      expect.objectContaining({ id: 7, label: 'Anna Lehrer', sub: '@alehrerin' }),
    ])
  })

  it('finds notes and templates', async () => {
    const store = await search('mathe')

    expect(group(store, 'note').items.map((i) => i.id)).toEqual([5])
    expect(group(store, 'template').items.map((i) => i.id)).toEqual([6])
  })

  it('groups in a fixed order and leaves empty groups out', async () => {
    expect((await search('mathe')).groups.map((g) => g.key)).toEqual([
      'project', 'task', 'user', 'note', 'template',
    ])
    expect((await search('deutsch')).groups.map((g) => g.key)).toEqual(['project'])
  })

  it('shows at most 5 per group and counts the rest, nothing below 2 letters', async () => {
    tasks.tasks = Array.from({ length: 8 }, (_, i) => ({ task_id: 10 + i, title: `Mathe ${i}`, parent_task_id: null }))
    const projects = group(await search('mathe'), 'project')
    expect(projects.items).toHaveLength(5)
    expect(projects.more).toBe(3)
    expect((await search('m')).groups).toEqual([])
  })

  // review M26
  it('matches tasks by title and description, not by their status', async () => {
    expect(group(await search('todo'), 'project')).toBeUndefined()
  })

  it('finds a user by last name and first name too', async () => {
    expect(group(await search('lehrer anna'), 'user').items.map((i) => i.id)).toEqual([7])
  })

  it('takes the user list whether or not it comes wrapped in data', async () => {
    users.fetchForSelection.mockResolvedValue({ data: { data: [{ user_id: 9, firstname: 'Mia', lastname: 'M', username: 'mia' }] } })
    expect(group(await search('mia'), 'user').items.map((i) => i.id)).toEqual([9])

    setActivePinia(createPinia())
    users.fetchForSelection.mockResolvedValue({ data: undefined })
    expect(group(await search('mathe'), 'project').items).toHaveLength(1)
  })

  it('keeps the users after a pick, which clears only the query', async () => {
    const store = await search('mathe')

    store.clear()
    await store.ensureLoaded()

    expect(store.query).toBe('')
    expect(users.fetchForSelection).toHaveBeenCalledTimes(1)
  })

  it('forgets the users at logout, so the next session loads them again', async () => {
    const store = await search('mathe')

    store.reset()
    await store.ensureLoaded()

    expect(users.fetchForSelection).toHaveBeenCalledTimes(2)
  })

  describe('targetOf', () => {
    it('opens a direct chat with a user found', async () => {
      chat.openDirect.mockResolvedValue({ room_id: 31 })

      await expect(useSearchStore().targetOf({ type: 'user', id: 7 })).resolves.toEqual({
        name: 'Chat',
        query: { room: 31 },
      })
      expect(chat.openDirect).toHaveBeenCalledWith(7)
    })

    it('opens the project or task found', async () => {
      const store = useSearchStore()

      await expect(store.targetOf({ type: 'project', id: 1 })).resolves.toEqual({ name: 'TaskList', query: { task: 1 } })
      await expect(store.targetOf({ type: 'task', id: 2 })).resolves.toEqual({ name: 'TaskList', query: { task: 2 } })
      await expect(store.targetOf({ type: 'note', id: 5 })).resolves.toEqual({ name: 'NoteLists' })
      await expect(store.targetOf({ type: 'template', id: 6 })).resolves.toEqual({ name: 'TemplateLists' })
    })
  })

  it('loads the users once and searches on without them when that fails', async () => {
    const store = useSearchStore()
    await store.ensureLoaded()
    await store.ensureLoaded()
    expect(users.fetchForSelection).toHaveBeenCalledTimes(1)

    setActivePinia(createPinia())
    users.fetchForSelection.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const failing = await search('mathe')
    expect(group(failing, 'user')).toBeUndefined()
    expect(group(failing, 'project').items).toHaveLength(1)
  })
})
