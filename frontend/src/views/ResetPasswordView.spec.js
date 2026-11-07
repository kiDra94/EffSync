import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const replaceMock = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  useRoute: () => ({ path: '/reset-password', query: {}, hash: '#token=reset.jwt' }),
}))

vi.mock('@/api/authService', () => ({ authApi: { setNewPassword: vi.fn() } }))

// M12: the Google reset callback sends only an access token and starts no
// session, so a previous session's refresh token must not stay next to it
describe('ResetPasswordView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('stores the reset token and drops an old refresh token', async () => {
    localStorage.setItem('refreshToken', 'previous.user')

    const { default: ResetPasswordView } = await import('./ResetPasswordView.vue')
    mount(ResetPasswordView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(localStorage.getItem('authToken')).toBe('reset.jwt')
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})
