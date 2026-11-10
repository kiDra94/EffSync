import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const avatars = vi.hoisted(() => ({ imageUrl: vi.fn() }))
vi.mock('@/stores/entities/avatarStore', () => ({ useAvatarStore: () => avatars }))

import UserAvatar from './UserAvatar.vue'

// T47, decision Q8c (M27): the picture instead of the initials when present
describe('UserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    avatars.imageUrl.mockResolvedValue('blob:avatar-1')
  })

  it('shows the initials without a picture', async () => {
    const wrapper = mount(UserAvatar, { props: { picture: null, initials: 'FF' } })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('FF')
    expect(avatars.imageUrl).not.toHaveBeenCalled()
  })

  it('shows the picture, loaded with the token, when present', async () => {
    const wrapper = mount(UserAvatar, { props: { picture: '/users/5/avatar?v=1', initials: 'FF' } })
    await flushPromises()

    expect(avatars.imageUrl).toHaveBeenCalledWith('/users/5/avatar?v=1')
    expect(wrapper.find('img').attributes('src')).toBe('blob:avatar-1')
    expect(wrapper.text()).toBe('')
  })

  it('keeps the initials when the picture cannot be loaded', async () => {
    avatars.imageUrl.mockRejectedValue(new Error('404'))
    const wrapper = mount(UserAvatar, { props: { picture: '/users/5/avatar?v=1', initials: 'FF' } })
    await flushPromises()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('FF')
  })

  it('follows a changed picture and its removal', async () => {
    const wrapper = mount(UserAvatar, { props: { picture: '/users/5/avatar?v=1', initials: 'FF' } })
    await flushPromises()

    avatars.imageUrl.mockResolvedValue('blob:avatar-2')
    await wrapper.setProps({ picture: '/users/5/avatar?v=2' })
    await flushPromises()
    expect(wrapper.find('img').attributes('src')).toBe('blob:avatar-2')

    await wrapper.setProps({ picture: null })
    await flushPromises()
    expect(wrapper.text()).toBe('FF')
  })
})
