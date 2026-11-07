import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

const pushMock = vi.fn()
const loginMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    login: loginMock,
  }),
}))

describe('LoginView (Google OAuth)', () => {
  let originalLocation

  beforeEach(() => {
    vi.clearAllMocks()
    originalLocation = window.location
    delete window.location
    window.location = { href: 'http://localhost:5173/login' }
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('redirectet auf Backend Google Auth endpoint bei Klick auf Google Button', async () => {
    const { default: LoginView } = await import('./LoginView.vue')

    const wrapper = mount(LoginView, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    })

    const googleBtn = wrapper.find('.btn-google')
    expect(googleBtn.exists()).toBe(true)

    await googleBtn.trigger('click')

    expect(window.location.href).toContain('/auth/google')
    expect(window.location.href).toContain('http://localhost:3000/api')
  })

  // T49 (M9): one field for username or e-mail, sent as `identifier`
  it('sends the username or e-mail address as identifier', async () => {
    loginMock.mockResolvedValue({})
    const { default: LoginView } = await import('./LoginView.vue')
    const wrapper = mount(LoginView, { global: { stubs: { RouterLink: true } } })

    await wrapper.find('input[type="text"]').setValue('felix@student.htl.at')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')

    expect(loginMock).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'felix@student.htl.at', password: 'password123' }),
    )
  })
})
