import { describe, it, expect, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import SchoolCatalog from './SchoolCatalog.vue';

// GOALS.md M36: the catalog behind the subject and room views
describe('SchoolCatalog', () => {
  const fields = [
    { key: 'name', label: 'Raum', required: true },
    { key: 'building', label: 'Gebäude' },
    { key: 'capacity', label: 'Plätze', type: 'number' },
  ];
  const mountWith = (items) => {
    const store = {
      items,
      loading: false,
      error: null,
      load: vi.fn().mockResolvedValue(),
      add: vi.fn().mockResolvedValue(),
      edit: vi.fn().mockResolvedValue(),
      remove: vi.fn().mockResolvedValue(),
    };
    const wrapper = mount(SchoolCatalog, {
      props: { title: 'Räume', singular: 'Raum', store, idKey: 'room_id', fields },
    });
    return { wrapper, store };
  };

  it('loads the list and shows its rows', () => {
    const { wrapper, store } = mountWith([{ room_id: 1, name: 'EDV 1', building: 'Altbau', capacity: 30 }]);

    expect(store.load).toHaveBeenCalled();
    expect(wrapper.text()).toContain('EDV 1');
    expect(wrapper.text()).toContain('Altbau');
  });

  it('creates without the empty optional fields and with numbers as numbers', async () => {
    const { wrapper, store } = mountWith([]);

    await wrapper.find('.catalog-header .btn-primary').trigger('click');
    await wrapper.find('#name').setValue('Werkstatt');
    await wrapper.find('#capacity').setValue('16');
    await wrapper.find('form').trigger('submit');

    expect(store.add).toHaveBeenCalledWith({ name: 'Werkstatt', capacity: 16 });
  });

  // review M36: clearing an optional field on edit clears it in the database
  it('sends an emptied optional field as null when editing', async () => {
    const { wrapper, store } = mountWith([{ room_id: 1, name: 'EDV 1', building: 'Altbau', capacity: 30 }]);

    await wrapper.find('button[title="Bearbeiten"]').trigger('click');
    await wrapper.find('#building').setValue('');
    await wrapper.find('form').trigger('submit');

    expect(store.edit).toHaveBeenCalledWith(1, { name: 'EDV 1', building: null, capacity: 30 });
  });

  it('deletes after the confirmation', async () => {
    const { wrapper, store } = mountWith([{ room_id: 1, name: 'EDV 1' }]);

    await wrapper.find('button[title="Löschen"]').trigger('click');
    await wrapper.find('.btn-danger').trigger('click');
    await flushPromises();

    expect(store.remove).toHaveBeenCalledWith(1);
  });
});
