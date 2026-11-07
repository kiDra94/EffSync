import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const authApi = vi.hoisted(() => ({ login: vi.fn(), logout: vi.fn() }))

vi.mock('@/api/authService', () => ({ authApi }))
vi.mock('@/router', () => ({ default: { push: vi.fn() } }))
vi.mock('./useSocket', () => ({
  useSocket: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
}))
vi.mock('./searchStore', () => ({
  useSearchStore: () => ({ ensureLoaded: vi.fn(), reset: vi.fn() }),
}))

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
