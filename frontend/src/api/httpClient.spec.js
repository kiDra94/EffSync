import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { apiClient, setAuthStore, refreshSession } from './httpClient'

// T51 (M12): the access token lasts 15 minutes; on a 401 the client refreshes
// once with the refresh token, retries the request, and logs out otherwise
describe('httpClient refresh on 401', () => {
  let mock
  let authStore

  beforeEach(() => {
    mock = new MockAdapter(apiClient)
    authStore = { token: 'old.access', logout: vi.fn().mockResolvedValue(undefined) }
    setAuthStore(authStore)
    localStorage.clear()
    localStorage.setItem('authToken', 'old.access')
    localStorage.setItem('refreshToken', 'old.refresh')
  })

  afterEach(() => {
    mock.restore()
    setAuthStore(null)
  })

  const authorizationOf = (config) => config.headers.Authorization

  it('refreshes, stores the rotated tokens and retries the request with the new token', async () => {
    mock.onGet('/tasks').replyOnce(401)
    mock.onPost('/auth/refresh').replyOnce((config) => {
      expect(JSON.parse(config.data)).toEqual({ refreshToken: 'old.refresh' })
      return [201, { token: 'new.access', refreshToken: 'new.refresh' }]
    })
    mock.onGet('/tasks').replyOnce((config) => {
      expect(authorizationOf(config)).toBe('Bearer new.access')
      return [200, ['task']]
    })

    const response = await apiClient.get('/tasks')

    expect(response.data).toEqual(['task'])
    expect(localStorage.getItem('authToken')).toBe('new.access')
    expect(localStorage.getItem('refreshToken')).toBe('new.refresh')
    expect(authStore.token).toBe('new.access')
    expect(authStore.logout).not.toHaveBeenCalled()
  })

  it('refreshes only once for parallel 401s', async () => {
    mock.onGet('/a').replyOnce(401).onGet('/a').replyOnce(200, 'a')
    mock.onGet('/b').replyOnce(401).onGet('/b').replyOnce(200, 'b')
    mock.onPost('/auth/refresh').reply(201, { token: 'new.access', refreshToken: 'new.refresh' })

    const [a, b] = await Promise.all([apiClient.get('/a'), apiClient.get('/b')])

    expect([a.data, b.data]).toEqual(['a', 'b'])
    expect(mock.history.post.filter((r) => r.url === '/auth/refresh')).toHaveLength(1)
  })

  it('logs out when the refresh fails', async () => {
    mock.onGet('/tasks').replyOnce(401)
    mock.onPost('/auth/refresh').replyOnce(401)

    await expect(apiClient.get('/tasks')).rejects.toMatchObject({ response: { status: 401 } })

    expect(authStore.logout).toHaveBeenCalledTimes(1)
  })

  it('logs out without a refresh request when no refresh token is stored', async () => {
    localStorage.removeItem('refreshToken')
    mock.onGet('/tasks').replyOnce(401)

    await expect(apiClient.get('/tasks')).rejects.toBeDefined()

    expect(mock.history.post).toHaveLength(0)
    expect(authStore.logout).toHaveBeenCalledTimes(1)
  })

  it('tries the refresh only once: a 401 on the retried request logs out', async () => {
    mock.onGet('/tasks').reply(401)
    mock.onPost('/auth/refresh').reply(201, { token: 'new.access', refreshToken: 'new.refresh' })

    await expect(apiClient.get('/tasks')).rejects.toBeDefined()

    expect(mock.history.post).toHaveLength(1)
    expect(authStore.logout).toHaveBeenCalledTimes(1)
  })

  it('leaves a 401 from the login alone: wrong credentials are no expired session', async () => {
    mock.onPost('/auth/login').replyOnce(401)

    await expect(apiClient.post('/auth/login', {})).rejects.toBeDefined()

    expect(mock.history.post).toHaveLength(1)
    expect(authStore.logout).not.toHaveBeenCalled()
  })

  it('keeps the session when the refresh fails without a 401 (network, 429, 500)', async () => {
    mock.onGet('/tasks').replyOnce(401)
    mock.onPost('/auth/refresh').networkErrorOnce()

    await expect(apiClient.get('/tasks')).rejects.toMatchObject({ response: { status: 401 } })

    mock.onGet('/a').replyOnce(401)
    mock.onPost('/auth/refresh').replyOnce(429)
    await expect(apiClient.get('/a')).rejects.toBeDefined()

    expect(authStore.logout).not.toHaveBeenCalled()
    expect(localStorage.getItem('refreshToken')).toBe('old.refresh')
  })

  it('uses the tokens of another tab that rotated the shared refresh token first', async () => {
    mock.onGet('/tasks').replyOnce(401)
    mock.onPost('/auth/refresh').replyOnce(() => {
      // the other tab won the rotation and wrote its tokens to localStorage
      localStorage.setItem('authToken', 'tab.a.access')
      localStorage.setItem('refreshToken', 'tab.a.refresh')
      return [401]
    })
    mock.onGet('/tasks').replyOnce((config) => {
      expect(authorizationOf(config)).toBe('Bearer tab.a.access')
      return [200, 'ok']
    })

    await expect(apiClient.get('/tasks')).resolves.toMatchObject({ data: 'ok' })
    expect(authStore.logout).not.toHaveBeenCalled()
  })

  it('retries without a new refresh when the token was renewed after the request went out', async () => {
    mock.onGet('/tasks').replyOnce(() => {
      localStorage.setItem('authToken', 'renewed.access')
      return [401]
    })
    mock.onGet('/tasks').replyOnce((config) => {
      expect(authorizationOf(config)).toBe('Bearer renewed.access')
      return [200, 'ok']
    })

    await expect(apiClient.get('/tasks')).resolves.toMatchObject({ data: 'ok' })
    expect(mock.history.post).toHaveLength(0)
  })

  it('never refreshes for set-new-password: its token is the reset token, not a session', async () => {
    mock.onPost('/auth/set-new-password').replyOnce(401)

    await expect(apiClient.post('/auth/set-new-password', {})).rejects.toBeDefined()

    expect(mock.history.post).toHaveLength(1)
  })

  it('exposes the refresh for the WebSocket reconnect', async () => {
    mock.onPost('/auth/refresh').replyOnce(201, { token: 'new.access', refreshToken: 'new.refresh' })

    await expect(refreshSession()).resolves.toBe('new.access')
  })
})
