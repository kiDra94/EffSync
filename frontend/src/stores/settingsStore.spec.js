import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const settingsApi = vi.hoisted(() => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}))
const emailPreferencesService = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}))
vi.mock('@/api/settings', () => ({ settingsApi }))
vi.mock('@/api/emailPreferences', () => ({ emailPreferencesService }))

import { useSettingsStore } from './settingsStore'

// T67, T68, decision Q8f (M25): the theme is stored per user on the server
describe('settingsStore', () => {
  let systemDark
  const listeners = []

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    document.body.classList.remove('dark-mode')
    localStorage.clear()
    systemDark = false
    listeners.length = 0
    window.matchMedia = vi.fn(() => ({
      get matches() {
        return systemDark
      },
      addEventListener: (_event, listener) => listeners.push(listener),
      removeEventListener: vi.fn(),
    }))
    settingsApi.getSettings.mockResolvedValue({ data: { theme: 'dark' } })
    settingsApi.updateSettings.mockImplementation((changes) => Promise.resolve({ data: changes }))
  })

  it('restores the theme from the server and applies it', async () => {
    const store = useSettingsStore()

    await store.load()

    expect(store.theme).toBe('dark')
    expect(store.isDark).toBe(true)
    expect(document.body.classList.contains('dark-mode')).toBe(true)
  })

  it('saves a new theme on the server, never in localStorage', async () => {
    const store = useSettingsStore()

    await store.setTheme('light')

    expect(settingsApi.updateSettings).toHaveBeenCalledWith({ theme: 'light' })
    expect(document.body.classList.contains('dark-mode')).toBe(false)
    expect(localStorage.getItem('theme')).toBeNull()
    expect(localStorage.getItem('darkMode')).toBeNull()
  })

  it('switches between light and dark', async () => {
    const store = useSettingsStore()
    await store.load()

    await store.toggleDark()

    expect(store.theme).toBe('light')
    expect(settingsApi.updateSettings).toHaveBeenLastCalledWith({ theme: 'light' })
  })

  it('follows the system with the system theme', async () => {
    systemDark = true
    const store = useSettingsStore()

    await store.setTheme('system')
    expect(document.body.classList.contains('dark-mode')).toBe(true)

    systemDark = false
    listeners.forEach((listener) => listener())
    expect(document.body.classList.contains('dark-mode')).toBe(false)
  })

  // review M25: a choice that wasn't saved doesn't pretend it was
  it('goes back to the previous theme and says so when saving fails', async () => {
    settingsApi.updateSettings.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const store = useSettingsStore()

    await store.setTheme('dark')

    expect(store.theme).toBe('light')
    expect(document.body.classList.contains('dark-mode')).toBe(false)
    expect(store.saveError).toBe('Das Theme konnte nicht gespeichert werden.')
  })

  it('loads once, however often the layout asks', async () => {
    const store = useSettingsStore()

    await store.load()
    await store.ensureLoaded()
    await store.ensureLoaded()

    expect(settingsApi.getSettings).toHaveBeenCalledTimes(1)
  })

  it('keeps a theme picked while the settings were still loading', async () => {
    let answer
    settingsApi.getSettings.mockReturnValue(new Promise((resolve) => (answer = resolve)))
    const store = useSettingsStore()

    const loading = store.load()
    await store.setTheme('system')
    answer({ data: { theme: 'light' } })
    await loading

    expect(store.theme).toBe('system')
  })

  it("moves this browser's old theme to the server once and forgets it", async () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('darkMode', 'dark')
    settingsApi.getSettings.mockResolvedValue({ data: { theme: 'light' } })
    const store = useSettingsStore()

    await store.load()

    expect(store.theme).toBe('dark')
    expect(settingsApi.updateSettings).toHaveBeenCalledWith({ theme: 'dark' })
    expect(localStorage.getItem('theme')).toBeNull()
    expect(localStorage.getItem('darkMode')).toBeNull()
  })

  it('keeps a theme already on the server over an old browser one', async () => {
    localStorage.setItem('darkMode', 'system')
    const store = useSettingsStore()

    await store.load() // the server says dark

    expect(store.theme).toBe('dark')
    expect(settingsApi.updateSettings).not.toHaveBeenCalled()
    expect(localStorage.getItem('darkMode')).toBeNull()
  })

  it('forgets the theme at logout, so the next user starts light', async () => {
    const store = useSettingsStore()
    await store.load()

    store.reset()

    expect(store.theme).toBe('light')
    expect(document.body.classList.contains('dark-mode')).toBe(false)
    await store.ensureLoaded()
    expect(settingsApi.getSettings).toHaveBeenCalledTimes(2)
  })

  it('stays light when the settings can not be loaded', async () => {
    settingsApi.getSettings.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const store = useSettingsStore()

    await store.load()

    expect(store.theme).toBe('light')
  })

  // M25 (decision Q19): the e-mail preferences go through the store too
  it('reads and saves the e-mail preferences', async () => {
    emailPreferencesService.getPreferences.mockResolvedValue({ email_on_deadline: false })
    emailPreferencesService.updatePreferences.mockResolvedValue({ email_on_deadline: true })
    const store = useSettingsStore()

    await expect(store.loadEmailPreferences()).resolves.toEqual({ email_on_deadline: false })
    await expect(store.saveEmailPreferences({ email_on_deadline: true })).resolves.toEqual({
      email_on_deadline: true,
    })
    expect(emailPreferencesService.updatePreferences).toHaveBeenCalledWith({ email_on_deadline: true })
  })
})
