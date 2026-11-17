import { defineStore } from 'pinia';
import { ref } from 'vue';
import { classesApi, departmentsApi, roomsApi, schedulesApi, subjectsApi } from '@/api/schoolOrganization';

/** The message the backend sent (e.g. 409 "wird noch verwendet"), else a fallback. */
const errorMessage = (error, fallback = 'Aktion fehlgeschlagen') => {
    const message = error?.response?.data?.message;
    return Array.isArray(message) ? message.join(', ') : message || fallback;
};

/**
 * A store for one school area on the real API (GOALS.md M36, decision D1):
 * the list, and create, update and delete that keep it current. Nothing is
 * stored in the browser.
 */
const defineCatalogStore = (name, api, idKey) =>
    defineStore(name, () => {
        const items = ref([]);
        const loading = ref(false);
        const error = ref(null);

        async function run(work, fallback) {
            error.value = null;
            try {
                return await work();
            } catch (err) {
                error.value = errorMessage(err, fallback);
                throw err;
            }
        }

        async function load() {
            loading.value = true;
            try {
                items.value = await run(() => api.list(), 'Laden fehlgeschlagen');
            } finally {
                loading.value = false;
            }
        }

        async function add(data) {
            await run(() => api.create(data), 'Speichern fehlgeschlagen');
            await load();
        }

        async function edit(id, data) {
            await run(() => api.update(id, data), 'Speichern fehlgeschlagen');
            await load();
        }

        async function remove(id) {
            await run(() => api.remove(id), 'Löschen fehlgeschlagen');
            items.value = items.value.filter((item) => item[idKey] !== id);
        }

        return { items, loading, error, load, add, edit, remove, run };
    });

export const useDepartmentStore = defineCatalogStore('departments', departmentsApi, 'department_id');
export const useSubjectStore = defineCatalogStore('subjects', subjectsApi, 'subject_id');
export const useRoomStore = defineCatalogStore('rooms', roomsApi, 'room_id');
export const useScheduleStore = defineCatalogStore('schedules', schedulesApi, 'schedule_id');

const useClassCatalog = defineCatalogStore('classCatalog', classesApi, 'class_id');

/**
 * Classes, with the open class's members (decision D2): the detail, the
 * people who can be assigned, and replacing its students or teachers.
 */
export const useClassStore = defineStore('classes', () => {
    const catalog = useClassCatalog();
    const current = ref(null);
    const assignable = ref({ students: [], teachers: [] });

    async function open(id) {
        current.value = await catalog.run(() => classesApi.get(id), 'Klasse nicht gefunden');
    }

    async function loadAssignable() {
        assignable.value = await catalog.run(() => classesApi.assignable(), 'Laden fehlgeschlagen');
    }

    async function setStudents(id, studentIds) {
        current.value = await catalog.run(
            () => classesApi.replaceStudents(id, studentIds),
            'Schüler konnten nicht gespeichert werden',
        );
    }

    async function setTeachers(id, teacherIds) {
        current.value = await catalog.run(
            () => classesApi.replaceTeachers(id, teacherIds),
            'Lehrer konnten nicht gespeichert werden',
        );
    }

    return { catalog, current, assignable, open, loadAssignable, setStudents, setTeachers };
});
