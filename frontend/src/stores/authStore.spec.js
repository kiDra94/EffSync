import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  logout: vi.fn(),
  getUserProfile: vi.fn(),
  register: vi.fn(),
}))
const socket = vi.hoisted(() => ({ connect: vi.fn(), disconnect: vi.fn() }))
const search = vi.hoisted(() => ({ ensureLoaded: vi.fn(), reset: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('@/api/authService', () => ({ authApi }))
vi.mock('@/router', () => ({ default: router }))
vi.mock('./useSocket', () => ({ useSocket: () => socket }))
vi.mock('./searchStore', () => ({ useSearchStore: () => search }))

// T51, T123 (M12): login keeps the refresh token, logout ends only this session
describe('authStore sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  // vitest.setup.js mocks the store for every other spec; this one tests the real one
  const loadStore = async () => (await vi.importActual('./authStore')).useAuthStore()

  it('stores the access and the refresh token on login', async () => {
    authApi.login.mockResolvedValue({
      data: { token: 'access', refreshToken: 'refresh', user_id: 3, role: 'Teacher' },
    })
    const store = await loadStore()

    await store.login({ identifier: 'alehrerin', password: 'pw' })

    expect(localStorage.getItem('authToken')).toBe('access')
    expect(localStorage.getItem('refreshToken')).toBe('refresh')
  })

  it('revokes the current session with its refresh token on logout and forgets both tokens', async () => {
    localStorage.setItem('authToken', 'access')
    localStorage.setItem('refreshToken', 'refresh')
    authApi.logout.mockResolvedValue({})
    const store = await loadStore()

    await store.logout()

    expect(authApi.logout).toHaveBeenCalledWith('refresh')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('skips the logout request without a refresh token', async () => {
    localStorage.setItem('authToken', 'access')
    const store = await loadStore()

    await store.logout()

    expect(authApi.logout).not.toHaveBeenCalled()
    expect(localStorage.getItem('authToken')).toBeNull()
  })

  it('forgets an old refresh token when a login returns none', async () => {
    localStorage.setItem('refreshToken', 'previous.user')
    authApi.login.mockResolvedValue({ data: { token: 'access', user_id: 3, role: 'Teacher' } })
    const store = await loadStore()

    await store.login({ identifier: 'alehrerin', password: 'pw' })

    expect(localStorage.getItem('refreshToken')).toBeNull()
  })
})

// GOALS.md M29 (T115, 08_…:39-43: the auth store ≥ 90 %)
describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    localStorage.clear()
    setActivePinia(createPinia())
  })

  const loadStore = async () => (await vi.importActual('./authStore')).useAuthStore()

  it('signs in: role in lower case, socket connected, search loaded', async () => {
    authApi.login.mockResolvedValue({
      data: { token: 'access', user: { user_id: 3, role: 'Admin' } },
    })
    const store = await loadStore()

    await store.login({ identifier: 'a', password: 'pw' })

    expect(store.isAuthenticated).toBe(true)
    expect(store.userRole).toBe('admin')
    expect(store.isAdmin).toBe(true)
    expect(store.userId).toBe(3)
    expect(socket.connect).toHaveBeenCalledWith('access')
    expect(search.ensureLoaded).toHaveBeenCalled()
  })

  it('keeps a user without a role and survives a failing search load', async () => {
    authApi.login.mockResolvedValue({ data: { token: 'access', id: 5 } })
    search.ensureLoaded.mockRejectedValueOnce(new Error('offline'))
    const store = await loadStore()

    await store.login({ identifier: 'a', password: 'pw' })

    expect(store.userRole).toBeNull()
    expect(store.userId).toBe(5)
    expect(store.isAdmin).toBe(false)
  })

  it('passes a failed login on', async () => {
    authApi.login.mockRejectedValue(new Error('401'))
    const store = await loadStore()

    await expect(store.login({ identifier: 'a', password: 'x' })).rejects.toThrow('401')
    expect(store.isAuthenticated).toBe(false)
  })

  it('clears the session even when the logout request fails', async () => {
    localStorage.setItem('authToken', 'access')
    localStorage.setItem('refreshToken', 'refresh')
    authApi.logout.mockRejectedValue(new Error('offline'))
    const store = await loadStore()

    await store.logout()

    expect(store.isAuthenticated).toBe(false)
    expect(socket.disconnect).toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledWith({ name: 'Login' })
    expect(search.reset).toHaveBeenCalled()
  })

  describe('loadUser (a reload with a token)', () => {
    it('loads the profile and connects the socket', async () => {
      localStorage.setItem('authToken', 'access')
      authApi.getUserProfile.mockResolvedValue({ data: { user: { id: 7, role: 'Student' } } })
      const store = await loadStore()

      await store.loadUser()

      expect(store.userId).toBe(7)
      expect(store.userRole).toBe('student')
      expect(localStorage.getItem('userRole')).toBe('student')
      expect(socket.connect).toHaveBeenCalledWith('access')
    })

    it('keeps a profile without a role', async () => {
      localStorage.setItem('authToken', 'access')
      authApi.getUserProfile.mockResolvedValue({ data: { user_id: 8 } })
      const store = await loadStore()

      await store.loadUser()

      expect(store.userId).toBe(8)
      expect(store.userRole).toBeNull()
    })

    it('does nothing without a token', async () => {
      const store = await loadStore()

      await store.loadUser()

      expect(authApi.getUserProfile).not.toHaveBeenCalled()
    })

    it('signs out and passes the error on when the token is invalid', async () => {
      localStorage.setItem('authToken', 'expired')
      authApi.getUserProfile.mockRejectedValue(new Error('401'))
      const store = await loadStore()

      await expect(store.loadUser()).rejects.toThrow('401')
      expect(store.isAuthenticated).toBe(false)
      expect(router.push).toHaveBeenCalledWith({ name: 'Login' })
    })
  })

  it('registers and passes a failed registration on', async () => {
    authApi.register.mockResolvedValueOnce({ data: { user_id: 9 } })
    const store = await loadStore()

    await expect(store.register({ username: 'neu' })).resolves.toEqual({ user_id: 9 })
    authApi.register.mockRejectedValueOnce(new Error('409'))
    await expect(store.register({ username: 'neu' })).rejects.toThrow('409')
  })

  describe('dev mode (VITE_DEV_MODE)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DEV_MODE', 'true')
      vi.stubEnv('VITE_DEV_TOKEN', 'dev-token')
      vi.stubEnv('VITE_DEV_ROLE', 'admin')
      vi.stubEnv('VITE_DEV_USERNAME', 'devuser')
    })

    it('signs in with the dev token without the backend', async () => {
      const store = await loadStore()

      expect(store.isAuthenticated).toBe(true)
      expect(store.userDetails).toMatchObject({ username: 'devuser', role: 'admin' })
      await expect(store.login({ identifier: 'devuser', password: 'x' })).resolves.toMatchObject({
        token: 'dev-token',
      })
      expect(authApi.login).not.toHaveBeenCalled()
    })

    it('skips the profile request and the logout request', async () => {
      localStorage.setItem('refreshToken', 'refresh')
      const store = await loadStore()

      await store.loadUser()
      await store.logout()

      expect(authApi.getUserProfile).not.toHaveBeenCalled()
      expect(authApi.logout).not.toHaveBeenCalled()
    })

    it('falls back to the default dev user name and role', async () => {
      vi.stubEnv('VITE_DEV_USERNAME', '')
      vi.stubEnv('VITE_DEV_ROLE', '')
      const store = await loadStore()

      expect(store.userDetails).toMatchObject({ username: 'devuser', role: 'admin' })
    })
  })
})
