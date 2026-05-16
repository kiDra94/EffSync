import { Test, TestingModule } from "@nestjs/testing";
import { ChatRoomsController } from "./chat-rooms.controller";
import { ChatRoomsService } from "./chat-rooms.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("ChatRoomsController", () => {
  let controller: ChatRoomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatRoomsController],
      providers: [
              ChatRoomsService,
              { provide: PrismaService, useValue: {} },
            ],
    }).compile();

    controller = module.get<ChatRoomsController>(ChatRoomsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
