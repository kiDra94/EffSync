import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// M25: the card reaches the 2FA routes through the auth store
const authApi = vi.hoisted(() => ({
  getTwoFactorStatus: vi.fn(),
  changePassword: vi.fn(),
  setupTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
}))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => authApi }))

import SecurityTab from './SecurityTab.vue'

// T31, FA-06 (M32): 2FA is set up in the profile with a QR code and a code
describe('SecurityTab two-factor authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApi.getTwoFactorStatus.mockResolvedValue({ enabled: false })
    authApi.setupTwoFactor.mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/x', qr_code: 'data:image/png;base64,QR',
    })
    authApi.enableTwoFactor.mockResolvedValue({})
    authApi.disableTwoFactor.mockResolvedValue({})
  })

  const button = (wrapper, text) => wrapper.findAll('button').find((b) => b.text().includes(text))

  it('sets it up with the QR code and enables it with a code', async () => {
    const wrapper = mount(SecurityTab)
    await flushPromises()

    await button(wrapper, '2FA aktivieren').trigger('click')
    await flushPromises()
    expect(wrapper.find('img.qr-code').attributes('src')).toBe('data:image/png;base64,QR')
    expect(wrapper.text()).toContain('JBSWY3DPEHPK3PXP')

    await wrapper.find('input[autocomplete="one-time-code"]').setValue('123456')
    await button(wrapper, 'Bestätigen').trigger('click')
    await flushPromises()

    expect(authApi.enableTwoFactor).toHaveBeenCalledWith('123456')
    expect(wrapper.text()).toContain('2FA ist aktiv')
    expect(wrapper.find('img.qr-code').exists()).toBe(false)
  })

  it('says so when the confirmation code is wrong', async () => {
    authApi.enableTwoFactor.mockRejectedValue({ response: { status: 400, data: { message: 'Ungültiger Code' } } })
    const wrapper = mount(SecurityTab)
    await flushPromises()
    await button(wrapper, '2FA aktivieren').trigger('click')
    await flushPromises()

    await wrapper.find('input[autocomplete="one-time-code"]').setValue('000000')
    await button(wrapper, 'Bestätigen').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ungültiger Code')
    expect(wrapper.find('img.qr-code').exists()).toBe(true)
  })

  it('turns it off with a code', async () => {
    authApi.getTwoFactorStatus.mockResolvedValue({ enabled: true })
    const wrapper = mount(SecurityTab)
    await flushPromises()
    expect(wrapper.text()).toContain('2FA ist aktiv')

    await wrapper.find('input[autocomplete="one-time-code"]').setValue('654321')
    await button(wrapper, '2FA deaktivieren').trigger('click')
    await flushPromises()

    expect(authApi.disableTwoFactor).toHaveBeenCalledWith('654321')
    expect(button(wrapper, '2FA aktivieren')).toBeDefined()
  })
})

// T47 (M27): the password change with the current password
describe('SecurityTab password change', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApi.getTwoFactorStatus.mockResolvedValue({ enabled: false })
    authApi.changePassword.mockResolvedValue({})
  })

  const fill = async (wrapper, current, next, confirm) => {
    const [a, b, c] = wrapper.findAll('.security-form input[type="password"]')
    await a.setValue(current)
    await b.setValue(next)
    await c.setValue(confirm)
    await wrapper.find('.security-form').trigger('submit')
    await flushPromises()
  }

  it('changes it with the current and the new password', async () => {
    const wrapper = mount(SecurityTab)
    await flushPromises()

    await fill(wrapper, 'altes-passwort', 'neues-passwort', 'neues-passwort')

    expect(authApi.changePassword).toHaveBeenCalledWith('altes-passwort', 'neues-passwort')
    expect(wrapper.find('.password-message').text()).toBe('Passwort geändert.')
    expect(wrapper.findAll('.security-form input[type="password"]').every((i) => i.element.value === '')).toBe(true)
  })

  it('refuses a confirmation that differs or a password that is too short, before sending', async () => {
    const wrapper = mount(SecurityTab)
    await flushPromises()

    await fill(wrapper, 'altes-passwort', 'neues-passwort', 'anderes-passwort')
    expect(wrapper.find('.password-error').text()).toBe('Die Passwörter stimmen nicht überein.')
    await fill(wrapper, 'altes-passwort', 'kurz', 'kurz')
    expect(wrapper.find('.password-error').text()).toBe('Das Passwort muss 7 bis 32 Zeichen lang sein.')
    expect(authApi.changePassword).not.toHaveBeenCalled()
  })

  it("shows the server's message for a wrong current password", async () => {
    authApi.changePassword.mockRejectedValue({ response: { status: 400, data: { message: 'Das aktuelle Passwort ist falsch' } } })
    const wrapper = mount(SecurityTab)
    await flushPromises()

    await fill(wrapper, 'falsch', 'neues-passwort', 'neues-passwort')

    expect(wrapper.find('.password-error').text()).toBe('Das aktuelle Passwort ist falsch')
  })
})
