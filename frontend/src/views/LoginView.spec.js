import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const pushMock = vi.fn()
const loginMock = vi.fn()
const completeMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    login: loginMock,
    completeTwoFactorLogin: completeMock,
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

  // UC-01b (M32): the code after the password
  const signInWithPassword = async () => {
    const { default: LoginView } = await import('./LoginView.vue')
    const wrapper = mount(LoginView, { global: { stubs: { RouterLink: true } } })
    await wrapper.find('input[type="text"]').setValue('tzwei')
    await wrapper.find('input[type="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    return wrapper
  }

  it('asks for the 2FA code after the password and signs in with it', async () => {
    loginMock.mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge' })
    completeMock.mockResolvedValue({})
    const wrapper = await signInWithPassword()

    expect(pushMock).not.toHaveBeenCalled()
    const code = wrapper.find('input[autocomplete="one-time-code"]')
    expect(code.exists()).toBe(true)
    await code.setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(completeMock).toHaveBeenCalledWith('challenge', '123456')
    expect(pushMock).toHaveBeenCalledWith({ name: 'Dashboard' })
  })

  it('says so when the code is wrong (401) and keeps the code step', async () => {
    loginMock.mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge' })
    completeMock.mockRejectedValue({ response: { status: 401 } })
    const wrapper = await signInWithPassword()

    await wrapper.find('input[autocomplete="one-time-code"]').setValue('000000')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Ungültiger oder abgelaufener Code.')
    expect(wrapper.find('input[autocomplete="one-time-code"]').exists()).toBe(true)
    expect(pushMock).not.toHaveBeenCalled()
  })

  // review M32: the interceptor turns a 429 into an Error with its message
  it('shows the wait message after too many codes', async () => {
    loginMock.mockResolvedValue({ twoFactorRequired: true, challengeToken: 'challenge' })
    completeMock.mockRejectedValue(new Error('Zu viele Anfragen. Bitte warte kurz.'))
    const wrapper = await signInWithPassword()

    await wrapper.find('input[autocomplete="one-time-code"]').setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('Zu viele Anfragen. Bitte warte kurz.')
  })

  // review M32: the Google callback hands a 2FA user's challenge over
  it('opens at the code step with a challenge from the Google callback', async () => {
    sessionStorage.setItem('twoFactorChallenge', 'google.challenge')
    completeMock.mockResolvedValue({})
    const { default: LoginView } = await import('./LoginView.vue')
    const wrapper = mount(LoginView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(sessionStorage.getItem('twoFactorChallenge')).toBeNull()
    await wrapper.find('input[autocomplete="one-time-code"]').setValue('123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(completeMock).toHaveBeenCalledWith('google.challenge', '123456')
    expect(pushMock).toHaveBeenCalledWith({ name: 'Dashboard' })
  })
})
