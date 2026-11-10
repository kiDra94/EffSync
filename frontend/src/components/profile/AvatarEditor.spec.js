import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'

const auth = reactive({ profilePicture: null, uploadAvatar: vi.fn(), deleteAvatar: vi.fn() })
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => auth }))

import AvatarEditor from './AvatarEditor.vue'
import UserAvatar from './UserAvatar.vue'

vi.mock('@/stores/entities/avatarStore', () => ({
  useAvatarStore: () => ({ imageUrl: vi.fn().mockResolvedValue('blob:avatar') }),
}))

const choose = async (wrapper, file) => {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

// T47, decision Q8c (M27): the own profile picture on the profile view
describe('AvatarEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.profilePicture = null
  })

  it('uploads a chosen image', async () => {
    auth.uploadAvatar.mockImplementation(async () => { auth.profilePicture = '/users/5/avatar?v=2' })
    const wrapper = mount(AvatarEditor, { props: { initials: 'FF' } })
    const file = new File(['png'], 'ich.png', { type: 'image/png' })

    await choose(wrapper, file)

    expect(auth.uploadAvatar).toHaveBeenCalledWith(file)
    expect(wrapper.findComponent(UserAvatar).props('picture')).toBe('/users/5/avatar?v=2')
  })

  it('rejects a file that is not an image before sending it', async () => {
    const wrapper = mount(AvatarEditor, { props: { initials: 'FF' } })

    await choose(wrapper, new File(['%PDF'], 'bild.pdf', { type: 'application/pdf' }))

    expect(auth.uploadAvatar).not.toHaveBeenCalled()
    expect(wrapper.find('.avatar-error').text()).toBe('Bitte wähle ein Bild (PNG, JPEG, GIF, WebP oder BMP).')
  })

  it('rejects an image over 1 MB before sending it', async () => {
    const wrapper = mount(AvatarEditor, { props: { initials: 'FF' } })

    await choose(wrapper, new File([new Uint8Array(1024 * 1024 + 1)], 'gross.png', { type: 'image/png' }))

    expect(auth.uploadAvatar).not.toHaveBeenCalled()
    expect(wrapper.find('.avatar-error').text()).toBe('Das Bild darf höchstens 1 MB groß sein.')
  })

  it("shows the server's reason when the upload fails", async () => {
    auth.uploadAvatar.mockRejectedValue({ response: { data: { message: 'Als Profilbild sind nur PNG, JPEG, GIF, WebP und BMP erlaubt' } } })
    const wrapper = mount(AvatarEditor, { props: { initials: 'FF' } })

    await choose(wrapper, new File(['x'], 'ich.png', { type: 'image/png' }))

    expect(wrapper.find('.avatar-error').text()).toBe('Als Profilbild sind nur PNG, JPEG, GIF, WebP und BMP erlaubt')
  })

  it('removes the picture, offered only when there is one', async () => {
    const wrapper = mount(AvatarEditor, { props: { initials: 'FF' } })
    expect(wrapper.find('.avatar-remove').exists()).toBe(false)

    auth.profilePicture = '/users/5/avatar?v=2'
    auth.deleteAvatar.mockImplementation(async () => { auth.profilePicture = null })
    await flushPromises()
    await wrapper.find('.avatar-remove').trigger('click')
    await flushPromises()

    expect(auth.deleteAvatar).toHaveBeenCalled()
    expect(wrapper.text()).toContain('FF')
  })
})
