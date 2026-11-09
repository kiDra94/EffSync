import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const authApi = vi.hoisted(() => ({
  getTwoFactorStatus: vi.fn(),
  setupTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
}))
vi.mock('@/api/authService', () => ({ authApi }))

import SecurityTab from './SecurityTab.vue'

// T31, FA-06 (M32): 2FA is set up in the profile with a QR code and a code
describe('SecurityTab two-factor authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authApi.getTwoFactorStatus.mockResolvedValue({ data: { enabled: false } })
    authApi.setupTwoFactor.mockResolvedValue({
      data: { secret: 'JBSWY3DPEHPK3PXP', otpauth_url: 'otpauth://totp/x', qr_code: 'data:image/png;base64,QR' },
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
    authApi.getTwoFactorStatus.mockResolvedValue({ data: { enabled: true } })
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
