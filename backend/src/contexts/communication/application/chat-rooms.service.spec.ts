import { PrismaService } from "../../../shared/infrastructure/prisma/prisma.service";
import { PrismaUnitOfWork } from "../../../shared/infrastructure/prisma/prisma-unit-of-work";
import { PrismaChatRoomRepository } from "../infrastructure/persistence/prisma-chat-room.repository";
import { ChatRoomsService } from "./chat-rooms.service";

describe("ChatRoomsService", () => {
  let service: ChatRoomsService;

  beforeEach(() => {
    const unitOfWork = new PrismaUnitOfWork({} as PrismaService);
    service = new ChatRoomsService(
      new PrismaChatRoomRepository(unitOfWork),
      unitOfWork,
      // not used by these tests (M21: DMs and linked chats)
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
