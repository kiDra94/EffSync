import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const authApi = vi.hoisted(() => ({
  login: vi.fn(),
  verifyTwoFactor: vi.fn(),
  getAuthProfile: vi.fn(),
  changePassword: vi.fn(),
  forgotPassword: vi.fn(),
  setNewPassword: vi.fn(),
  getTwoFactorStatus: vi.fn(),
  setupTwoFactor: vi.fn(),
  enableTwoFactor: vi.fn(),
  disableTwoFactor: vi.fn(),
  logout: vi.fn(),
  getUserProfile: vi.fn(),
  register: vi.fn(),
  uploadAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
}))
const socket = vi.hoisted(() => ({ connect: vi.fn(), disconnect: vi.fn() }))
const search = vi.hoisted(() => ({ ensureLoaded: vi.fn(), reset: vi.fn() }))
const router = vi.hoisted(() => ({ push: vi.fn() }))

vi.mock('@/api/authService', () => ({ authApi }))
vi.mock('@/router', () => ({ default: router }))
vi.mock('./useSocket', () => ({ useSocket: () => socket }))
vi.mock('./searchStore', () => ({ useSearchStore: () => search }))
const avatars = vi.hoisted(() => ({ reset: vi.fn() }))
vi.mock('./entities/avatarStore', () => ({ useAvatarStore: () => avatars }))
// M25: the real settings store, on a mocked api/settings
const settingsApi = vi.hoisted(() => ({ getSettings: vi.fn(), updateSettings: vi.fn() }))
vi.mock('@/api/settings', () => ({ settingsApi }))

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

  // T68, decision Q8f (M25): the theme follows the user, not the browser
  it('restores the theme from /users/me/settings after login', async () => {
    document.body.classList.remove('dark-mode')
    settingsApi.getSettings.mockResolvedValue({ data: { theme: 'dark' } })
    authApi.login.mockResolvedValue({ data: { token: 'access', refreshToken: 'r', user_id: 3, role: 'Teacher' } })
    const store = await loadStore()

    await store.login({ identifier: 'alehrerin', password: 'pw' })

    expect(settingsApi.getSettings).toHaveBeenCalledTimes(1)
    expect(document.body.classList.contains('dark-mode')).toBe(true)
    expect(localStorage.getItem('theme')).toBeNull()
  })

  // M25 (decision Q19): the views reach the auth API only through the store
  it('completes the Google sign-in: stores both tokens and loads the user', async () => {
    authApi.getAuthProfile.mockResolvedValue({ data: { userId: 20, role: 'Student', username: 'g' } })
    const store = await loadStore()

    await store.completeGoogleSignIn({ token: 'google.access', refreshToken: 'google.refresh' })

    expect(localStorage.getItem('authToken')).toBe('google.access')
    expect(localStorage.getItem('refreshToken')).toBe('google.refresh')
    expect(localStorage.getItem('userId')).toBe('20')
    expect(store.userRole).toBe('Student')
  })

  it('drops an old refresh token and defaults the role after a Google sign-in without them', async () => {
    localStorage.setItem('refreshToken', 'previous.user')
    authApi.getAuthProfile.mockResolvedValue({ data: { id: 21 } })
    const store = await loadStore()

    await store.completeGoogleSignIn({ token: 'google.access' })

    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(localStorage.getItem('userId')).toBe('21')
    expect(store.userRole).toBe('student')
  })

  it('forgets both tokens when the profile after the Google sign-in fails', async () => {
    authApi.getAuthProfile.mockRejectedValue(new Error('401'))
    const store = await loadStore()

    await expect(store.completeGoogleSignIn({ token: 'google.access' })).rejects.toThrow('401')
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('passes the password reset and the 2FA settings to the API', async () => {
    authApi.getTwoFactorStatus.mockResolvedValue({ data: { enabled: true } })
    authApi.setupTwoFactor.mockResolvedValue({ data: { secret: 'S' } })
    const store = await loadStore()

    await store.requestPasswordReset('felix@htl.at')
    await store.setNewPassword('neues-passwort')
    await expect(store.getTwoFactorStatus()).resolves.toEqual({ enabled: true })
    await expect(store.setupTwoFactor()).resolves.toEqual({ secret: 'S' })
    await store.enableTwoFactor('123456')
    await store.disableTwoFactor('654321')

    expect(authApi.forgotPassword).toHaveBeenCalledWith('felix@htl.at')
    expect(authApi.setNewPassword).toHaveBeenCalledWith('neues-passwort')
    expect(authApi.enableTwoFactor).toHaveBeenCalledWith('123456')
    expect(authApi.disableTwoFactor).toHaveBeenCalledWith('654321')
  })

  // review M25: the next user in this browser doesn't get the theme
  it('drops the theme at logout', async () => {
    settingsApi.getSettings.mockResolvedValue({ data: { theme: 'dark' } })
    authApi.login.mockResolvedValue({ data: { token: 'access', user_id: 3, role: 'Teacher' } })
    const store = await loadStore()
    await store.login({ identifier: 'alehrerin', password: 'pw' })
    expect(document.body.classList.contains('dark-mode')).toBe(true)

    await store.logout()

    expect(document.body.classList.contains('dark-mode')).toBe(false)
  })

  // T47 (M27): the change ends the other sessions, this one gets new tokens
  it('changes the password and keeps this session with the new tokens', async () => {
    authApi.changePassword.mockResolvedValue({ data: { token: 'new.access', refreshToken: 'new.refresh' } })
    const store = await loadStore()

    await store.changePassword('altes-passwort', 'neues-passwort')

    expect(authApi.changePassword).toHaveBeenCalledWith({
      current_password: 'altes-passwort',
      new_password: 'neues-passwort',
    })
    expect(localStorage.getItem('authToken')).toBe('new.access')
    expect(localStorage.getItem('refreshToken')).toBe('new.refresh')
    expect(store.token).toBe('new.access')
  })

  // T47, decision Q8c (M27): the profile picture for the header and the profile
  it('loads the profile picture once per session', async () => {
    localStorage.setItem('authToken', 'access')
    authApi.getUserProfile.mockResolvedValue({ data: { profile_picture: '/users/3/avatar?v=1' } })
    const store = await loadStore()

    await store.loadProfilePicture()
    await store.loadProfilePicture()

    expect(store.profilePicture).toBe('/users/3/avatar?v=1')
    expect(authApi.getUserProfile).toHaveBeenCalledTimes(1)
  })

  it('uploads and removes the profile picture', async () => {
    localStorage.setItem('authToken', 'access')
    authApi.uploadAvatar.mockResolvedValue({ data: { profile_picture: '/users/3/avatar?v=2' } })
    authApi.deleteAvatar.mockResolvedValue({})
    const store = await loadStore()
    const file = new File(['png'], 'ich.png', { type: 'image/png' })

    await store.uploadAvatar(file)
    expect(authApi.uploadAvatar).toHaveBeenCalledWith(file)
    expect(store.profilePicture).toBe('/users/3/avatar?v=2')

    await store.deleteAvatar()
    expect(store.profilePicture).toBeNull()
  })

  it('forgets the profile picture on logout', async () => {
    localStorage.setItem('authToken', 'access')
    authApi.getUserProfile.mockResolvedValue({ data: { profile_picture: '/users/3/avatar?v=1' } })
    authApi.logout.mockResolvedValue({})
    const store = await loadStore()
    await store.loadProfilePicture()

    await store.logout()

    expect(store.profilePicture).toBeNull()
    expect(avatars.reset).toHaveBeenCalled()
  })

  // review M27: the reload's profile request brings the picture along
  it('takes the profile picture from the profile a reload loads', async () => {
    localStorage.setItem('authToken', 'access')
    authApi.getUserProfile.mockResolvedValue({
      data: { user_id: 3, role: 'student', profile_picture: '/users/3/avatar?v=1' },
    })
    const store = await loadStore()

    await store.loadUser()
    await store.loadProfilePicture()

    expect(store.profilePicture).toBe('/users/3/avatar?v=1')
    expect(authApi.getUserProfile).toHaveBeenCalledTimes(1)
  })

  // UC-01b (M32): with 2FA on, the password alone starts no session
  it('returns the 2FA challenge without storing a session', async () => {
    authApi.login.mockResolvedValue({ data: { two_factor_required: true, challenge_token: 'challenge' } })
    const store = await loadStore()

    await expect(store.login({ identifier: 'tzwei', password: 'pw' })).resolves.toEqual({
      twoFactorRequired: true,
      challengeToken: 'challenge',
    })
    expect(localStorage.getItem('authToken')).toBeNull()
    expect(socket.connect).not.toHaveBeenCalled()
  })

  it('completes the 2FA login with the code and stores the session', async () => {
    authApi.verifyTwoFactor.mockResolvedValue({
      data: { token: 'access', refreshToken: 'refresh', user_id: 9, role: 'Student' },
    })
    const store = await loadStore()

    await store.completeTwoFactorLogin('challenge', '123456')

    expect(authApi.verifyTwoFactor).toHaveBeenCalledWith({ challenge_token: 'challenge', code: '123456' })
    expect(localStorage.getItem('authToken')).toBe('access')
    expect(localStorage.getItem('refreshToken')).toBe('refresh')
    expect(store.userRole).toBe('student')
    expect(socket.connect).toHaveBeenCalledWith('access')
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
