import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive } from 'vue'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const store = reactive({
  notifications: [],
  sortedNotifications: [],
  hasMore: false,
  isLoading: false,
  loadMore: vi.fn(),
  deleteNotification: vi.fn(),
})
vi.mock('@/stores/notificationStore', () => ({ useNotificationStore: () => store }))

import NotificationsList from './NotificationsList.vue'

// review M37: the API pages the notifications; the list loads older ones
describe('NotificationsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.hasMore = false
    store.isLoading = false
  })

  const loadMoreButton = (wrapper) =>
    wrapper.findAll('button').find((b) => b.text().includes('Ältere laden'))

  it('offers the older notifications while there are more', async () => {
    store.hasMore = true
    const wrapper = mount(NotificationsList)

    await loadMoreButton(wrapper).trigger('click')

    expect(store.loadMore).toHaveBeenCalledTimes(1)
  })

  it('hides the button on the last page', () => {
    const wrapper = mount(NotificationsList)

    expect(loadMoreButton(wrapper)).toBeUndefined()
  })
})
