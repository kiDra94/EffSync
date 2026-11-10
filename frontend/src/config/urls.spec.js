import { describe, it, expect, vi, afterEach } from 'vitest'

// M25 (problem 14): the backend's addresses are known in one module only
describe('config/urls', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  const load = () => import('./urls')

  it('takes the addresses from VITE_API_URL and VITE_WS_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://effsync.example/api')
    vi.stubEnv('VITE_WS_URL', 'wss://ws.effsync.example')

    await expect(load()).resolves.toMatchObject({
      API_URL: 'https://effsync.example/api',
      WS_URL: 'wss://ws.effsync.example',
    })
  })

  it('derives the WebSocket address from the API address', async () => {
    vi.stubEnv('VITE_API_URL', 'https://effsync.example/api')
    vi.stubEnv('VITE_WS_URL', '')

    expect((await load()).WS_URL).toBe('https://effsync.example')
  })

  // review M25: a build without configuration talks to its own origin, as
  // the HTTP client did before (behind a reverse proxy, or Vite's dev proxy)
  it('talks to its own origin without configuration', async () => {
    vi.stubEnv('VITE_API_URL', '')
    vi.stubEnv('VITE_WS_URL', '')

    await expect(load()).resolves.toMatchObject({ API_URL: '/api', WS_URL: '' })
  })

  it("uses the page's origin for the sockets with a relative API address", async () => {
    vi.stubEnv('VITE_API_URL', '/api')
    vi.stubEnv('VITE_WS_URL', '')

    expect((await load()).WS_URL).toBe('')
  })
})
