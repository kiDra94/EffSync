import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const api = vi.hoisted(() => ({
  fetchNotificationPage: vi.fn(),
  fetchUnreadCount: vi.fn(),
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}))
vi.mock('@/api/notification', () => api)
vi.mock('socket.io-client', () => ({ io: vi.fn() }))
vi.mock('@/api/socketAuth', () => ({ socketAuth: vi.fn(), reconnectWithFreshToken: vi.fn() }))

import { useNotificationStore } from './notificationStore'

// M37: the API pages the notifications; the store holds the newest page and
// counts the unread ones beyond it from the server
describe('notificationStore', () => {
  const page = [
    { notification_id: 3, is_read: false },
    { notification_id: 2, is_read: false },
    { notification_id: 1, is_read: true },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    api.fetchNotificationPage.mockResolvedValue({
      notifications: page.map((n) => ({ ...n })),
      meta: { page: 1, totalPages: 1 },
    })
    // 2 unread on the page, 5 more on older pages
    api.fetchUnreadCount.mockResolvedValue(7)
    api.markNotificationAsRead.mockResolvedValue({})
    api.markAllNotificationsAsRead.mockResolvedValue({})
  })

  it('loads the newest page and counts the unread ones on older pages too', async () => {
    const store = useNotificationStore()

    await store.fetchNotifications()

    expect(store.notifications).toHaveLength(3)
    expect(store.unreadNotifications).toHaveLength(2)
    expect(store.unreadCount).toBe(7)
  })

  it('counts one less after marking one as read', async () => {
    const store = useNotificationStore()
    await store.fetchNotifications()

    await store.markAsRead(3)

    expect(api.markNotificationAsRead).toHaveBeenCalledWith(3)
    expect(store.unreadCount).toBe(6)
  })

  it('marks all as read on the server, older pages included', async () => {
    const store = useNotificationStore()
    await store.fetchNotifications()

    await store.markAllAsRead()

    expect(api.markAllNotificationsAsRead).toHaveBeenCalledTimes(1)
    expect(api.markNotificationAsRead).not.toHaveBeenCalled()
    expect(store.unreadCount).toBe(0)
    expect(store.notifications.every((n) => n.is_read)).toBe(true)
  })

  it('reloads when marking all as read fails', async () => {
    const store = useNotificationStore()
    await store.fetchNotifications()
    api.markAllNotificationsAsRead.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await store.markAllAsRead()

    expect(api.fetchNotificationPage).toHaveBeenCalledTimes(2)
    expect(store.unreadCount).toBe(7)
  })

  // review M37: the older pages stay reachable
  it('loads the next page on demand, without duplicates', async () => {
    api.fetchNotificationPage
      .mockResolvedValueOnce({
        notifications: page.map((n) => ({ ...n })),
        meta: { page: 1, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        // one arrived meanwhile and pushed notification 1 onto page 2
        notifications: [{ notification_id: 1, is_read: true }, { notification_id: 0, is_read: false }],
        meta: { page: 2, totalPages: 2 },
      })
    const store = useNotificationStore()
    await store.fetchNotifications()
    expect(store.hasMore).toBe(true)

    await store.loadMore()

    expect(api.fetchNotificationPage).toHaveBeenLastCalledWith(2)
    expect(store.notifications.map((n) => n.notification_id)).toEqual([3, 2, 1, 0])
    expect(store.hasMore).toBe(false)
    // notification 0 moved from the older pages into the list: still 7
    expect(store.unreadCount).toBe(7)
  })

  it('still loads the page when the unread count fails', async () => {
    api.fetchUnreadCount.mockRejectedValue(new Error('offline'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const store = useNotificationStore()

    await store.fetchNotifications()

    expect(store.notifications).toHaveLength(3)
    expect(store.unreadCount).toBe(2)
  })
})
