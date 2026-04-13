import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/entities/taskStore'
import { useNoteStore } from '@/stores/entities/noteStore'
import { useTemplateStore } from '@/stores/entities/templateStore'

export const useSearchStore = defineStore('search', () => {
    const query = ref('')

    const taskStore = useTaskStore()
    const noteStore = useNoteStore()
    const templateStore = useTemplateStore()

    async function ensureLoaded() {
        const promises = []
        if (!taskStore.tasks?.length)
            promises.push(taskStore.getTasks())

        if (!noteStore.notes?.length)
            promises.push(noteStore.getNotes())

        if (!templateStore.templates?.length)
            promises.push(templateStore.getTemplates())

        if (promises.length)
            await Promise.all(promises)

    }

    function reset() {
        query.value = ''
    }

    const results = computed(() => {
        const q = query.value.trim().toLowerCase()
        if (q.length < 2) return [];
        const matched = [];

        (taskStore.tasks || []).forEach(t => {
            if (t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.status?.toLowerCase().includes(q)) {
                matched.push({
                    type: 'task',
                    icon: '📋',
                    label: t.title,
                    sub: t.status ?? 'Task',
                    id: t.task_id
                })
            }
        });

        (noteStore.notes || []).forEach(n => {
            if (n.title?.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q)) {
                matched.push({
                    type: 'note',
                    icon: '📝',
                    label: n.title,
                    sub: 'Notiz',
                    id: n.note_id
                })
            }
        });

        (templateStore.templates || []).forEach(t => {
            if (t.name?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)) {
                matched.push({
                    type: 'template',
                    icon: '📄',
                    label: t.name,
                    sub: 'Vorlage',
                    id: t.template_id
                })
            }
        });

        return matched.slice(0, 10)
    })

    return { query, results, ensureLoaded, reset }
})
