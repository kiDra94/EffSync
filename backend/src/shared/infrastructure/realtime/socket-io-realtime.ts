import { Logger } from "@nestjs/common";
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import {
  REALTIME_GATEWAY_OPTIONS,
  RealtimeAuthenticator,
  RealtimeChannelRegistry,
  RealtimePublisher,
  userChannel,
} from "../../application/realtime";

/**
 * The Socket.io transport (M20, until then modules/websocket): accepts a
 * socket with a valid token, puts it into its user's channel and the
 * channels the contexts name, and publishes events to channels.
 */
@WebSocketGateway(REALTIME_GATEWAY_OPTIONS)
export class SocketIoRealtime
  extends RealtimePublisher
  implements OnGatewayConnection, OnGatewayInit, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(SocketIoRealtime.name);

  constructor(
    private readonly authenticator: RealtimeAuthenticator,
    private readonly channels: RealtimeChannelRegistry,
  ) {
    super();
  }

  afterInit() {
    this.logger.log("WebSocket Gateway initialized!!!");
  }

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as { token?: unknown } | undefined;
      const user = auth?.token
        ? await this.authenticator.authenticate(auth.token)
        : null;
      if (!user) {
        this.logger.warn(`Connection refused: ${client.id} - invalid Token`);
        client.disconnect();
        return;
      }

      (client.data as { user?: unknown }).user = user;
      void client.join(userChannel(user.userId));
      for (const channel of await this.channels.channelsFor(user.userId)) {
        void client.join(channel);
      }
      this.logger.log(`Client connected: ${client.id} - User ${user.userId}`);
    } catch (error) {
      this.logger.error(`Connection failed: ${client.id}`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id}: disconnected!`);
  }

  // publishing never fails the use case that already committed (the
  // gateway caught emit errors before M20 too)
  toUser(userId: number, event: string, data: unknown) {
    this.safely(event, () =>
      this.server.to(userChannel(userId)).emit(event, data),
    );
  }

  toChannel(channel: string, event: string, data: unknown) {
    this.safely(event, () => this.server.to(channel).emit(event, data));
  }

  removeUserFromChannel(userId: number, channel: string) {
    this.safely("leave", () =>
      this.server.in(userChannel(userId)).socketsLeave(channel),
    );
  }

  private safely(event: string, send: () => unknown) {
    try {
      send();
    } catch (error) {
      this.logger.error(`${event} emit failed`, error);
    }
  }
}
