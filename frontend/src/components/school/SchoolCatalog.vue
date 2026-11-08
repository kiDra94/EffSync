<script setup>
import { computed, onMounted, ref } from 'vue';

/**
 * A simple school catalog on a store (GOALS.md M36: subjects and rooms):
 * list, create, edit and delete. `fields` names the columns and form inputs.
 */
const props = defineProps({
  title: { type: String, required: true },
  singular: { type: String, required: true },
  store: { type: Object, required: true },
  idKey: { type: String, required: true },
  // [{ key, label, type: 'text' | 'number', required }]
  fields: { type: Array, required: true },
});

const editing = ref(null); // the form's values while it is open
const deleting = ref(null);
const searchQuery = ref('');

const filtered = computed(() => {
  const query = searchQuery.value.toLowerCase();
  if (!query) return props.store.items;
  return props.store.items.filter((item) => (item.name || '').toLowerCase().includes(query));
});

const openForm = (item = null) => {
  editing.value = item
    ? { ...item }
    : Object.fromEntries(props.fields.map((field) => [field.key, field.type === 'number' ? null : '']));
};

const isEmpty = (value) => value === '' || value === null || value === undefined;

// numbers are sent as numbers; an emptied optional field is cleared (null)
// when editing and left out when creating (review M36)
const payload = (values, editing) =>
  Object.fromEntries(
    props.fields
      .filter((field) => editing || !isEmpty(values[field.key]))
      .map((field) => {
        const value = values[field.key];
        if (isEmpty(value)) return [field.key, null];
        return [field.key, field.type === 'number' ? Number(value) : value];
      })
  );

const save = async () => {
  const id = editing.value[props.idKey];
  try {
    if (id) await props.store.edit(id, payload(editing.value, true));
    else await props.store.add(payload(editing.value, false));
    editing.value = null;
  } catch {
    // the store keeps the message for the page
  }
};

const confirmDelete = async () => {
  try {
    await props.store.remove(deleting.value[props.idKey]);
  } catch {
    // e.g. 409: still used by lessons
  }
  deleting.value = null;
};

onMounted(() => {
  props.store.load().catch(() => {});
});
</script>

<template>
  <div class="catalog-view">
    <div class="catalog-header">
      <h1>{{ title }}</h1>
      <button @click="openForm()" class="btn-primary">+ {{ singular }} anlegen</button>
    </div>

    <p v-if="store.error" class="error-message">{{ store.error }}</p>

    <input
      v-if="store.items.length > 0"
      v-model="searchQuery"
      type="text"
      :placeholder="`${title} durchsuchen...`"
      class="search-input"
    />

    <table v-if="filtered.length > 0" class="catalog-table">
      <thead>
        <tr>
          <th v-for="field in fields" :key="field.key">{{ field.label }}</th>
          <th style="width: 120px;">Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in filtered" :key="item[idKey]">
          <td v-for="field in fields" :key="field.key">{{ item[field.key] ?? '–' }}</td>
          <td>
            <button @click="openForm(item)" class="btn-icon" title="Bearbeiten">✏️</button>
            <button @click="deleting = item" class="btn-icon" title="Löschen">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else-if="!store.loading" class="empty-state">Noch keine Einträge vorhanden.</p>

    <div v-if="editing" class="modal-overlay" @click.self="editing = null">
      <form class="modal-content" @submit.prevent="save">
        <h2>{{ editing[idKey] ? `${singular} bearbeiten` : `${singular} anlegen` }}</h2>
        <div v-for="field in fields" :key="field.key" class="form-group">
          <label :for="field.key">{{ field.label }}{{ field.required ? ' *' : '' }}</label>
          <input
            :id="field.key"
            v-model="editing[field.key]"
            :type="field.type || 'text'"
            :required="field.required"
            :min="field.type === 'number' ? 1 : undefined"
          />
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-primary">Speichern</button>
          <button type="button" @click="editing = null" class="btn-secondary">Abbrechen</button>
        </div>
      </form>
    </div>

    <div v-if="deleting" class="modal-overlay" @click.self="deleting = null">
      <div class="modal-content">
        <h2>{{ singular }} löschen?</h2>
        <p><strong>{{ deleting.name }}</strong> wird endgültig gelöscht.</p>
        <div class="modal-actions">
          <button @click="confirmDelete" class="btn-danger">Löschen</button>
          <button @click="deleting = null" class="btn-secondary">Abbrechen</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-primary {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background-color: #4338ca;
}

.btn-secondary {
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.catalog-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.catalog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.catalog-header h1 {
  margin: 0;
  font-size: 2rem;
}

.search-input {
  width: 100%;
  max-width: 350px;
  padding: 10px;
  margin-bottom: 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.catalog-table {
  width: 100%;
  border-collapse: collapse;
}

.catalog-table th,
.catalog-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
}

.error-message {
  color: #b91c1c;
  margin-bottom: 12px;
}

.empty-state {
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--card-bg, #fff);
  padding: 24px;
  border-radius: 8px;
  width: 100%;
  max-width: 420px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.form-group input {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
