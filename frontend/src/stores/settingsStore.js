import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { settingsApi } from '@/api/settings';
import { emailPreferencesService } from '@/api/emailPreferences';

const DEFAULT_THEME = 'light';
const THEMES = ['light', 'dark', 'system'];
// where the theme lived before M25: LayoutView ('theme') and the settings ('darkMode')
const LEGACY_KEYS = ['darkMode', 'theme'];

/** This browser's theme from before M25, once, and gone afterwards. */
function takeLegacyTheme() {
    try {
        const found = LEGACY_KEYS.map((key) => localStorage.getItem(key)).find((value) => THEMES.includes(value));
        LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
        return found ?? null;
    } catch {
        return null;
    }
}

/**
 * The signed-in user's settings (M25): the theme, stored on the server per
 * user (T68, decision Q8f) instead of in this browser, and the e-mail
 * preferences. Views go through this store, not through the api/ layer
 * (decision Q19).
 */
export const useSettingsStore = defineStore('settings', () => {
    const theme = ref(DEFAULT_THEME);
    const saveError = ref('');
    // the device's preference, for the theme "system"
    const systemDark = ref(false);
    let watchingSystem = false;
    let loaded = false;
    // a pick made while a load is on its way wins over the load's answer
    let changesSinceLoad = 0;

    const isDark = computed(() =>
        theme.value === 'dark' || (theme.value === 'system' && systemDark.value),
    );

    function apply() {
        document.body.classList.toggle('dark-mode', isDark.value);
    }

    function watchSystem() {
        if (watchingSystem || typeof window.matchMedia !== 'function') return;
        watchingSystem = true;
        const query = window.matchMedia('(prefers-color-scheme: dark)');
        systemDark.value = query.matches;
        query.addEventListener('change', () => {
            systemDark.value = query.matches;
            // after a logout the theme is light again, so this keeps it light
            apply();
        });
    }

    /** The user's theme from the server, at login (and after a reload). */
    async function load() {
        watchSystem();
        loaded = true;
        const changesBefore = changesSinceLoad;
        let stored = null;
        try {
            const { data } = await settingsApi.getSettings();
            stored = data?.theme ?? DEFAULT_THEME;
        } catch (error) {
            console.error('Fehler beim Laden der Einstellungen:', error);
        }
        if (changesSinceLoad !== changesBefore) return;
        if (stored !== null) theme.value = stored;
        apply();
        // the choice this browser kept before M25 goes to the server once,
        // unless the user already chose there
        const legacy = takeLegacyTheme();
        if (legacy && stored === DEFAULT_THEME && legacy !== DEFAULT_THEME) {
            await setTheme(legacy);
        }
    }

    /** Loads unless this session did already (the layout after a reload). */
    function ensureLoaded() {
        return loaded ? Promise.resolve() : load();
    }

    /**
     * Shows the theme at once and stores it for all of the user's devices;
     * if that fails, the previous theme comes back with a message.
     */
    async function setTheme(newTheme) {
        watchSystem();
        changesSinceLoad++;
        const previous = theme.value;
        saveError.value = '';
        theme.value = newTheme;
        apply();
        try {
            await settingsApi.updateSettings({ theme: newTheme });
        } catch (error) {
            console.error('Fehler beim Speichern des Themes:', error);
            theme.value = previous;
            apply();
            saveError.value = 'Das Theme konnte nicht gespeichert werden.';
        }
    }

    function toggleDark() {
        return setTheme(isDark.value ? 'light' : 'dark');
    }

    /** At logout: the next user in this browser starts with the default. */
    function reset() {
        loaded = false;
        changesSinceLoad++;
        theme.value = DEFAULT_THEME;
        saveError.value = '';
        apply();
    }

    function loadEmailPreferences() {
        return emailPreferencesService.getPreferences();
    }

    function saveEmailPreferences(preferences) {
        return emailPreferencesService.updatePreferences(preferences);
    }

    return {
        theme,
        isDark,
        saveError,
        load,
        ensureLoaded,
        setTheme,
        toggleDark,
        reset,
        loadEmailPreferences,
        saveEmailPreferences,
    };
});
