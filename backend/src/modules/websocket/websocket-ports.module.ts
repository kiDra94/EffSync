import { Global, Module } from "@nestjs/common";
import { TaskRealtime } from "../../contexts/task-management/application";
import { WebsocketGateway } from "./websocket.gateway";
import { WebsocketModule } from "./websocket.module";

/**
 * Binds task-management's TaskRealtime port to the WebSocket gateway (M15).
 * Global for the same reason as EmailPortsModule; M20 moves the transport to
 * shared/infrastructure/realtime.
 */
@Global()
@Module({
  imports: [WebsocketModule],
  providers: [{ provide: TaskRealtime, useExisting: WebsocketGateway }],
  exports: [TaskRealtime],
})
export class WebsocketPortsModule {}
