import { Test, TestingModule } from "@nestjs/testing";
import { ChatRoomsService } from "./chat-rooms.service";
import { PrismaService } from "../../shared/infrastructure/prisma/prisma.service";

describe("ChatRoomsService", () => {
  let service: ChatRoomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatRoomsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<ChatRoomsService>(ChatRoomsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
