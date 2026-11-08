import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  RealtimeChannelRegistry,
  RealtimePublisher,
  type RealtimeChannelSource,
} from "../../../shared/application/realtime";
import { roomChannel } from "../domain/chat-notification";
import { ChatRoomRepository } from "./ports/chat-room.repository";

/**
 * The chat rooms' realtime channels (M20): a connecting socket joins the
 * channels of the user's active rooms, and a removed member's sockets leave
 * the room's channel.
 */
@Injectable()
export class ChatRealtime implements RealtimeChannelSource, OnModuleInit {
  constructor(
    private readonly rooms: ChatRoomRepository,
    private readonly registry: RealtimeChannelRegistry,
    private readonly publisher: RealtimePublisher,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async channelsFor(userId: number) {
    const roomIds = await this.rooms.findActiveRoomIds(userId);
    return roomIds.map(roomChannel);
  }

  /** The removed user stops receiving the room's live messages. */
  unsubscribeUserFromRoom(userId: number, roomId: number) {
    this.publisher.removeUserFromChannel(userId, roomChannel(roomId));
  }
}
