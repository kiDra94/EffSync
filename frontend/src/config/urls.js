/**
 * The backend's addresses (M25, problem 14): the only module that knows them.
 * VITE_API_URL and VITE_WS_URL set them (see .env.example); without them the
 * app talks to its own origin, as behind the production reverse proxy or
 * Vite's dev proxy (vite.config.js forwards /api and /socket.io).
 */

/** The REST API, e.g. `https://effsync.example/api`; by default `/api` here. */
export const API_URL = import.meta.env.VITE_API_URL || '/api'

/**
 * The Socket.io server: by default the API's origin, or this page's origin
 * ('') when the API address is relative.
 */
export const WS_URL = import.meta.env.VITE_WS_URL || API_URL.replace(/\/api\/?$/, '')
