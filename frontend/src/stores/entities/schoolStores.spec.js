import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

const { api } = vi.hoisted(() => {
  const crud = () => ({
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  });
  return {
    api: {
      departmentsApi: crud(),
      subjectsApi: crud(),
      roomsApi: crud(),
      schedulesApi: crud(),
      classesApi: {
        ...crud(),
        assignable: vi.fn(),
        replaceStudents: vi.fn(),
        replaceTeachers: vi.fn(),
      },
    },
  };
});
vi.mock('@/api/schoolOrganization', () => api);

import {
  useClassStore,
  useDepartmentStore,
  useRoomStore,
  useScheduleStore,
  useSubjectStore,
} from './schoolStores';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
  localStorage.clear();
});

// GOALS.md M36 (decision D1): each school store works on the real API and
// keeps nothing in localStorage
describe.each([
  ['department store', useDepartmentStore, 'departmentsApi', 'department_id'],
  ['subject store', useSubjectStore, 'subjectsApi', 'subject_id'],
  ['room store', useRoomStore, 'roomsApi', 'room_id'],
  ['schedule store', useScheduleStore, 'schedulesApi', 'schedule_id'],
])('%s', (_name, useStore, apiName, idKey) => {
  it('loads the list from the API', async () => {
    api[apiName].list.mockResolvedValue([{ [idKey]: 1, name: 'A' }]);
    const store = useStore();

    await store.load();

    expect(store.items).toEqual([{ [idKey]: 1, name: 'A' }]);
    expect(store.loading).toBe(false);
    expect(localStorage.length).toBe(0);
  });

  it('creates and changes through the API and reloads the list', async () => {
    api[apiName].list.mockResolvedValue([{ [idKey]: 2, name: 'B' }]);
    const store = useStore();

    await store.add({ name: 'B' });
    await store.edit(2, { name: 'C' });

    expect(api[apiName].create).toHaveBeenCalledWith({ name: 'B' });
    expect(api[apiName].update).toHaveBeenCalledWith(2, { name: 'C' });
    expect(api[apiName].list).toHaveBeenCalledTimes(2);
  });

  it('removes an entry and keeps the backend message of a refusal', async () => {
    const store = useStore();
    store.items = [{ [idKey]: 1 }, { [idKey]: 2 }];

    await store.remove(1);
    expect(store.items).toEqual([{ [idKey]: 2 }]);

    api[apiName].remove.mockRejectedValue({ response: { data: { message: 'wird noch verwendet' } } });
    await expect(store.remove(2)).rejects.toBeTruthy();
    expect(store.error).toBe('wird noch verwendet');
    expect(store.items).toEqual([{ [idKey]: 2 }]);
  });
});

describe('class store', () => {
  it('lists classes through its catalog', async () => {
    api.classesApi.list.mockResolvedValue([{ class_id: 1, name: '5AHITM' }]);
    const store = useClassStore();

    await store.catalog.load();

    expect(store.catalog.items).toEqual([{ class_id: 1, name: '5AHITM' }]);
  });

  it('opens a class with its members and the assignable people', async () => {
    api.classesApi.get.mockResolvedValue({ class_id: 1, students: [{ user_id: 4 }], teachers: [] });
    api.classesApi.assignable.mockResolvedValue({ students: [{ user_id: 4 }], teachers: [{ user_id: 2 }] });
    const store = useClassStore();

    await store.open(1);
    await store.loadAssignable();

    expect(store.current.students).toEqual([{ user_id: 4 }]);
    expect(store.assignable.teachers).toEqual([{ user_id: 2 }]);
  });

  it('replaces the students and teachers and shows the class the API returns (decision D2)', async () => {
    api.classesApi.replaceStudents.mockResolvedValue({ class_id: 1, students: [{ user_id: 7 }] });
    api.classesApi.replaceTeachers.mockResolvedValue({ class_id: 1, teachers: [{ user_id: 3 }] });
    const store = useClassStore();

    await store.setStudents(1, [7]);
    expect(api.classesApi.replaceStudents).toHaveBeenCalledWith(1, [7]);
    expect(store.current.students).toEqual([{ user_id: 7 }]);

    await store.setTeachers(1, [3]);
    expect(api.classesApi.replaceTeachers).toHaveBeenCalledWith(1, [3]);
  });

  it('keeps the 403 message when a teacher of another class tries', async () => {
    api.classesApi.replaceStudents.mockRejectedValue({ response: { status: 403, data: { message: 'Nur Lehrkräfte dieser Klasse' } } });
    const store = useClassStore();

    await expect(store.setStudents(1, [7])).rejects.toBeTruthy();
    expect(store.catalog.error).toBe('Nur Lehrkräfte dieser Klasse');
  });
});
