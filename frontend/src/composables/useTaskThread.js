import { ref, computed, onMounted } from 'vue';

/** The author's name, or a deleted account's placeholder. */
export const authorOf = (item) =>
  item.users ? `${item.users.firstname} ${item.users.lastname}` : 'Gelöschter Benutzer';

export const dateOf = (item) => (item.created_at ? new Date(item.created_at).toLocaleString('de-DE') : '');

/**
 * A task's list with a form that adds to it: the comments and the grading
 * remarks (T09, T74, decision Q16, M27; review M27: one copy of the logic).
 * `load` and `add` are the store's calls; a 403 on loading calls `onForbidden`
 * instead of showing an error, if given.
 */
export function useTaskThread({ load, add, loadError, saveError, onForbidden }) {
  const items = ref([]);
  const draft = ref('');
  const sending = ref(false);
  const error = ref('');

  const canSend = computed(() => draft.value.trim().length > 0 && !sending.value);

  async function reload() {
    error.value = '';
    try {
      items.value = await load();
    } catch (e) {
      if (onForbidden && e?.response?.status === 403) {
        onForbidden();
        return;
      }
      console.error(loadError, e);
      error.value = loadError;
    }
  }

  async function send() {
    if (!canSend.value) return;
    sending.value = true;
    error.value = '';
    try {
      items.value.push(await add(draft.value.trim()));
      draft.value = '';
    } catch (e) {
      console.error(saveError, e);
      error.value = saveError;
    } finally {
      sending.value = false;
    }
  }

  onMounted(reload);

  return { items, draft, error, canSend, send };
}
