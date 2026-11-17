import { refreshSession } from './httpClient';

/**
 * Socket.io `auth` option that reads the access token at every (re)connect:
 * it is renewed every 15 minutes (T51, M12). `fallback` covers the dev-mode
 * token, which isn't in localStorage.
 */
export function socketAuth(fallback = null) {
    return (send) => send({ token: localStorage.getItem('authToken') || fallback });
}

const RETRY_INTERVAL_MS = 60 * 1000;

/**
 * The gateway checks the token only at the handshake and drops a connection
 * with an expired one ("io server disconnect"); socket.io doesn't reconnect
 * after that by itself. Refresh the session and connect again, at most once a
 * minute so a refused token can't loop.
 */
export function reconnectWithFreshToken(socket) {
    let lastAttempt = -Infinity;
    socket.on('disconnect', async (reason) => {
        if (reason !== 'io server disconnect' || Date.now() - lastAttempt < RETRY_INTERVAL_MS) {
            return;
        }
        lastAttempt = Date.now();
        try {
            await refreshSession();
            socket.connect();
        } catch {
            // the session ended: the next API request logs out
        }
    });
}
