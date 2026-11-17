import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

const route = reactive({ params: { id: '5' }, query: {} })
vi.mock('vue-router', () => ({ useRoute: () => route, useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }))
const auth = reactive({ userId: 5, userDetails: { username: 'ffuchs', firstname: 'Felix', lastname: 'Fuchs' } })
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => auth }))
vi.mock('@/stores/notificationStore', () => ({
  useNotificationStore: () => ({ unreadCount: 0, initFromStorage: vi.fn() }),
}))

import UserProfileView from './UserProfileView.vue'

const stubs = {
  AvatarEditor: { name: 'AvatarEditor', props: ['initials'], template: '<div class="avatar-editor-stub" />' },
  SecurityTab: true,
  NotificationsList: true,
  EmailPreferences: true,
}
const tabLabels = (wrapper) => wrapper.findAll('.tab-btn').map((tab) => tab.text())

// T47, decision Q8c (M27): the own profile changes the own picture and password
describe('UserProfileView', () => {
  beforeEach(() => {
    localStorage.clear()
    route.params.id = '5'
    route.query = {}
  })

  it('offers the picture editor and the security tab on the own profile', async () => {
    const wrapper = mount(UserProfileView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'AvatarEditor' }).props('initials')).toBe('FF')
    expect(tabLabels(wrapper)).toContain('Sicherheit')
  })

  // review M27: the password form there always changes the signed-in user's own
  it("shows neither on another user's profile", async () => {
    route.params.id = '42'
    route.query = { tab: 'security' }
    const wrapper = mount(UserProfileView, { global: { stubs } })
    await flushPromises()

    expect(wrapper.findComponent({ name: 'AvatarEditor' }).exists()).toBe(false)
    expect(tabLabels(wrapper)).not.toContain('Sicherheit')
    expect(wrapper.findComponent({ name: 'SecurityTab' }).exists()).toBe(false)
  })
})
