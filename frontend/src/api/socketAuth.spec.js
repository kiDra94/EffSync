import { describe, it, expect, vi, beforeEach } from 'vitest'

const refreshSession = vi.hoisted(() => vi.fn())
vi.mock('./httpClient', () => ({ refreshSession }))

import { socketAuth, reconnectWithFreshToken } from './socketAuth'

// M12: access tokens last 15 minutes, and the gateway checks the token only at
// the handshake, so every (re)connect has to send the current one
describe('socketAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('sends the access token that is current at connect time', () => {
    const send = vi.fn()
    const auth = socketAuth('fallback')

    auth(send)
    localStorage.setItem('authToken', 'renewed')
    auth(send)

    expect(send.mock.calls).toEqual([[{ token: 'fallback' }], [{ token: 'renewed' }]])
  })

  const fakeSocket = () => {
    const handlers = {}
    return {
      on: (event, handler) => { handlers[event] = handler },
      connect: vi.fn(),
      emit: (event, ...args) => handlers[event]?.(...args),
    }
  }

  it('refreshes and reconnects once the server dropped the connection for an expired token', async () => {
    refreshSession.mockResolvedValue('new.access')
    const socket = fakeSocket()
    reconnectWithFreshToken(socket)

    await socket.emit('disconnect', 'io server disconnect')

    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(socket.connect).toHaveBeenCalledTimes(1)
  })

  it('stays disconnected after a client-side disconnect (logout) and tries at most once a minute', async () => {
    refreshSession.mockResolvedValue('new.access')
    const socket = fakeSocket()
    reconnectWithFreshToken(socket)

    await socket.emit('disconnect', 'io client disconnect')
    await socket.emit('disconnect', 'io server disconnect')
    await socket.emit('disconnect', 'io server disconnect')

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('does not reconnect when the refresh fails', async () => {
    refreshSession.mockRejectedValue(new Error('session ended'))
    const socket = fakeSocket()
    reconnectWithFreshToken(socket)

    await socket.emit('disconnect', 'io server disconnect')

    expect(socket.connect).not.toHaveBeenCalled()
  })
})
