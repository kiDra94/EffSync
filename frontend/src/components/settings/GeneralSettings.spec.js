import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'

const settings = reactive({ theme: 'light', setTheme: vi.fn() })
vi.mock('@/stores/settingsStore', () => ({ useSettingsStore: () => settings }))

import GeneralSettings from './GeneralSettings.vue'

// T68 (M25): the theme choice goes to the user's settings, not localStorage
describe('GeneralSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settings.theme = 'light'
    localStorage.clear()
  })

  it('shows the stored theme and saves a new one', async () => {
    settings.theme = 'system'
    const wrapper = mount(GeneralSettings)
    expect(wrapper.find('.toggle-btn.system').classes()).toContain('active')

    await wrapper.find('.toggle-btn.dark').trigger('click')

    expect(settings.setTheme).toHaveBeenCalledWith('dark')
    expect(localStorage.getItem('darkMode')).toBeNull()
  })
})
