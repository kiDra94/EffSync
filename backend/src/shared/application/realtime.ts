/**
 * Realtime messages to the browser (GOALS.md M20). Contexts publish through
 * RealtimePublisher; the Socket.io transport in shared/infrastructure/realtime
 * implements it. A user's sockets are in the channel `user_<id>`; a context
 * names its own channels (communication: `chat_<roomId>`).
 */
export abstract class RealtimePublisher {
  /** Sends an event to every socket of the user. */
  abstract toUser(userId: number, event: string, data: unknown): void;
  /** Sends an event to every socket in the channel. */
  abstract toChannel(channel: string, event: string, data: unknown): void;
  /** Removes every socket of the user from the channel. */
  abstract removeUserFromChannel(userId: number, channel: string): void;
}

/** The channel of all sockets of a user. */
export function userChannel(userId: number): string {
  return `user_${userId}`;
}

/** Who a socket belongs to, once its handshake token is accepted. */
export interface RealtimeUser {
  userId: number;
  username: string;
}

/**
 * Checks a socket's handshake token (port; identity-access implements it):
 * the user, or null if the socket must be refused (also for an invalid or
 * expired token).
 */
export abstract class RealtimeAuthenticator {
  abstract authenticate(token: unknown): Promise<RealtimeUser | null>;
}

/** A context's channels a user's socket joins on connecting. */
export interface RealtimeChannelSource {
  channelsFor(userId: number): Promise<string[]>;
}

/** The channel sources of all contexts; each registers itself on start. */
export class RealtimeChannelRegistry {
  private readonly sources: RealtimeChannelSource[] = [];

  register(source: RealtimeChannelSource) {
    this.sources.push(source);
  }

  async channelsFor(userId: number): Promise<string[]> {
    const channels: string[] = [];
    for (const source of this.sources) {
      channels.push(...(await source.channelsFor(userId)));
    }
    return channels;
  }
}

/**
 * The Socket.io gateway options, shared by every gateway on the one server:
 * the origin is checked per request (the decorator runs before .env is
 * loaded) and only the frontend's origin is allowed (T13).
 */
export const REALTIME_GATEWAY_OPTIONS = {
  cors: {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) =>
      callback(
        null,
        origin === (process.env.FRONTEND_URL || "http://localhost:5173"),
      ),
    credentials: true,
  },
};
