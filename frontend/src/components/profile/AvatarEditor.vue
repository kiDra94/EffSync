<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import UserAvatar from '@/components/profile/UserAvatar.vue';

// T47, decision Q8c (M27): change or remove the own profile picture; the
// server checks the content again (magic bytes, at most 1 MB)
defineProps({
  initials: { type: String, default: '' },
});

const MAX_BYTES = 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp'];

const authStore = useAuthStore();
const busy = ref(false);
const error = ref('');

async function run(action) {
  busy.value = true;
  error.value = '';
  try {
    await action();
  } catch (e) {
    error.value = e?.response?.data?.message || 'Das Profilbild konnte nicht gespeichert werden.';
  } finally {
    busy.value = false;
  }
}

function onChoose(event) {
  const file = event.target.files?.[0];
  // the same file can be chosen again after an error
  event.target.value = '';
  if (!file) return;
  if (!TYPES.includes(file.type)) {
    error.value = 'Bitte wähle ein Bild (PNG, JPEG, GIF, WebP oder BMP).';
    return;
  }
  if (file.size > MAX_BYTES) {
    error.value = 'Das Bild darf höchstens 1 MB groß sein.';
    return;
  }
  return run(() => authStore.uploadAvatar(file));
}
</script>

<template>
  <div class="avatar-editor">
    <div class="avatar-large">
      <UserAvatar :picture="authStore.profilePicture" :initials="initials" />
    </div>
    <div class="avatar-actions">
      <label class="avatar-change" :class="{ disabled: busy }">
        📷 Bild ändern
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/bmp" :disabled="busy"
          class="visually-hidden" @change="onChoose" />
      </label>
      <button v-if="authStore.profilePicture" type="button" class="avatar-remove" :disabled="busy"
        @click="run(() => authStore.deleteAvatar())">
        Entfernen
      </button>
    </div>
    <p v-if="error" class="avatar-error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.avatar-editor { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.avatar-large {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #4f46e5;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: bold;
}
.avatar-actions { display: flex; gap: 8px; font-size: 0.8rem; }
.avatar-change, .avatar-remove {
  cursor: pointer;
  color: #4f46e5;
  background: none;
  border: none;
  padding: 0;
  font-size: 0.8rem;
}
.avatar-change.disabled { opacity: 0.5; cursor: default; }
.avatar-change:focus-within { outline: 2px solid #4f46e5; outline-offset: 2px; }
.avatar-remove { color: #b91c1c; }
.avatar-error { color: #b91c1c; font-size: 0.8rem; margin: 0; max-width: 220px; text-align: center; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
