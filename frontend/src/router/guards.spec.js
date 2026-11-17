import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authGuard } from './guards'

// GOALS.md M29 (T70, 08_…:39-43: the route guards ≥ 75 %)
describe('authGuard', () => {
  const route = (overrides = {}) => ({
    name: 'TaskList',
    matched: [{ meta: { requiresAuth: true } }],
    meta: {},
    ...overrides,
  })
  const store = (overrides = {}) => ({
    isAuthenticated: true,
    userDetails: { user_id: 1 },
    userRole: 'student',
    loadUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })

  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))

  it('sends a visitor without a token to the login', async () => {
    await expect(authGuard(route(), store({ isAuthenticated: false }))).resolves.toEqual({ name: 'Login' })
  })

  it('lets a visitor without a token open a public page', async () => {
    await expect(
      authGuard(route({ name: 'Login', matched: [{ meta: {} }] }), store({ isAuthenticated: false })),
    ).resolves.toBe(true)
  })

  it.each(['Login', 'Register'])('sends a signed-in user from %s to the dashboard', async (name) => {
    await expect(authGuard(route({ name, matched: [] }), store())).resolves.toEqual({ name: 'Dashboard' })
  })

  it('loads the user after a reload before checking the role', async () => {
    const auth = store({ userDetails: null })
    auth.loadUser.mockImplementation(async () => {
      auth.userRole = 'admin'
    })

    await expect(
      authGuard(route({ meta: { roles: ['admin'] } }), auth),
    ).resolves.toBe(true)
    expect(auth.loadUser).toHaveBeenCalled()
  })

  it('sends a user whose token is invalid to the login', async () => {
    const auth = store({ userDetails: null, loadUser: vi.fn().mockRejectedValue(new Error('401')) })

    await expect(authGuard(route(), auth)).resolves.toEqual({ name: 'Login' })
  })

  it('sends a user without the role of the route to the dashboard', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(
      authGuard(route({ meta: { roles: ['admin', 'superuser'] } }), store()),
    ).resolves.toEqual({ name: 'Dashboard' })
  })

  it('lets a user with the role in (M36: teachers open the classes)', async () => {
    await expect(
      authGuard(route({ meta: { roles: ['admin', 'teacher'] } }), store({ userRole: 'teacher' })),
    ).resolves.toBe(true)
  })
})
