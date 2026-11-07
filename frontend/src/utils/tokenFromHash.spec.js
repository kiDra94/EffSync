import { describe, it, expect, vi } from 'vitest'
import { takeTokenFromHash } from './tokenFromHash'

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
})
