import { Global, Module } from "@nestjs/common";
import {
  RealtimeChannelRegistry,
  RealtimePublisher,
} from "../../application/realtime";
import { SocketIoRealtime } from "./socket-io-realtime";

/**
 * The realtime transport (M20). Global, so every context publishes through
 * RealtimePublisher and registers its channels; RealtimeAuthenticator comes
 * from identity-access (global).
 */
@Global()
@Module({
  providers: [
    SocketIoRealtime,
    RealtimeChannelRegistry,
    { provide: RealtimePublisher, useExisting: SocketIoRealtime },
  ],
  exports: [RealtimePublisher, RealtimeChannelRegistry],
})
export class RealtimeModule {}
