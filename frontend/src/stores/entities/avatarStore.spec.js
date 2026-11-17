import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const avatarsApi = vi.hoisted(() => ({ fetchAvatar: vi.fn() }))
vi.mock('@/api/avatars', () => avatarsApi)

import { useAvatarStore } from './avatarStore'

// T47, decision Q8c, review M27: pictures need the token, so they are loaded
// through the API client and shown as object URLs
describe('avatarStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    let n = 0
    URL.createObjectURL = vi.fn(() => `blob:avatar-${++n}`)
    URL.revokeObjectURL = vi.fn()
    avatarsApi.fetchAvatar.mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  })

  it('loads a picture once and hands out its object URL', async () => {
    const store = useAvatarStore()

    const [first, second] = await Promise.all([
      store.imageUrl('/users/5/avatar?v=1'),
      store.imageUrl('/users/5/avatar?v=1'),
    ])

    expect(first).toBe('blob:avatar-1')
    expect(second).toBe('blob:avatar-1')
    expect(avatarsApi.fetchAvatar).toHaveBeenCalledTimes(1)
    expect(avatarsApi.fetchAvatar).toHaveBeenCalledWith('/users/5/avatar?v=1')
  })

  it('tries a failed picture again next time', async () => {
    avatarsApi.fetchAvatar.mockRejectedValueOnce(new Error('429'))
    const store = useAvatarStore()

    await expect(store.imageUrl('/users/5/avatar?v=1')).rejects.toThrow('429')
    await expect(store.imageUrl('/users/5/avatar?v=1')).resolves.toBe('blob:avatar-1')
  })

  it('frees the object URLs at logout', async () => {
    const store = useAvatarStore()
    await store.imageUrl('/users/5/avatar?v=1')

    store.reset()
    // a load still on its way is freed when it arrives
    await new Promise((resolve) => setTimeout(resolve))

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:avatar-1')
    await store.imageUrl('/users/5/avatar?v=1')
    expect(avatarsApi.fetchAvatar).toHaveBeenCalledTimes(2)
  })
})
