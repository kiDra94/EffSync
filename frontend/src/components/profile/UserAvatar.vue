<script setup>
import { ref, watch } from 'vue';
import { useAvatarStore } from '@/stores/entities/avatarStore';

// T47, decision Q8c (M27): the profile picture, or the initials without one
// (or while and when it fails to load); the parent sets size and colours
const props = defineProps({
  picture: { type: String, default: null },
  initials: { type: String, default: '' },
});

const avatarStore = useAvatarStore();
const src = ref(null);

watch(() => props.picture, async (picture) => {
  src.value = null;
  if (!picture) return;
  try {
    const url = await avatarStore.imageUrl(picture);
    // a newer picture may have come in the meantime
    if (props.picture === picture) src.value = url;
  } catch {
    // the initials stay
  }
}, { immediate: true });
</script>

<template>
  <img v-if="src" :src="src" alt="" class="user-avatar-img" @error="src = null" />
  <template v-else>{{ initials }}</template>
</template>

<style scoped>
.user-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
</style>
