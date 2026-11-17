import { defineStore } from 'pinia';
import { fetchAvatar } from '@/api/avatars';

/**
 * The profile pictures (T47, decision Q8c, M27). They need the token (review
 * M27), so an <img> can't load them itself: each is loaded once through the
 * API client and shown as an object URL. The path carries the change time,
 * so a new picture is a new entry.
 */
export const useAvatarStore = defineStore('avatar', () => {
    // path → Promise of the object URL
    const urls = new Map();

    function imageUrl(path) {
        if (!urls.has(path)) {
            const loading = fetchAvatar(path).then((blob) => URL.createObjectURL(blob));
            // a failed load (404, offline) is tried again next time
            loading.catch(() => urls.delete(path));
            urls.set(path, loading);
        }
        return urls.get(path);
    }

    /** At logout: the pictures belong to this session. */
    function reset() {
        for (const loading of urls.values()) {
            loading.then((url) => URL.revokeObjectURL(url), () => {});
        }
        urls.clear();
    }

    return { imageUrl, reset };
});
