import { describe, it, expect, vi } from 'vitest'
import { takeTokenFromHash, takeTokensFromHash } from './tokenFromHash'

// decision Q9 (M9): the token arrives in the URL fragment; it is removed through
// the router, so vue-router doesn't write it back into the history on the next push
describe('takeTokenFromHash', () => {
  it('returns the token and replaces the route without the fragment', async () => {
    const router = { replace: vi.fn().mockResolvedValue(undefined) }
    const route = { path: '/auth-callback', query: {}, hash: '#token=a.b.c' }

    await expect(takeTokenFromHash(route, router)).resolves.toBe('a.b.c')
    expect(router.replace).toHaveBeenCalledWith({ path: '/auth-callback', query: {}, hash: '' })
  })

  it('returns null and leaves the route alone without a fragment', async () => {
    const router = { replace: vi.fn() }

    await expect(takeTokenFromHash({ path: '/x', query: {}, hash: '' }, router)).resolves.toBeNull()
    expect(router.replace).not.toHaveBeenCalled()
  })

  it('ignores a token in the query string', async () => {
    const router = { replace: vi.fn() }

    await expect(
      takeTokenFromHash({ path: '/x', query: { token: 'q' }, hash: '' }, router),
    ).resolves.toBeNull()
  })

  // M12: the Google sign-in also passes the refresh token in the fragment
  it('returns the access and the refresh token', async () => {
    const router = { replace: vi.fn().mockResolvedValue(undefined) }
    const route = { path: '/auth-callback', query: {}, hash: '#token=a.b.c&refreshToken=r-1' }

    await expect(takeTokensFromHash(route, router)).resolves.toEqual({
      token: 'a.b.c',
      refreshToken: 'r-1',
      challenge: null,
    })
    expect(router.replace).toHaveBeenCalledTimes(1)
  })

  // M32: a 2FA user's Google sign-in carries a challenge instead
  it('returns the 2FA challenge and no tokens', async () => {
    const router = { replace: vi.fn().mockResolvedValue(undefined) }
    const route = { path: '/auth-callback', query: {}, hash: '#challenge=c.h.j' }

    await expect(takeTokensFromHash(route, router)).resolves.toEqual({
      token: null,
      refreshToken: null,
      challenge: 'c.h.j',
    })
  })
})
