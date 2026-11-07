import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const pushMock = vi.fn()
const replaceMock = vi.fn()
const authStoreMock = {
  token: null,
  userId: null,
  userRole: null,
  userDetails: null,
}

const routeMock = {
  path: '/auth-callback',
  hash: '',
  query: {},
}

const getAuthProfile = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useRoute: () => routeMock,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authStoreMock,
}))

vi.mock('@/api/authService', () => ({
  authApi: { getAuthProfile: (...args) => getAuthProfile(...args) },
}))

// decision Q9 (M9): the Google callback passes the token in the URL fragment;
// the view loads the user from GET /auth/profile instead of a ?user= parameter
describe('AuthCallbackView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routeMock.hash = ''
    routeMock.query = {}
    authStoreMock.token = null
    authStoreMock.userId = null
    authStoreMock.userRole = null
    authStoreMock.userDetails = null
    localStorage.clear()
    window.history.replaceState(null, '', '/auth-callback')
  })

  afterEach(() => {
    window.history.replaceState(null, '', '/')
  })

  it('reads the tokens from the fragment, loads the profile and navigates to the dashboard', async () => {
    window.history.replaceState(null, '', '/auth-callback#token=oauth.jwt.token&refreshToken=oauth-refresh')
    routeMock.hash = '#token=oauth.jwt.token&refreshToken=oauth-refresh'
    getAuthProfile.mockImplementation(async () => {
      // the request already carries the token (httpClient reads it from localStorage)
      expect(localStorage.getItem('authToken')).toBe('oauth.jwt.token')
      return {
        data: { userId: 20, username: 'oauth.user', role: 'student', firstname: 'OAuth' },
      }
    })

    const { default: AuthCallbackView } = await import('./AuthCallbackView.vue')
    mount(AuthCallbackView)
    await flushPromises()

    expect(getAuthProfile).toHaveBeenCalledTimes(1)
    expect(authStoreMock.token).toBe('oauth.jwt.token')
    expect(authStoreMock.userId).toBe(20)
    expect(authStoreMock.userRole).toBe('student')
    expect(authStoreMock.userDetails.username).toBe('oauth.user')
    expect(localStorage.getItem('userId')).toBe('20')
    expect(localStorage.getItem('userRole')).toBe('student')
    // M12: the refresh token is kept for httpClient's refresh on 401
    expect(localStorage.getItem('refreshToken')).toBe('oauth-refresh')
    expect(pushMock).toHaveBeenCalledWith({ name: 'Dashboard' })
  })

  it('removes the token from the address bar through the router', async () => {
    routeMock.hash = '#token=oauth.jwt.token'
    getAuthProfile.mockResolvedValue({ data: { userId: 20, role: 'student' } })

    const { default: AuthCallbackView } = await import('./AuthCallbackView.vue')
    mount(AuthCallbackView)
    await flushPromises()

    // through vue-router, so it doesn't write the token back into the history on push
    expect(replaceMock).toHaveBeenCalledWith({ path: '/auth-callback', query: {}, hash: '' })
  })

  it('ignores a token in the query string and redirects to the login', async () => {
    routeMock.query = { token: 'old.style.token' }

    const { default: AuthCallbackView } = await import('./AuthCallbackView.vue')
    mount(AuthCallbackView)
    await flushPromises()

    expect(getAuthProfile).not.toHaveBeenCalled()
    expect(pushMock).toHaveBeenCalledWith({ name: 'Login' })
  })

  it('redirects to the login when loading the profile fails', async () => {
    routeMock.hash = '#token=expired.jwt.token&refreshToken=r'
    getAuthProfile.mockRejectedValue(new Error('401'))

    const { default: AuthCallbackView } = await import('./AuthCallbackView.vue')
    mount(AuthCallbackView)
    await flushPromises()

    expect(pushMock).toHaveBeenCalledWith({ name: 'Login' })
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('forgets an old refresh token when the fragment carries none', async () => {
    localStorage.setItem('refreshToken', 'previous.user')
    routeMock.hash = '#token=oauth.jwt.token'
    getAuthProfile.mockResolvedValue({ data: { userId: 20, role: 'student' } })

    const { default: AuthCallbackView } = await import('./AuthCallbackView.vue')
    mount(AuthCallbackView)
    await flushPromises()

    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})
