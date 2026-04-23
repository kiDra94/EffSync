import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

const pushMock = vi.fn()
const authStoreMock = {
  token: null,
  userId: null,
  userRole: null,
  userDetails: null,
}

const routeMock = {
  query: {},
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
  useRoute: () => routeMock,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authStoreMock,
}))

describe('AuthCallbackView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.query = {}
    authStoreMock.token = null
    authStoreMock.userId = null
    authStoreMock.userRole = null
    authStoreMock.userDetails = null
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('speichert OAuth Daten und navigiert zum Dashboard', async () => {
    routeMock.query = {
      token: 'oauth.jwt.token',
      user: encodeURIComponent(
        JSON.stringify({
          userId: 20,
          username: 'oauth.user@gmail.com',
          role: 'student',
          firstname: 'OAuth',
          lastname: 'User',
        }),
      ),
    }

    const { default: AuthCallbackView } = await import('./AuthCallbackView.vue')

    mount(AuthCallbackView)

    await vi.runAllTimersAsync()

    expect(localStorage.getItem('authToken')).toBe('oauth.jwt.token')
    expect(localStorage.getItem('userId')).toBe('20')
    expect(localStorage.getItem('userRole')).toBe('student')

    expect(authStoreMock.token).toBe('oauth.jwt.token')
    expect(authStoreMock.userId).toBe(20)
    expect(authStoreMock.userRole).toBe('student')
    expect(authStoreMock.userDetails.username).toBe('oauth.user@gmail.com')

    expect(pushMock).toHaveBeenCalledWith({ name: 'Dashboard' })
  })

  it('leitet auf Login um wenn kein Token vorhanden ist', async () => {
    routeMock.query = {}

    const { default: AuthCallbackView } = await import('./AuthCallbackView.vue')

    mount(AuthCallbackView)

    await vi.runAllTimersAsync()

    expect(pushMock).toHaveBeenCalledWith({ name: 'Login' })
  })
})
