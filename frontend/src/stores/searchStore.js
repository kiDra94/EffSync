import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/entities/taskStore'
import { useNoteStore } from '@/stores/entities/noteStore'
import { useTemplateStore } from '@/stores/entities/templateStore'
import { useUserStore } from '@/stores/entities/userStore'
import { useChatStore } from '@/stores/entities/chatStore'

// results per group in the dropdown
const PER_GROUP = 5

const matches = (q, ...fields) => fields.some((field) => field?.toLowerCase().includes(q))

/** The user list, whether the answer wraps it in `data` or not (review M26). */
const listOf = (response) =>
    [response?.data?.data, response?.data, response].find(Array.isArray) ?? []

/**
 * The global search (T42, FA-52: tasks, projects and users; T43, FA-53:
 * grouped by category; M26). A project is a top-level task (decision Q2),
 * the other matching tasks stay under "Aufgaben".
 */
export const useSearchStore = defineStore('search', () => {
    const query = ref('')
    // the users the chat lists too (GET /users/for-chat, no e-mail addresses)
    const users = ref([])
    // once per session, also when it failed (no repeated 403s on every focus)
    let usersTried = false

    const taskStore = useTaskStore()
    const noteStore = useNoteStore()
    const templateStore = useTemplateStore()
    const userStore = useUserStore()

    async function loadUsers() {
        if (usersTried) return
        usersTried = true
        try {
            users.value = listOf(await userStore.fetchForSelection())
        } catch (error) {
            // the search goes on without users
            console.warn('Benutzer für die Suche nicht geladen:', error?.message || error)
        }
    }

    async function ensureLoaded() {
        const promises = [loadUsers()]
        if (!taskStore.tasks?.length)
            promises.push(taskStore.getTasks())

        if (!noteStore.notes?.length)
            promises.push(noteStore.getNotes())

        if (!templateStore.templates?.length)
            promises.push(templateStore.getTemplates())

        await Promise.all(promises)
    }

    /** After a pick: the query only. */
    function clear() {
        query.value = ''
    }

    /** At logout: the next session loads the users again. */
    function reset() {
        clear()
        users.value = []
        usersTried = false
    }

    /**
     * Where a result leads (review M26): a user to a direct chat with them
     * (the list is the chat's), a project or task to itself in the task list.
     */
    async function targetOf(result) {
        switch (result.type) {
            case 'user': {
                const room = await useChatStore().openDirect(result.id)
                return { name: 'Chat', query: { room: room.room_id } }
            }
            case 'project':
            case 'task':
                return { name: 'TaskList', query: { task: result.id } }
            case 'note':
                return { name: 'NoteLists' }
            default:
                return { name: 'TemplateLists' }
        }
    }

    /** The matches by category, in a fixed order; empty groups are left out. */
    const groups = computed(() => {
        const q = query.value.trim().toLowerCase()
        if (q.length < 2) return []

        // by title and description: a status word would match whole lists
        const tasks = (taskStore.tasks || []).filter((t) => matches(q, t.title, t.description))
        const taskItem = (t) => ({ type: 'task', icon: '📋', label: t.title, sub: t.status ?? 'Task', id: t.task_id })
        const all = [
            {
                key: 'project',
                label: 'Projekte',
                items: tasks.filter((t) => t.parent_task_id == null)
                    .map((t) => ({ ...taskItem(t), type: 'project', icon: '📁' })),
            },
            {
                key: 'task',
                label: 'Aufgaben',
                items: tasks.filter((t) => t.parent_task_id != null).map(taskItem),
            },
            {
                key: 'user',
                label: 'Benutzer',
                items: users.value
                    .filter((u) => matches(q, u.username, `${u.firstname} ${u.lastname}`, `${u.lastname} ${u.firstname}`))
                    .map((u) => ({ type: 'user', icon: '👤', label: `${u.firstname} ${u.lastname}`, sub: `@${u.username}`, id: u.user_id })),
            },
            {
                key: 'note',
                label: 'Notizen',
                items: (noteStore.notes || []).filter((n) => matches(q, n.title, n.description))
                    .map((n) => ({ type: 'note', icon: '📝', label: n.title, sub: 'Notiz', id: n.note_id })),
            },
            {
                key: 'template',
                label: 'Vorlagen',
                items: (templateStore.templates || []).filter((t) => matches(q, t.name, t.description))
                    .map((t) => ({ type: 'template', icon: '📄', label: t.name, sub: 'Vorlage', id: t.template_id })),
            },
        ]
        // `more`: how many matches the group doesn't show
        return all
            .filter((group) => group.items.length > 0)
            .map((group) => ({
                ...group,
                items: group.items.slice(0, PER_GROUP),
                more: Math.max(0, group.items.length - PER_GROUP),
            }))
    })

    return { query, groups, ensureLoaded, clear, reset, targetOf }
})
